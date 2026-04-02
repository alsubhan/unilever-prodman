const express = require('express');
const { getDb } = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const db = await getDb();
  const items = await db.all('SELECT * FROM packing_materials ORDER BY part_number', );
  res.json(items);
});

router.post('/', authMiddleware, requireRole('admin', 'production_manager'), async (req, res) => {
  const db = await getDb();
  const { part_number, name, description, unit } = req.body;
  if (!part_number || !name) return res.status(400).json({ error: 'Part number and name are required' });
  try {
    const result = await db.run('INSERT INTO packing_materials (part_number, name, description, unit) VALUES (?, ?, ?, ?)', part_number, name, description || '', unit || 'kg');
    res.status(201).json({ id: result.lastID, part_number, name, description, unit: unit || 'kg', is_active: 1 });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Part number already exists' });
    throw e;
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const item = await db.get('SELECT * FROM packing_materials WHERE id = ?', req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.put('/:id', authMiddleware, requireRole('admin', 'production_manager'), async (req, res) => {
  const db = await getDb();
  const { part_number, name, description, unit, is_active } = req.body;
  const item = await db.get('SELECT * FROM packing_materials WHERE id = ?', req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  try {
    await db.run(`UPDATE packing_materials SET part_number=?, name=?, description=?, unit=?, is_active=?, updated_at=datetime('now') WHERE id=?`,
      part_number ?? item.part_number, name ?? item.name, description ?? item.description, unit ?? item.unit, is_active ?? item.is_active, req.params.id);
    res.json({ success: true });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Part number already exists' });
    throw e;
  }
});

router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM packing_materials WHERE id = ?', req.params.id);
  res.json({ success: true });
});

module.exports = router;
