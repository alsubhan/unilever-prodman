const express = require('express');
const { getDb } = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const db = await getDb();
  const items = await db.all('SELECT * FROM shifts ORDER BY name');
  res.json(items);
});

router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  const db = await getDb();
  const { name, start_time, end_time } = req.body;
  if (!name || !start_time || !end_time) {
    return res.status(400).json({ error: 'Name, start time, and end time are required' });
  }
  try {
    const result = await db.run('INSERT INTO shifts (name, start_time, end_time) VALUES (?, ?, ?)', name, start_time, end_time);
    res.status(201).json({ id: result.lastID, name, start_time, end_time, is_active: 1 });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Shift name already exists' });
    throw e;
  }
});

router.put('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const db = await getDb();
  const { name, start_time, end_time, is_active } = req.body;
  const item = await db.get('SELECT * FROM shifts WHERE id = ?', req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  try {
    await db.run(`UPDATE shifts SET name=?, start_time=?, end_time=?, is_active=?, updated_at=datetime('now') WHERE id=?`,
      name ?? item.name, start_time ?? item.start_time, end_time ?? item.end_time, is_active ?? item.is_active, req.params.id);
    res.json({ success: true });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Shift name already exists' });
    throw e;
  }
});

router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM shifts WHERE id = ?', req.params.id);
  res.json({ success: true });
});

module.exports = router;
