const express = require('express');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
const BACKUP_DIR = path.join(__dirname, '..', '..', 'data', 'backups');
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'production.db');

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

// POST create backup
router.post('/backup', authMiddleware, requireRole('admin'), async (req, res) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestamp}.db`;
  const destPath = path.join(BACKUP_DIR, filename);

  try {
    const db = await getDb();
    // Since async sqlite driver doesn't have a native backup, just copy the file after taking a quick lock
    // A simple fs.copyFileSync works for SQLite WAL mode in most cases if we just checkpoint
    await db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    fs.copyFileSync(DB_PATH, destPath);
    const stats = fs.statSync(destPath);
    await db.run('INSERT INTO backup_log (filename, size_bytes, created_by) VALUES (?, ?, ?)', [filename, stats.size, req.user.id]);
    res.json({ success: true, filename, size_bytes: stats.size, created_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET list backups
router.get('/backups', authMiddleware, requireRole('admin'), async (req, res) => {
  const db = await getDb();
  const logs = await db.all(`
    SELECT bl.*, u.full_name as created_by_name
    FROM backup_log bl
    LEFT JOIN users u ON bl.created_by = u.id
    ORDER BY bl.created_at DESC
  `);

  // Enrich with file existence
  const enriched = logs.map(log => ({
    ...log,
    file_exists: fs.existsSync(path.join(BACKUP_DIR, log.filename))
  }));

  res.json(enriched);
});

// GET download a backup file
router.get('/backup/:filename', authMiddleware, requireRole('admin'), async (req, res) => {
  const safeName = path.basename(req.params.filename);
  const filePath = path.join(BACKUP_DIR, safeName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Backup file not found' });
  res.download(filePath, safeName);
});

// POST restore from backup
router.post('/restore', authMiddleware, requireRole('admin'), async (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: 'filename required' });
  const safeName = path.basename(filename);
  const srcPath = path.join(BACKUP_DIR, safeName);
  if (!fs.existsSync(srcPath)) return res.status(404).json({ error: 'Backup file not found' });

  // Create a safety backup before restore
  const safetyTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safetyFilename = `pre-restore-${safetyTimestamp}.db`;
  const safetyPath = path.join(BACKUP_DIR, safetyFilename);

  try {
    fs.copyFileSync(DB_PATH, safetyPath);
    fs.copyFileSync(srcPath, DB_PATH);
    res.json({
      success: true,
      message: `Database restored from ${safeName}. A safety backup was created as ${safetyFilename}. Please restart the server to reload the restored database.`,
      safety_backup: safetyFilename
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
