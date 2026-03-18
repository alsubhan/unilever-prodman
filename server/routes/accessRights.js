const express = require('express');
const { getDb } = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, requireRole('admin'), async (req, res) => {
  const db = await getDb();
  const rights = await db.all('SELECT * FROM access_rights ORDER BY role, module', );
  res.json(rights);
});

router.put('/', authMiddleware, requireRole('admin'), async (req, res) => {
  const db = await getDb();
  const { role, module, can_view, can_create, can_edit, can_delete, can_approve } = req.body;
  if (!role || !module) return res.status(400).json({ error: 'role and module are required' });
  await db.run(`INSERT INTO access_rights (role, module, can_view, can_create, can_edit, can_delete, can_approve)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(role, module) DO UPDATE SET
      can_view=excluded.can_view,
      can_create=excluded.can_create,
      can_edit=excluded.can_edit,
      can_delete=excluded.can_delete,
      can_approve=excluded.can_approve`,
    role, module, can_view ? 1 : 0, can_create ? 1 : 0, can_edit ? 1 : 0, can_delete ? 1 : 0, can_approve ? 1 : 0);
  res.json({ success: true });
});

module.exports = router;
