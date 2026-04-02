const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// Get all finished goods with their associated packing materials
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const fgList = await db.all('SELECT * FROM finished_goods ORDER BY created_at DESC');
    
    // For each FG, get its PMs
    for (const fg of fgList) {
      const pms = await db.all(`
        SELECT pm.* FROM packing_materials pm
        JOIN fg_packing_materials fpm ON pm.id = fpm.pm_id
        WHERE fpm.fg_id = ?
      `, [fg.id]);
      fg.packing_materials = pms;
    }
    
    res.json(fgList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single finished good
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const fg = await db.get('SELECT * FROM finished_goods WHERE id = ?', [req.params.id]);
    if (!fg) return res.status(404).json({ error: 'Finished Good not found' });
    
    const pms = await db.all(`
      SELECT pm.* FROM packing_materials pm
      JOIN fg_packing_materials fpm ON pm.id = fpm.pm_id
      WHERE fpm.fg_id = ?
    `, [fg.id]);
    fg.packing_materials = pms;
    
    res.json(fg);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create finished good
router.post('/', async (req, res) => {
  const { part_number, name, description, packing_material_ids } = req.body;
  if (!part_number || !name) return res.status(400).json({ error: 'Part number and name are required' });

  try {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO finished_goods (part_number, name, description) VALUES (?, ?, ?)',
      [part_number, name, description]
    );
    const fgId = result.lastID;

    if (packing_material_ids && Array.isArray(packing_material_ids)) {
      for (const pmId of packing_material_ids) {
        await db.run('INSERT INTO fg_packing_materials (fg_id, pm_id) VALUES (?, ?)', [fgId, pmId]);
      }
    }

    res.status(201).json({ id: fgId, part_number, name, description });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update finished good
router.put('/:id', async (req, res) => {
  const { part_number, name, description, packing_material_ids } = req.body;
  try {
    const db = await getDb();
    await db.run(
      'UPDATE finished_goods SET part_number = ?, name = ?, description = ?, updated_at = datetime("now") WHERE id = ?',
      [part_number, name, description, req.params.id]
    );

    if (packing_material_ids && Array.isArray(packing_material_ids)) {
      // Clear existing associations
      await db.run('DELETE FROM fg_packing_materials WHERE fg_id = ?', [req.params.id]);
      // Add new ones
      for (const pmId of packing_material_ids) {
        await db.run('INSERT INTO fg_packing_materials (fg_id, pm_id) VALUES (?, ?)', [req.params.id, pmId]);
      }
    }

    res.json({ message: 'Finished Good updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete finished good
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM finished_goods WHERE id = ?', [req.params.id]);
    res.json({ message: 'Finished Good deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
