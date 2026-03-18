const express = require('express');
const { getDb } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST validate a scan
// Body: { machine_barcode, material_barcode }
router.post('/validate', authMiddleware, async (req, res) => {
  const db = await getDb();
  const { machine_barcode, material_barcode } = req.body;
  if (!machine_barcode || !material_barcode) {
    return res.status(400).json({ error: 'machine_barcode and material_barcode are required' });
  }

  // Find machine by code
  const machine = await db.get('SELECT * FROM packing_machines WHERE machine_code = ? AND is_active = 1', machine_barcode);
  if (!machine) {
    return res.status(404).json({ is_valid: false, error: 'Unknown packing machine barcode', alarm: true });
  }

  const now = new Date().toISOString();

  // Find active approved production plan for this machine
  const plan = await db.get(`
    SELECT pp.*, rm.part_number, rm.name as rm_name
    FROM production_plans pp
    LEFT JOIN raw_materials rm ON pp.raw_material_id = rm.id
    WHERE pp.machine_id = ?
      AND pp.status IN ('approved', 'in_progress')
      AND pp.start_datetime <= ?
      AND pp.end_datetime >= ?
    LIMIT 1
  `, machine.id, now, now);

  if (!plan) {
    return res.json({
      is_valid: false,
      alarm: true,
      error: 'No active production plan found for this machine at current time',
      machine: { id: machine.id, name: machine.name, machine_code: machine.machine_code }
    });
  }

  // Update plan status to in_progress on first scan
  if (plan.status === 'approved') {
    await db.run(`UPDATE production_plans SET status='in_progress', updated_at=datetime('now') WHERE id=?`, plan.id);
  }

  // Validate: material barcode must match the planned raw material's part_number
  const isValid = material_barcode.trim() === plan.part_number.trim();

  // Find raw material by barcode if valid
  const scannedMaterial = await db.get('SELECT * FROM raw_materials WHERE part_number = ?', material_barcode.trim());

  // Log the scan
  await db.run(`INSERT INTO scan_validations (production_plan_id, machine_id, scanned_machine_code, scanned_raw_material_barcode, expected_raw_material_id, is_valid, scanned_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    plan.id, machine.id, machine_barcode, material_barcode, plan.raw_material_id, isValid ? 1 : 0, req.user.id);

  res.json({
    is_valid: isValid,
    alarm: !isValid,
    machine: { id: machine.id, name: machine.name, machine_code: machine.machine_code },
    plan: {
      id: plan.id,
      expected_material: plan.rm_name,
      expected_part_number: plan.part_number,
      start_datetime: plan.start_datetime,
      end_datetime: plan.end_datetime
    },
    scanned_material: scannedMaterial ? { name: scannedMaterial.name, part_number: scannedMaterial.part_number } : null,
    error: !isValid ? `Wrong raw material! Expected: ${plan.part_number} (${plan.rm_name}), Got: ${material_barcode}` : null
  });
});

// GET machine info + active plan (for scanner initialization)
router.get('/machine/:machine_barcode', authMiddleware, async (req, res) => {
  const db = await getDb();
  const machine = await db.get('SELECT * FROM packing_machines WHERE machine_code = ? AND is_active = 1', req.params.machine_barcode);
  if (!machine) return res.status(404).json({ error: 'Machine not found' });

  const now = new Date().toISOString();
  const plan = await db.get(`
    SELECT pp.*, rm.part_number, rm.name as rm_name
    FROM production_plans pp
    LEFT JOIN raw_materials rm ON pp.raw_material_id = rm.id
    WHERE pp.machine_id = ?
      AND pp.status IN ('approved','in_progress')
      AND pp.start_datetime <= ?
      AND pp.end_datetime >= ?
    LIMIT 1
  `, machine.id, now, now);

  res.json({ machine, plan: plan || null });
});

// GET scan history
router.get('/history', authMiddleware, async (req, res) => {
  const db = await getDb();
  const { machine_id, plan_id, limit = 50 } = req.query;
  let query = `
    SELECT sv.*, u.full_name as operator_name, pm.name as machine_name, pm.machine_code,
      rm.name as expected_material_name
    FROM scan_validations sv
    LEFT JOIN users u ON sv.scanned_by = u.id
    LEFT JOIN packing_machines pm ON sv.machine_id = pm.id
    LEFT JOIN raw_materials rm ON sv.expected_raw_material_id = rm.id
    WHERE 1=1
  `;
  const params = [];
  if (machine_id) { query += ' AND sv.machine_id = ?'; params.push(machine_id); }
  if (plan_id) { query += ' AND sv.production_plan_id = ?'; params.push(plan_id); }
  query += ' ORDER BY sv.scanned_at DESC LIMIT ?';
  params.push(parseInt(limit));
  res.json(await db.all(query, ...params));
});

module.exports = router;
