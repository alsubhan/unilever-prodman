const express = require('express');
const cors = require('cors');
const path = require('path');
const fileUpload = require('express-fileupload');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(fileUpload({ limits: { fileSize: 100 * 1024 * 1024 } }));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/raw-materials', require('./routes/rawMaterials'));
app.use('/api/packing-machines', require('./routes/packingMachines'));
app.use('/api/access-rights', require('./routes/accessRights'));
app.use('/api/production-plans', require('./routes/productionPlans'));
app.use('/api/scan', require('./routes/scan'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/utility', require('./routes/utility'));

// Serve static frontend in production
const distPath = path.join(__dirname, '..', 'dist');
const fs = require('fs');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Production Management Server running at http://localhost:${PORT}`);
  console.log(`📋 API available at http://localhost:${PORT}/api`);
});
