require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const uploadDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

const app = express();
app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());

const STATUSES = ['Pending', 'Approved', 'Rejected', 'Withdrawn'];

const listQuery = (where) => `
  SELECT p.*,
    COALESCE(json_agg(json_build_object(
      'author_order', a.author_order,
      'name', a.publication_author)
      ORDER BY a.author_order) FILTER (WHERE a.publication_id IS NOT NULL), '[]') AS authors
  FROM "Publications" p
  LEFT JOIN "Publication Author" a ON a.publication_id = p.publication_id
  ${where}
  GROUP BY p.publication_id
  ORDER BY p.created_at DESC`;

// List publications
app.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(listQuery(''));
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// Publications awaiting review
app.get('/review', async (req, res) => {
  try {
    const { rows } = await pool.query(listQuery(`WHERE p.status = 'Pending'`));
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// Submit a publication (multipart form with optional "file")
app.post('/', upload.single('file'), async (req, res) => {
  const { title, abstract, keywords, publication_type, lecturer_id, submitted_by } = req.body;
  if (!title || !abstract || !keywords || !submitted_by) {
    return res.status(400).json({ error: 'title, abstract, keywords and submitted_by are required' });
  }
  let authors;
  try { authors = JSON.parse(req.body.authors || '[]'); }
  catch { authors = String(req.body.authors || '').split(',').map(s => s.trim()).filter(Boolean); }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const id = randomUUID();
    await client.query(
      `INSERT INTO "Publications"
        (publication_id, publication_reference, title, abstract, keywords, publication_type,
         lecturer_id, submitted_by, status, created_at, submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Pending',now(),now())`,
      [id, 'PUB-' + Date.now(), title, abstract, keywords, publication_type || null,
       lecturer_id || null, submitted_by]);

    for (let i = 0; i < authors.length; i++) {
      await client.query(
        `INSERT INTO "Publication Author" (publication_author_id, publication_id, author_order, publication_author)
         VALUES ($1,$2,$3,$4)`,
        [randomUUID(), id, i + 1, typeof authors[i] === 'string' ? authors[i] : authors[i].name]);
    }
    if (req.file) {
      await client.query(
        `INSERT INTO "Publication File" (file_id, publication_id, original_filename, stored_filename, uploaded_at, uploaded_by)
         VALUES ($1,$2,$3,$4,now(),$5)`,
        [randomUUID(), id, req.file.originalname, req.file.filename, submitted_by]);
    }
    await client.query(
      `INSERT INTO "Publication Status History" (publication_id, previous_status, new_status, changed_by)
       VALUES ($1, NULL, 'Pending', $2)`, [id, submitted_by]);
    await client.query('COMMIT');
    res.status(201).json({ publication_id: id });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e); res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

// Approve / reject / withdraw
app.patch('/:id/status', async (req, res) => {
  const { status, comments, changed_by } = req.body;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  if (!changed_by) return res.status(400).json({ error: 'changed_by is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cur = await client.query(
      `SELECT status FROM "Publications" WHERE publication_id = $1 FOR UPDATE`, [req.params.id]);
    if (!cur.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }
    await client.query(
      `UPDATE "Publications" SET status = $1, updated_at = now() WHERE publication_id = $2`,
      [status, req.params.id]);
    await client.query(
      `INSERT INTO "Publication Status History" (publication_id, previous_status, new_status, changed_by, comments)
       VALUES ($1,$2,$3,$4,$5)`,
      [req.params.id, cur.rows[0].status, status, changed_by, comments || null]);
    await client.query('COMMIT');
    res.json({ publication_id: req.params.id, status });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e); res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

// Download the uploaded file
app.get('/review/:id/file', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT stored_filename, original_filename FROM "Publication File"
       WHERE publication_id = $1 ORDER BY uploaded_at DESC LIMIT 1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'No file' });
    res.download(path.join(uploadDir, rows[0].stored_filename), rows[0].original_filename);
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('API running on http://localhost:' + port));