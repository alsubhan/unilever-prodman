const express = require('express');
const { getDb } = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const db = await getDb();
  const items = await db.all('SELECT * FROM packing_machines ORDER BY machine_code', );
  res.json(items);
});

router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  const db = await getDb();
  const { machine_code, name, description, location } = req.body;
  if (!machine_code || !name) return res.status(400).json({ error: 'Machine code and name are required' });
  try {
    const result = await db.run('INSERT INTO packing_machines (machine_code, name, description, location) VALUES (?, ?, ?, ?)', machine_code, name, description || '', location || '');
    res.status(201).json({ id: result.lastID, machine_code, name, description, location, is_active: 1 });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Machine code already exists' });
    throw e;
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const item = await db.get('SELECT * FROM packing_machines WHERE id = ?', req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.put('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const db = await getDb();
  const { machine_code, name, description, location, is_active } = req.body;
  const item = await db.get('SELECT * FROM packing_machines WHERE id = ?', req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  try {
    await db.run(`UPDATE packing_machines SET machine_code=?, name=?, description=?, location=?, is_active=?, updated_at=datetime('now') WHERE id=?`,
      machine_code ?? item.machine_code, name ?? item.name, description ?? item.description, location ?? item.location, is_active ?? item.is_active, req.params.id);
    res.json({ success: true });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Machine code already exists' });
    throw e;
  }
});

router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM packing_machines WHERE id = ?', req.params.id);
  res.json({ success: true });
});

module.exports = router;
