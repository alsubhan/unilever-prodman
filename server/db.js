const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'production.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let dbInstance = null;

async function getDb() {
  if (dbInstance) return dbInstance;

  dbInstance = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  // Enable WAL mode for concurrent reads
  await dbInstance.exec('PRAGMA journal_mode = WAL');
  await dbInstance.exec('PRAGMA foreign_keys = ON');

  // Initialize schema
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','production_manager','operator','viewer')),
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS finished_goods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      part_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fg_packing_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fg_id INTEGER NOT NULL REFERENCES finished_goods(id) ON DELETE CASCADE,
      pm_id INTEGER NOT NULL REFERENCES packing_materials(id) ON DELETE CASCADE,
      UNIQUE(fg_id, pm_id)
    );

    CREATE TABLE IF NOT EXISTS packing_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      part_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      unit TEXT DEFAULT 'kg',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS packing_machines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      location TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS access_rights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      module TEXT NOT NULL,
      can_view INTEGER DEFAULT 0,
      can_create INTEGER DEFAULT 0,
      can_edit INTEGER DEFAULT 0,
      can_delete INTEGER DEFAULT 0,
      can_approve INTEGER DEFAULT 0,
      UNIQUE(role, module)
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      start_time TEXT NOT NULL, -- Format HH:MM
      end_time TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS production_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_id INTEGER NOT NULL REFERENCES packing_machines(id),
      finished_goods_id INTEGER REFERENCES finished_goods(id),
      packing_material_id INTEGER REFERENCES packing_materials(id),
      shift_id INTEGER REFERENCES shifts(id),
      batch_number TEXT,
      start_datetime TEXT NOT NULL,
      end_datetime TEXT NOT NULL,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','pending_approval','approved','in_progress','completed','cancelled')),
      created_by INTEGER REFERENCES users(id),
      approved_by INTEGER REFERENCES users(id),
      approved_at TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scan_validations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      production_plan_id INTEGER REFERENCES production_plans(id),
      machine_id INTEGER NOT NULL REFERENCES packing_machines(id),
      scanned_machine_code TEXT NOT NULL,
      finished_goods_id INTEGER REFERENCES finished_goods(id),
      scanned_fg_barcode TEXT,
      scanned_packing_material_barcode TEXT NOT NULL,
      expected_packing_material_id INTEGER REFERENCES packing_materials(id),
      is_valid INTEGER NOT NULL,
      scanned_by INTEGER REFERENCES users(id),
      error_cleared INTEGER DEFAULT 0,
      scanned_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS backup_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      size_bytes INTEGER,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed default data if no users exist
  const userCount = await dbInstance.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    const adminHash = bcrypt.hashSync('Admin@123', 10);
    const managerHash = bcrypt.hashSync('Manager@123', 10);
    const operatorHash = bcrypt.hashSync('Operator@123', 10);

    await dbInstance.run(`INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)`, ['admin', adminHash, 'System Administrator', 'admin']);
    await dbInstance.run(`INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)`, ['manager', managerHash, 'Shift Operator', 'production_manager']);
    await dbInstance.run(`INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)`, ['operator1', operatorHash, 'Dumping Operator 1', 'operator']);

    // Default access rights
    const modules = ['users', 'finished_goods', 'packing_materials', 'packing_machines', 'shifts', 'access_rights', 'production_planning', 'production_validation', 'reports', 'utility'];
    const roles = ['admin', 'production_manager', 'operator', 'viewer'];

    for (const module of modules) {
      await dbInstance.run(`INSERT OR IGNORE INTO access_rights (role, module, can_view, can_create, can_edit, can_delete, can_approve) VALUES (?, ?, ?, ?, ?, ?, ?)`, ['admin', module, 1, 1, 1, 1, 1]);
      if (['production_planning'].includes(module)) {
        await dbInstance.run(`INSERT OR IGNORE INTO access_rights (role, module, can_view, can_create, can_edit, can_delete, can_approve) VALUES (?, ?, ?, ?, ?, ?, ?)`, ['production_manager', module, 1, 1, 1, 1, 1]);
      } else if (['reports', 'production_validation'].includes(module)) {
        await dbInstance.run(`INSERT OR IGNORE INTO access_rights (role, module, can_view, can_create, can_edit, can_delete, can_approve) VALUES (?, ?, ?, ?, ?, ?, ?)`, ['production_manager', module, 1, 1, 1, 0, 0]);
      } else {
        await dbInstance.run(`INSERT OR IGNORE INTO access_rights (role, module, can_view, can_create, can_edit, can_delete, can_approve) VALUES (?, ?, ?, ?, ?, ?, ?)`, ['production_manager', module, 1, 0, 0, 0, 0]);
      }
      if (['production_validation'].includes(module)) {
        await dbInstance.run(`INSERT OR IGNORE INTO access_rights (role, module, can_view, can_create, can_edit, can_delete, can_approve) VALUES (?, ?, ?, ?, ?, ?, ?)`, ['operator', module, 1, 1, 0, 0, 0]);
      } else if (['production_planning', 'reports'].includes(module)) {
        await dbInstance.run(`INSERT OR IGNORE INTO access_rights (role, module, can_view, can_create, can_edit, can_delete, can_approve) VALUES (?, ?, ?, ?, ?, ?, ?)`, ['operator', module, 1, 0, 0, 0, 0]);
      } else {
        await dbInstance.run(`INSERT OR IGNORE INTO access_rights (role, module, can_view, can_create, can_edit, can_delete, can_approve) VALUES (?, ?, ?, ?, ?, ?, ?)`, ['operator', module, 0, 0, 0, 0, 0]);
      }
      await dbInstance.run(`INSERT OR IGNORE INTO access_rights (role, module, can_view, can_create, can_edit, can_delete, can_approve) VALUES (?, ?, ?, ?, ?, ?, ?)`, ['viewer', module, 1, 0, 0, 0, 0]);
    }

    // Sample finished goods
    await dbInstance.run(`INSERT INTO finished_goods (part_number, name, description) VALUES (?, ?, ?)`, ['FG-T001', 'Premium Black Tea 250g', 'Premium blend black tea in pouch']);
    await dbInstance.run(`INSERT INTO finished_goods (part_number, name, description) VALUES (?, ?, ?)`, ['FG-C001', 'Arabica Coffee 500g', 'Medium roast Arabica coffee beans']);

    // Sample packing materials
    await dbInstance.run(`INSERT INTO packing_materials (part_number, name, description, unit) VALUES (?, ?, ?, ?)`, ['PM-T01', 'Black Tea Leaves', 'Premium Ceylon Black Tea', 'kg']);
    await dbInstance.run(`INSERT INTO packing_materials (part_number, name, description, unit) VALUES (?, ?, ?, ?)`, ['PM-T02', 'Green Tea Leaves', 'Organic Green Tea', 'kg']);
    await dbInstance.run(`INSERT INTO packing_materials (part_number, name, description, unit) VALUES (?, ?, ?, ?)`, ['PM-C01', 'Arabica Coffee Beans', 'Medium roast Arabica', 'kg']);
    await dbInstance.run(`INSERT INTO packing_materials (part_number, name, description, unit) VALUES (?, ?, ?, ?)`, ['PM-C02', 'Robusta Coffee Beans', 'Dark roast Robusta', 'kg']);
    await dbInstance.run(`INSERT INTO packing_materials (part_number, name, description, unit) VALUES (?, ?, ?, ?)`, ['PM-S01', 'Sugar', 'Refined white sugar', 'kg']);

    // Link FG to PM
    const fgTea = await dbInstance.get("SELECT id FROM finished_goods WHERE part_number = 'FG-T001'");
    const pmTea = await dbInstance.get("SELECT id FROM packing_materials WHERE part_number = 'PM-T01'");
    const pmSugar = await dbInstance.get("SELECT id FROM packing_materials WHERE part_number = 'PM-S01'");
    
    if (fgTea && pmTea) await dbInstance.run(`INSERT INTO fg_packing_materials (fg_id, pm_id) VALUES (?, ?)`, [fgTea.id, pmTea.id]);
    if (fgTea && pmSugar) await dbInstance.run(`INSERT INTO fg_packing_materials (fg_id, pm_id) VALUES (?, ?)`, [fgTea.id, pmSugar.id]);

    const fgCoffee = await dbInstance.get("SELECT id FROM finished_goods WHERE part_number = 'FG-C001'");
    const pmCoffee = await dbInstance.get("SELECT id FROM packing_materials WHERE part_number = 'PM-C01'");
    if (fgCoffee && pmCoffee) await dbInstance.run(`INSERT INTO fg_packing_materials (fg_id, pm_id) VALUES (?, ?)`, [fgCoffee.id, pmCoffee.id]);

    // Sample machines
    await dbInstance.run(`INSERT INTO packing_machines (machine_code, name, description, location) VALUES (?, ?, ?, ?)`, ['PM-A1', 'Packing Machine A1', 'High-speed vertical packing machine', 'Line A']);
    await dbInstance.run(`INSERT INTO packing_machines (machine_code, name, description, location) VALUES (?, ?, ?, ?)`, ['PM-B1', 'Packing Machine B1', 'Multi-format packing machine', 'Line B']);

    // Sample shifts
    await dbInstance.run(`INSERT INTO shifts (name, start_time, end_time) VALUES (?, ?, ?)`, ['Shift A', '06:00', '14:00']);
    await dbInstance.run(`INSERT INTO shifts (name, start_time, end_time) VALUES (?, ?, ?)`, ['Shift B', '14:00', '22:00']);
    await dbInstance.run(`INSERT INTO shifts (name, start_time, end_time) VALUES (?, ?, ?)`, ['Shift C', '22:00', '06:00']);

    console.log('✅ Database seeded with default data');
  }

  return dbInstance;
}

module.exports = { getDb };
