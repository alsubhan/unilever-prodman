const express = require('express');
const { getDb } = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET all production plans with joined info
router.get('/', authMiddleware, async (req, res) => {
  const db = await getDb();
  const plans = await db.all(`
    SELECT pp.*,
      pm.name as machine_name, pm.machine_code,
      rm.name as raw_material_name, rm.part_number,
      u1.full_name as created_by_name,
      u2.full_name as approved_by_name
    FROM production_plans pp
    LEFT JOIN packing_machines pm ON pp.machine_id = pm.id
    LEFT JOIN raw_materials rm ON pp.raw_material_id = rm.id
    LEFT JOIN users u1 ON pp.created_by = u1.id
    LEFT JOIN users u2 ON pp.approved_by = u2.id
    ORDER BY pp.created_at DESC
  `);
  res.json(plans);
});

// POST create production plan
router.post('/', authMiddleware, requireRole('admin', 'production_manager', 'operator'), async (req, res) => {
  const db = await getDb();
  const { machine_id, raw_material_id, start_datetime, end_datetime, notes } = req.body;
  if (!machine_id || !raw_material_id || !start_datetime || !end_datetime) {
    return res.status(400).json({ error: 'machine_id, raw_material_id, start_datetime, end_datetime are required' });
  }
  if (new Date(end_datetime) <= new Date(start_datetime)) {
    return res.status(400).json({ error: 'End datetime must be after start datetime' });
  }

  // Conflict check: overlapping approved/in_progress plans on same machine
  const conflict = await db.get(`
    SELECT id FROM production_plans
    WHERE machine_id = ? AND status IN ('approved','in_progress')
      AND NOT (end_datetime <= ? OR start_datetime >= ?)
  `, machine_id, start_datetime, end_datetime);
  if (conflict) {
    return res.status(409).json({ error: 'Machine already has an approved/active production plan during this period' });
  }

  const result = await db.run('INSERT INTO production_plans (machine_id, raw_material_id, start_datetime, end_datetime, notes, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
    machine_id, raw_material_id, start_datetime, end_datetime, notes || '', 'draft', req.user.id);
  res.status(201).json({ id: result.lastID });
});

// GET single plan
router.get('/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const plan = await db.get(`
    SELECT pp.*,
      pm.name as machine_name, pm.machine_code,
      rm.name as raw_material_name, rm.part_number,
      u1.full_name as created_by_name,
      u2.full_name as approved_by_name
    FROM production_plans pp
    LEFT JOIN packing_machines pm ON pp.machine_id = pm.id
    LEFT JOIN raw_materials rm ON pp.raw_material_id = rm.id
    LEFT JOIN users u1 ON pp.created_by = u1.id
    LEFT JOIN users u2 ON pp.approved_by = u2.id
    WHERE pp.id = ?
  `, req.params.id);
  if (!plan) return res.status(404).json({ error: 'Not found' });
  res.json(plan);
});

// PUT update plan — only drafts can be edited freely; approved ones need re-approval
router.put('/:id', authMiddleware, requireRole('admin', 'production_manager'), async (req, res) => {
  const db = await getDb();
  const { machine_id, raw_material_id, start_datetime, end_datetime, notes } = req.body;
  const plan = await db.get('SELECT * FROM production_plans WHERE id = ?', req.params.id);
  if (!plan) return res.status(404).json({ error: 'Not found' });
  if (!['draft', 'pending_approval'].includes(plan.status)) {
    return res.status(400).json({ error: 'Only draft or pending_approval plans can be edited. Approved plans require re-approval workflow.' });
  }
  await db.run(`UPDATE production_plans SET machine_id=?, raw_material_id=?, start_datetime=?, end_datetime=?, notes=?, status='draft', approved_by=NULL, approved_at=NULL, updated_at=datetime('now') WHERE id=?`,
    machine_id ?? plan.machine_id, raw_material_id ?? plan.raw_material_id, start_datetime ?? plan.start_datetime, end_datetime ?? plan.end_datetime, notes ?? plan.notes, req.params.id);
  res.json({ success: true });
});

// POST submit for approval
router.post('/:id/submit', authMiddleware, async (req, res) => {
  const db = await getDb();
  const plan = await db.get('SELECT * FROM production_plans WHERE id = ?', req.params.id);
  if (!plan) return res.status(404).json({ error: 'Not found' });
  if (plan.status !== 'draft') return res.status(400).json({ error: 'Only draft plans can be submitted for approval' });
  await db.run(`UPDATE production_plans SET status='pending_approval', updated_at=datetime('now') WHERE id=?`, req.params.id);
  res.json({ success: true });
});

// POST approve plan — production manager or admin only
router.post('/:id/approve', authMiddleware, requireRole('admin', 'production_manager'), async (req, res) => {
  const db = await getDb();
  const plan = await db.get('SELECT * FROM production_plans WHERE id = ?', req.params.id);
  if (!plan) return res.status(404).json({ error: 'Not found' });
  if (plan.status !== 'pending_approval') return res.status(400).json({ error: 'Plan must be in pending_approval state' });
  await db.run(`UPDATE production_plans SET status='approved', approved_by=?, approved_at=datetime('now'), updated_at=datetime('now') WHERE id=?`,
    req.user.id, req.params.id);
  res.json({ success: true });
});

// POST reject plan
router.post('/:id/reject', authMiddleware, requireRole('admin', 'production_manager'), async (req, res) => {
  const db = await getDb();
  const plan = await db.get('SELECT * FROM production_plans WHERE id = ?', req.params.id);
  if (!plan) return res.status(404).json({ error: 'Not found' });
  if (plan.status !== 'pending_approval') return res.status(400).json({ error: 'Plan must be in pending_approval state' });
  await db.run(`UPDATE production_plans SET status='draft', updated_at=datetime('now') WHERE id=?`, req.params.id);
  res.json({ success: true });
});

// POST cancel plan
router.post('/:id/cancel', authMiddleware, requireRole('admin', 'production_manager'), async (req, res) => {
  const db = await getDb();
  const plan = await db.get('SELECT * FROM production_plans WHERE id = ?', req.params.id);
  if (!plan) return res.status(404).json({ error: 'Not found' });
  await db.run(`UPDATE production_plans SET status='cancelled', updated_at=datetime('now') WHERE id=?`, req.params.id);
  res.json({ success: true });
});

module.exports = router;
