require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const MONGO_URI = process.env.MONGODB_URI || '';
const MONGO_DB_NAME = process.env.MONGODB_DB || 'mizpah-online';
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const useMongo = Boolean(MONGO_URI);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const collectionTypes = [
  'members',
  'inventory',
  'projectGiving',
  'tithes',
  'attendance',
  'welfare',
  'churchGiving',
  'departmentContributions',
  'expenses',
  'backups'
];

let mongoClient = null;
let mongoDb = null;

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

function loadLocalDb() {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    saveLocalDb(createInitialDb());
  }
  const contents = fs.readFileSync(DB_FILE, 'utf-8');
  return JSON.parse(contents || JSON.stringify(createInitialDb()));
}

function saveLocalDb(db) {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  return db;
}

async function connectMongo() {
  if (!useMongo) return;
  try {
    mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
    mongoDb = mongoClient.db(MONGO_DB_NAME);
    console.log(`Connected to MongoDB database: ${MONGO_DB_NAME}`);
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

async function closeMongo() {
  if (mongoClient) {
    await mongoClient.close();
  }
}

function getLocalCollection(db, type) {
  const collections = {
    members: db.members,
    inventory: db.inventory,
    projectGiving: db.projectGiving,
    tithes: db.tithes,
    attendance: db.attendance,
    welfare: db.welfare,
    churchGiving: db.churchGiving,
    departmentContributions: db.departmentContributions,
    expenses: db.expenses,
    backups: db.backups
  };
  return collections[type];
}

async function getCollection(type) {
  if (useMongo && mongoDb) {
    return mongoDb.collection(type);
  }
  const db = loadLocalDb();
  return { local: true, db, data: getLocalCollection(db, type) };
}

async function findAll(type) {
  if (useMongo && mongoDb) {
    const collection = await getCollection(type);
    return collection.find().toArray();
  }
  return loadLocalDb()[type] || [];
}

async function findOne(type, filter) {
  if (useMongo && mongoDb) {
    const collection = await getCollection(type);
    return collection.findOne(filter);
  }
  const db = loadLocalDb();
  return (db[type] || []).find((item) =>
    Object.keys(filter).every((key) => item[key] === filter[key])
  );
}

async function insertOne(type, item) {
  if (useMongo && mongoDb) {
    const collection = await getCollection(type);
    await collection.insertOne(item);
    return item;
  }
  const db = loadLocalDb();
  db[type].push(item);
  saveLocalDb(db);
  return item;
}

async function updateOne(type, filter, update) {
  if (useMongo && mongoDb) {
    const collection = await getCollection(type);
    await collection.updateOne(filter, { $set: update });
    return collection.findOne(filter);
  }
  const db = loadLocalDb();
  const item = (db[type] || []).find((existing) =>
    Object.keys(filter).every((key) => existing[key] === filter[key])
  );
  if (!item) return null;
  Object.assign(item, update);
  saveLocalDb(db);
  return item;
}

async function deleteOne(type, filter) {
  if (useMongo && mongoDb) {
    const collection = await getCollection(type);
    const item = await collection.findOne(filter);
    if (!item) return null;
    await collection.deleteOne(filter);
    return item;
  }
  const db = loadLocalDb();
  const collection = db[type] || [];
  const index = collection.findIndex((existing) =>
    Object.keys(filter).every((key) => existing[key] === filter[key])
  );
  if (index === -1) return null;
  const deleted = collection.splice(index, 1)[0];
  saveLocalDb(db);
  return deleted;
}

async function generateMembershipNumber() {
  const members = await findAll('members');
  const last = members
    .map((member) => parseInt(member.membershipNumber.replace(/^MIZ-26\//, ''), 10))
    .filter((num) => !Number.isNaN(num))
    .sort((a, b) => b - a)[0] || 0;
  return `MIZ-26/${String(last + 1).padStart(3, '0')}`;
}

async function mergeImportData(imported) {
  const added = {};
  const types = [
    'members',
    'inventory',
    'projectGiving',
    'tithes',
    'attendance',
    'welfare',
    'churchGiving',
    'departmentContributions',
    'expenses'
  ];

  if (useMongo && mongoDb) {
    for (const type of types) {
      if (!Array.isArray(imported[type])) continue;
      added[type] = 0;
      const collection = await getCollection(type);

      for (const item of imported[type]) {
        const filter =
          type === 'members'
            ? { membershipNumber: item.membershipNumber }
            : item.id
            ? { id: item.id }
            : item;
        const existing = await collection.findOne(filter);
        if (!existing) {
          await collection.insertOne(item);
          added[type] += 1;
        }
      }
    }

    const backupCollection = await getCollection('backups');
    await backupCollection.insertOne({ importedAt: new Date().toISOString(), counts: added });
    return { added };
  }

  const db = loadLocalDb();
  for (const type of types) {
    if (!Array.isArray(imported[type])) continue;
    added[type] = 0;
    const collection = db[type];

    imported[type].forEach((item) => {
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

  db.backups.push({ importedAt: new Date().toISOString(), counts: added });
  saveLocalDb(db);
  return { added };
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
  res.json({
    status: 'ok',
    version: '1.0.0',
    database: useMongo ? 'mongodb' : 'local-json',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/members', async (req, res) => {
  const members = await findAll('members');
  res.json(members);
});

app.get('/api/members/:id', async (req, res) => {
  const member = await findOne('members', { membershipNumber: req.params.id });
  if (!member) return res.status(404).json({ error: 'Member not found' });
  res.json(member);
});

app.post('/api/members', async (req, res) => {
  const { membershipNumber, name, phone, gender, group, dateJoined } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Member name and phone are required.' });
  }

  const memberNumber = membershipNumber || (await generateMembershipNumber());
  const existing = await findOne('members', { membershipNumber: memberNumber });
  if (existing) {
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

  await insertOne('members', member);
  res.status(201).json(member);
});

app.put('/api/members/:id', async (req, res) => {
  const updated = await updateOne('members', { membershipNumber: req.params.id }, req.body);
  if (!updated) return res.status(404).json({ error: 'Member not found' });
  res.json(updated);
});

app.delete('/api/members/:id', async (req, res) => {
  const deleted = await deleteOne('members', { membershipNumber: req.params.id });
  if (!deleted) return res.status(404).json({ error: 'Member not found' });
  res.json(deleted);
});

app.get('/api/backup', async (req, res) => {
  if (useMongo && mongoDb) {
    const records = {};
    for (const type of collectionTypes) {
      records[type] = await findAll(type);
    }
    return res.json(records);
  }
  res.json(loadLocalDb());
});

app.post('/api/import', upload.single('file'), async (req, res) => {
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

  const { added } = await mergeImportData(imported);
  res.json({ success: true, added });
});


const recordTypes = ['inventory', 'projectGiving', 'tithes', 'attendance', 'welfare', 'churchGiving', 'departmentContributions', 'expenses'];

app.get('/api/records/:type', async (req, res) => {
  const type = req.params.type;
  if (!recordTypes.includes(type)) {
    return res.status(400).json({ error: `Record type must be one of: ${recordTypes.join(', ')}` });
  }
  const records = await findAll(type);
  res.json(records);
});

app.post('/api/records/:type', async (req, res) => {
  const type = req.params.type;
  if (!recordTypes.includes(type)) {
    return res.status(400).json({ error: `Record type must be one of: ${recordTypes.join(', ')}` });
  }

  const record = { id: `${type}-${Date.now()}`, ...req.body, createdAt: new Date().toISOString() };
  await insertOne(type, record);
  res.status(201).json(record);
});

async function startServer() {
  if (useMongo) {
    await connectMongo();
  }

  app.listen(PORT, HOST, () => {
    console.log(`Mizpah backend running on http://${HOST}:${PORT}`);
  });
}

process.on('SIGINT', async () => {
  await closeMongo();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeMongo();
  process.exit(0);
});

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
