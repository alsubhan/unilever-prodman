const express = require('express');
const { getDb } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST validate a scan
// Body: { machine_barcode, fg_barcode, material_barcode }
router.post('/validate', authMiddleware, async (req, res) => {
  const db = await getDb();
  const { machine_barcode, fg_barcode, material_barcode } = req.body;
  
  if (!machine_barcode) {
    return res.status(400).json({ error: 'machine_barcode is required' });
  }

  // Find machine by code
  const machine = await db.get('SELECT * FROM packing_machines WHERE machine_code = ? AND is_active = 1', machine_barcode);
  if (!machine) {
    return res.status(404).json({ is_valid: false, error: 'Unknown packing machine barcode', alarm: true });
  }

  const nowObj = new Date();
  const nowLocalStr = new Date(nowObj.getTime() - (nowObj.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

  // Find active approved production plan for this machine
  const plan = await db.get(`
    SELECT pp.*, 
      fg.part_number as fg_part_number, fg.name as fg_name,
      pm.part_number as pm_part_number, pm.name as pm_name
    FROM production_plans pp
    LEFT JOIN finished_goods fg ON pp.finished_goods_id = fg.id
    LEFT JOIN packing_materials pm ON pp.packing_material_id = pm.id
    WHERE pp.machine_id = ?
      AND pp.status IN ('approved', 'in_progress')
      AND pp.start_datetime <= ?
      AND pp.end_datetime >= ?
    LIMIT 1
  `, machine.id, nowLocalStr, nowLocalStr);

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

  let fgValid = true;
  let pmValid = true;
  let errorMsg = null;

  // 1. Validate FG Pouch if plan has one
  if (plan.finished_goods_id && fg_barcode) {
    fgValid = fg_barcode.trim() === plan.fg_part_number.trim();
    if (!fgValid) {
      errorMsg = `Wrong FG Pouch! Expected: ${plan.fg_part_number} (${plan.fg_name}), Got: ${fg_barcode}`;
    }
  } else if (plan.finished_goods_id && !fg_barcode && !material_barcode) {
    // Stage 1: Waiting for FG scan
    return res.json({
      is_valid: true,
      stage: 'fg_scan',
      machine: { id: machine.id, name: machine.name, machine_code: machine.machine_code },
      plan: { id: plan.id, fg_name: plan.fg_name, fg_part_number: plan.fg_part_number }
    });
  }

  // 2. Validate Packing Material
  if (fgValid && material_barcode) {
    if (plan.finished_goods_id) {
      // Check if PM is linked to this FG
      const linkedPM = await db.get(`
        SELECT pm.* FROM packing_materials pm
        JOIN fg_packing_materials fpm ON pm.id = fpm.pm_id
        WHERE fpm.fg_id = ? AND pm.part_number = ?
      `, [plan.finished_goods_id, material_barcode.trim()]);
      
      pmValid = !!linkedPM;
      if (!pmValid) {
        errorMsg = `Wrong Packing Material for this FG! Got: ${material_barcode}`;
      }
    } else {
      // Legacy mode: plan has direct PM
      pmValid = material_barcode.trim() === plan.pm_part_number.trim();
      if (!pmValid) {
        errorMsg = `Wrong packing material! Expected: ${plan.pm_part_number} (${plan.pm_name}), Got: ${material_barcode}`;
      }
    }
  }

  const overallValid = fgValid && pmValid;

  // Log the scan
  await db.run(`INSERT INTO scan_validations (production_plan_id, machine_id, scanned_machine_code, finished_goods_id, scanned_fg_barcode, scanned_packing_material_barcode, expected_packing_material_id, is_valid, scanned_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    plan.id, machine.id, machine_barcode, plan.finished_goods_id, fg_barcode || null, material_barcode || '', plan.packing_material_id, overallValid ? 1 : 0, req.user.id);

  res.json({
    is_valid: overallValid,
    alarm: !overallValid,
    machine: { id: machine.id, name: machine.name, machine_code: machine.machine_code },
    plan: {
      id: plan.id,
      fg_name: plan.fg_name,
      fg_part_number: plan.fg_part_number,
      expected_material: plan.pm_name || 'Multiple allowed',
      expected_part_number: plan.pm_part_number || 'Multiple allowed'
    },
    error: errorMsg
  });
});

// GET machine info + active plan (for scanner initialization)
router.get('/machine/:machine_barcode', authMiddleware, async (req, res) => {
  const db = await getDb();
  const machine = await db.get('SELECT * FROM packing_machines WHERE machine_code = ? AND is_active = 1', req.params.machine_barcode);
  if (!machine) return res.status(404).json({ error: 'Machine not found' });

  const nowObj = new Date();
  const nowLocalStr = new Date(nowObj.getTime() - (nowObj.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

  const plan = await db.get(`
    SELECT pp.*, rm.part_number, rm.name as pm_name
    FROM production_plans pp
    LEFT JOIN packing_materials rm ON pp.packing_material_id = rm.id
    WHERE pp.machine_id = ?
      AND pp.status IN ('approved','in_progress')
      AND pp.start_datetime <= ?
      AND pp.end_datetime >= ?
    LIMIT 1
  `, machine.id, nowLocalStr, nowLocalStr);

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
    LEFT JOIN packing_materials rm ON sv.expected_packing_material_id = rm.id
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
