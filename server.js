require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Client } = require('pg');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

function normalizeEnvVar(value) {
  if (!value || typeof value !== 'string') return '';
  let result = value.trim();
  if ((result.startsWith('"') && result.endsWith('"')) || (result.startsWith("'") && result.endsWith("'"))) {
    result = result.slice(1, -1).trim();
  }
  return result;
}

const POSTGRES_URL = normalizeEnvVar(process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.PG_URI);
const POSTGRES_DB_NAME = normalizeEnvVar(process.env.PGDATABASE || process.env.POSTGRES_DB) || 'mizpah-online';
const ENFORCE_DB = String(process.env.ENFORCE_DB || '').toLowerCase() === 'true';
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
let usePostgres = Boolean(POSTGRES_URL);

function maskValue(value) {
  if (!value) return 'not set';
  return `${value.slice(0, 10)}...${value.slice(-10)}`;
}

console.log(`PostgreSQL configured: ${Boolean(POSTGRES_URL)}`);
console.log(`PostgreSQL DB name: ${POSTGRES_DB_NAME}`);
console.log(`POSTGRES_URL mask: ${maskValue(POSTGRES_URL)}`);
console.log(`Database enforce mode: ${ENFORCE_DB}`);

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

let pgClient = null;

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

async function initializePostgres() {
  if (!pgClient) return;
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS records (
      collection TEXT NOT NULL,
      record_key TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (collection, record_key)
    );
  `);
  await pgClient.query(`CREATE INDEX IF NOT EXISTS idx_records_collection ON records(collection);`);
  await pgClient.query(`CREATE INDEX IF NOT EXISTS idx_records_collection_data_id ON records(collection, (data->>'id'));`);
  await pgClient.query(`CREATE INDEX IF NOT EXISTS idx_records_collection_data_membershipNumber ON records(collection, (data->>'membershipNumber'));`);
}

function getRecordKey(type, item) {
  if (type === 'members' && item.membershipNumber) return item.membershipNumber;
  if (item.id) return item.id;
  return item.membershipNumber || item.id || `record-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildFilterQuery(type, filter, select = 'record_key, data') {
  const conditions = [];
  const params = [type];
  let idx = 2;

  if (filter.membershipNumber) {
    conditions.push(`data->>'membershipNumber' = $${idx++}`);
    params.push(String(filter.membershipNumber));
  }

  if (filter.id) {
    conditions.push(`data->>'id' = $${idx++}`);
    params.push(String(filter.id));
  }

  if (!conditions.length) {
    conditions.push(`data @> $${idx++}`);
    params.push(JSON.stringify(filter));
  }

  return {
    query: `SELECT ${select} FROM records WHERE collection = $1 AND ${conditions.join(' AND ')} LIMIT 1`,
    params
  };
}

async function connectPostgres() {
  if (!usePostgres) return;

  const maxAttempts = 5;
  const retryDelayMs = 5000;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      pgClient = new Client({ connectionString: POSTGRES_URL });
      await pgClient.connect();
      await initializePostgres();
      console.log(`Connected to PostgreSQL database: ${POSTGRES_DB_NAME}`);
      return;
    } catch (error) {
      lastError = error;
      console.error(`PostgreSQL connection attempt ${attempt} failed:`, error.message || error);
      if (attempt < maxAttempts) {
        console.warn(`Retrying PostgreSQL connection in ${retryDelayMs / 1000} seconds... (${attempt}/${maxAttempts})`);
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  console.error('PostgreSQL connection failed after multiple attempts:', lastError);
  usePostgres = false;
  console.warn('PostgreSQL is unavailable. Continuing with local JSON storage.');
}

async function closePostgres() {
  if (pgClient) {
    await pgClient.end();
    pgClient = null;
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

async function findRecord(type, filter) {
  if (usePostgres && pgClient) {
    const { query, params } = buildFilterQuery(type, filter);
    const result = await pgClient.query(query, params);
    return result.rows[0] || null;
  }

  const db = loadLocalDb();
  const collection = db[type] || [];
  const item = collection.find((existing) =>
    Object.keys(filter).every((key) => existing[key] === filter[key])
  );
  return item ? { record_key: getRecordKey(type, item), data: item } : null;
}

async function findAll(type) {
  if (usePostgres && pgClient) {
    const result = await pgClient.query('SELECT data FROM records WHERE collection = $1 ORDER BY created_at', [type]);
    return result.rows.map((row) => row.data);
  }
  return loadLocalDb()[type] || [];
}

async function findOne(type, filter) {
  if (usePostgres && pgClient) {
    const record = await findRecord(type, filter);
    return record ? record.data : null;
  }
  const db = loadLocalDb();
  return (db[type] || []).find((item) =>
    Object.keys(filter).every((key) => item[key] === filter[key])
  );
}

async function insertOne(type, item) {
  if (usePostgres && pgClient) {
    const recordKey = getRecordKey(type, item);
    const now = new Date().toISOString();
    const data = { ...item, createdAt: item.createdAt || now, updatedAt: now };
    await pgClient.query(
      'INSERT INTO records (collection, record_key, data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
      [type, recordKey, data, data.createdAt, data.updatedAt]
    );
    return data;
  }

  const db = loadLocalDb();
  db[type].push(item);
  saveLocalDb(db);
  return item;
}

async function updateOne(type, filter, update) {
  if (usePostgres && pgClient) {
    const record = await findRecord(type, filter);
    if (!record) return null;
    const updated = { ...record.data, ...update, updatedAt: new Date().toISOString() };
    await pgClient.query(
      'UPDATE records SET data = $1, updated_at = NOW() WHERE collection = $2 AND record_key = $3',
      [updated, type, record.record_key]
    );
    return updated;
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
  if (usePostgres && pgClient) {
    const record = await findRecord(type, filter);
    if (!record) return null;
    await pgClient.query('DELETE FROM records WHERE collection = $1 AND record_key = $2', [type, record.record_key]);
    return record.data;
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

  if (usePostgres && pgClient) {
    for (const type of types) {
      if (!Array.isArray(imported[type])) continue;
      added[type] = 0;
      for (const item of imported[type]) {
        const filter =
          type === 'members'
            ? { membershipNumber: item.membershipNumber }
            : item.id
            ? { id: item.id }
            : item;
        const existing = await findOne(type, filter);
        if (!existing) {
          await insertOne(type, item);
          added[type] += 1;
        }
      }
    }

    await insertOne('backups', { importedAt: new Date().toISOString(), counts: added });
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

// If ENFORCE_DB=true and Postgres is not configured, reject any API write requests.
app.use((req, res, next) => {
  if (ENFORCE_DB && !usePostgres && req.path.startsWith('/api/') && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return res.status(503).json({ error: 'Server is configured to require PostgreSQL but POSTGRES_URL is not set.' });
  }
  next();
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    database: usePostgres && pgClient ? 'postgresql' : 'local-json',
    postgresConfigured: Boolean(POSTGRES_URL),
    postgresDbName: POSTGRES_DB_NAME,
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
  if (usePostgres && pgClient) {
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

// Get a single record by id
app.get('/api/records/:type/:id', async (req, res) => {
  const type = req.params.type;
  const id = req.params.id;
  if (!recordTypes.includes(type)) {
    return res.status(400).json({ error: `Record type must be one of: ${recordTypes.join(', ')}` });
  }
  const record = await findOne(type, { id });
  if (!record) return res.status(404).json({ error: 'Record not found' });
  res.json(record);
});

// Update a record by id
app.put('/api/records/:type/:id', async (req, res) => {
  const type = req.params.type;
  const id = req.params.id;
  if (!recordTypes.includes(type)) {
    return res.status(400).json({ error: `Record type must be one of: ${recordTypes.join(', ')}` });
  }
  const updated = await updateOne(type, { id }, req.body);
  if (!updated) return res.status(404).json({ error: 'Record not found' });
  res.json(updated);
});

// Delete a record by id
app.delete('/api/records/:type/:id', async (req, res) => {
  const type = req.params.type;
  const id = req.params.id;
  if (!recordTypes.includes(type)) {
    return res.status(400).json({ error: `Record type must be one of: ${recordTypes.join(', ')}` });
  }
  const deleted = await deleteOne(type, { id });
  if (!deleted) return res.status(404).json({ error: 'Record not found' });
  res.json(deleted);
});

async function startServer() {
  if (usePostgres) {
    await connectPostgres();
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`Mizpah backend running on http://${HOST}:${PORT}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Failed to start server: port ${PORT} is already in use.\n` +
        `Use a different PORT environment variable or stop the process using port ${PORT}.`);
      process.exit(1);
    }
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

process.on('SIGINT', async () => {
  await closePostgres();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePostgres();
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception:', error);
  await closePostgres();
  process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
  console.error('Unhandled rejection:', reason);
  await closePostgres();
  process.exit(1);
});

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
