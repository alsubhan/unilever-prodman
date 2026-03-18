const { getDb } = require('./server/db');
(async () => {
  const db = await getDb();
  await db.run('DELETE FROM raw_materials');
  await db.run(`INSERT INTO raw_materials (part_number, name, description, unit) VALUES (?, ?, ?, ?)`, ['RM-T01', 'Black Tea Leaves', 'Premium Ceylon Black Tea', 'kg']);
  await db.run(`INSERT INTO raw_materials (part_number, name, description, unit) VALUES (?, ?, ?, ?)`, ['RM-T02', 'Green Tea Leaves', 'Organic Green Tea', 'kg']);
  await db.run(`INSERT INTO raw_materials (part_number, name, description, unit) VALUES (?, ?, ?, ?)`, ['RM-C01', 'Arabica Coffee Beans', 'Medium roast Arabica', 'kg']);
  await db.run(`INSERT INTO raw_materials (part_number, name, description, unit) VALUES (?, ?, ?, ?)`, ['RM-C02', 'Robusta Coffee Beans', 'Dark roast Robusta', 'kg']);
  await db.run(`INSERT INTO raw_materials (part_number, name, description, unit) VALUES (?, ?, ?, ?)`, ['RM-S01', 'Sugar', 'Refined white sugar', 'kg']);
  console.log('Database raw materials heavily updated to Tea & Coffee!');
  process.exit(0);
})();
