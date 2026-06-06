const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function createInitialDb() {
  return {
    members: [],
    inventory: [],
    projectGiving: [],
    tithes: [],
    attendance: [],
    welfare: [],
    churchGiving: [],
    departmentContributions: [],
    expenses: [],
    backups: []
  };
}

function loadDb() {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    saveDb(createInitialDb());
  }
  const contents = fs.readFileSync(DB_FILE, 'utf-8');
  return JSON.parse(contents || JSON.stringify(createInitialDb()));
}

function saveDb(db) {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  return db;
}

function getCollection(type) {
  const db = loadDb();
  const collections = {
    members: db.members,
    inventory: db.inventory,
    projectGiving: db.projectGiving,
    tithes: db.tithes,
    attendance: db.attendance,
    welfare: db.welfare,
    churchGiving: db.churchGiving,
    departmentContributions: db.departmentContributions,
    expenses: db.expenses
  };
  return { data: collections[type], db };
}

function generateMembershipNumber(db) {
  const last = db.members
    .map((member) => parseInt(member.membershipNumber.replace(/^MIZ-26\//, ''), 10))
    .filter((num) => !Number.isNaN(num))
    .sort((a, b) => b - a)[0] || 0;
  return `MIZ-26/${String(last + 1).padStart(3, '0')}`;
}

function mergeImportData(imported, db) {
  const added = {};
  const types = ['members', 'inventory', 'projectGiving', 'tithes', 'attendance', 'welfare', 'churchGiving', 'departmentContributions', 'expenses'];

  types.forEach((type) => {
    if (Array.isArray(imported[type])) {
      added[type] = 0;
      imported[type].forEach((item) => {
        const collection = db[type];
        const isDuplicate = collection.some((existing) => {
          if (type === 'members') return existing.membershipNumber === item.membershipNumber;
          return existing.id && item.id ? existing.id === item.id : JSON.stringify(existing) === JSON.stringify(item);
        });
        if (!isDuplicate) {
          collection.push(item);
          added[type] += 1;
        }
      });
    }
  });

  db.backups.push({
    importedAt: new Date().toISOString(),
    counts: added
  });

  return { db, added };
}

function parseExcelBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

app.get('/api/members', (req, res) => {
  const db = loadDb();
  res.json(db.members);
});

app.get('/api/members/:id', (req, res) => {
  const db = loadDb();
  const member = db.members.find((item) => item.membershipNumber === req.params.id);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  res.json(member);
});

app.post('/api/members', (req, res) => {
  const db = loadDb();
  const { membershipNumber, name, phone, gender, group, dateJoined } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Member name and phone are required.' });
  }

  const memberNumber = membershipNumber || generateMembershipNumber(db);
  if (db.members.some((item) => item.membershipNumber === memberNumber)) {
    return res.status(409).json({ error: 'Membership number already exists.' });
  }

  const member = {
    membershipNumber: memberNumber,
    name,
    phone,
    gender: gender || 'Male',
    group: group || 'Amani',
    dateJoined: dateJoined || new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString()
  };
  db.members.push(member);
  saveDb(db);
  res.status(201).json(member);
});

app.put('/api/members/:id', (req, res) => {
  const db = loadDb();
  const member = db.members.find((item) => item.membershipNumber === req.params.id);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  Object.assign(member, req.body);
  saveDb(db);
  res.json(member);
});

app.delete('/api/members/:id', (req, res) => {
  const db = loadDb();
  const index = db.members.findIndex((item) => item.membershipNumber === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Member not found' });
  const deleted = db.members.splice(index, 1)[0];
  saveDb(db);
  res.json(deleted);
});

app.get('/api/backup', (req, res) => {
  res.json(loadDb());
});

app.post('/api/import', upload.single('file'), (req, res) => {
  const db = loadDb();
  if (!req.file) {
    return res.status(400).json({ error: 'Upload a JSON or Excel file under the field name "file".' });
  }

  let imported;
  const mime = req.file.mimetype || '';
  if (req.file.originalname.toLowerCase().endsWith('.json') || mime.includes('json')) {
    imported = JSON.parse(req.file.buffer.toString('utf-8'));
  } else {
    imported = { members: parseExcelBuffer(req.file.buffer) };
  }

  const { db: mergedDb, added } = mergeImportData(imported, db);
  saveDb(mergedDb);
  res.json({ success: true, added });
});

app.get('/api/records/:type', (req, res) => {
  const type = req.params.type;
  const validTypes = ['inventory', 'projectGiving', 'tithes', 'attendance', 'welfare', 'churchGiving', 'departmentContributions', 'expenses'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Record type must be one of: ${validTypes.join(', ')}` });
  }
  const { data } = getCollection(type);
  res.json(data);
});

app.post('/api/records/:type', (req, res) => {
  const type = req.params.type;
  const validTypes = ['inventory', 'projectGiving', 'tithes', 'attendance', 'welfare', 'churchGiving', 'departmentContributions', 'expenses'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Record type must be one of: ${validTypes.join(', ')}` });
  }

  const { db, data } = getCollection(type);
  const record = { id: `${type}-${Date.now()}`, ...req.body, createdAt: new Date().toISOString() };
  data.push(record);
  saveDb(db);
  res.status(201).json(record);
});

app.get('/api/health', (req, res) => {
  res.json({ healthy: true, timestamp: new Date().toISOString() });
});

app.listen(PORT, HOST, () => {
  console.log(`Mizpah backend running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});
