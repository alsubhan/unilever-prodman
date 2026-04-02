const express = require('express');
const { getDb } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Packing material usage report
router.get('/packing-material-usage', authMiddleware, async (req, res) => {
  const db = await getDb();
  const { from_date, to_date, machine_id, packing_material_id } = req.query;

  let query = `
    SELECT
      sv.scanned_at,
      pm.name as machine_name,
      pm.machine_code,
      rm.name as expected_material,
      rm.part_number as expected_part_number,
      sv.scanned_packing_material_barcode,
      sv.is_valid,
      u.full_name as operator_name,
      pp.id as plan_id
    FROM scan_validations sv
    LEFT JOIN packing_machines pm ON sv.machine_id = pm.id
    LEFT JOIN packing_materials rm ON sv.expected_packing_material_id = rm.id
    LEFT JOIN users u ON sv.scanned_by = u.id
    LEFT JOIN production_plans pp ON sv.production_plan_id = pp.id
    WHERE 1=1
  `;
  const params = [];
  if (from_date) { query += ' AND sv.scanned_at >= ?'; params.push(from_date); }
  if (to_date) { query += ' AND sv.scanned_at <= ?'; params.push(to_date + 'T23:59:59'); }
  if (machine_id) { query += ' AND sv.machine_id = ?'; params.push(machine_id); }
  if (packing_material_id) { query += ' AND sv.expected_packing_material_id = ?'; params.push(packing_material_id); }
  query += ' ORDER BY sv.scanned_at DESC LIMIT 1000';

  try {
    const rows = await db.all(query, ...params);

    // Summary stats
    const total = rows.length;
    const valid = rows.filter(r => r.is_valid === 1).length;
    const invalid = total - valid;

    res.json({ rows, summary: { total, valid, invalid, success_rate: total ? Math.round((valid / total) * 100) : 0 } });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Production planning dashboard
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const now = new Date().toISOString();
    const todayStart = new Date().toISOString().split('T')[0] + 'T00:00:00';

    const activePlans = (await db.get(`SELECT COUNT(*) as count FROM production_plans WHERE status IN ('approved','in_progress') AND start_datetime <= ? AND end_datetime >= ?`, now, now))?.count || 0;
    const pendingApproval = (await db.get(`SELECT COUNT(*) as count FROM production_plans WHERE status = 'pending_approval'`))?.count || 0;
    const completedToday = (await db.get(`SELECT COUNT(*) as count FROM production_plans WHERE status = 'completed' AND updated_at >= ?`, todayStart))?.count || 0;
    const totalScansToday = (await db.get(`SELECT COUNT(*) as count FROM scan_validations WHERE scanned_at >= ?`, todayStart))?.count || 0;
    const validScansToday = (await db.get(`SELECT COUNT(*) as count FROM scan_validations WHERE scanned_at >= ? AND is_valid = 1`, todayStart))?.count || 0;
    const errorsToday = totalScansToday - validScansToday;

    // Plans by status
    const plansByStatus = await db.all(`SELECT status, COUNT(*) as count FROM production_plans GROUP BY status`);

    // Daily scan trend (last 7 days)
    const scanTrend = await db.all(`
      SELECT DATE(scanned_at) as day,
        COUNT(*) as total,
        SUM(is_valid) as valid,
        COUNT(*) - SUM(is_valid) as invalid
      FROM scan_validations
      WHERE scanned_at >= datetime('now', '-7 days')
      GROUP BY day ORDER BY day
    `);

    // Recent plans
    const recentPlans = await db.all(`
      SELECT pp.id, pp.status, pp.start_datetime, pp.end_datetime,
        pm.name as machine_name, rm.name as packing_material_name
      FROM production_plans pp
      LEFT JOIN packing_machines pm ON pp.machine_id = pm.id
      LEFT JOIN packing_materials rm ON pp.packing_material_id = rm.id
      ORDER BY pp.created_at DESC LIMIT 5
    `);

    res.json({
      stats: { activePlans, pendingApproval, completedToday, totalScansToday, validScansToday, errorsToday },
      plansByStatus, scanTrend, recentPlans
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
