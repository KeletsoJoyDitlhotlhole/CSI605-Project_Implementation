// publication.controller.js

const db = require("../config/database");
const crypto = require("crypto");
const fs = require("fs");
const fsPromises = require("fs/promises");
const path = require("path");

// Publication statuses that will need attention from a reviwer
const VALID_FILTERS = ["pending", "approved", "rejected"];
const DEFAULT_FILTERS = ["pending", "approved"];

// Allowed status changes. Withdrawn is only reachable from approved.
const TRANSITIONS = {
    pending: ["approved", "rejected"],
    submitted: ["approved", "rejected"], // old rows saved as 'SUBMITTED'
    approved: ["withdrawn"],
};

// Shared first half of the review queries: columns + joins.
// Each function adds its own WHERE / ORDER BY / LIMIT after it.
// A LATERAL join is a subquery that may refer to the current row of the
// table before it. Here it picks only the newest file per publication, so a
// publication with two uploads can't appear twice in the list.
const PUB_SELECT = `
    SELECT
        pub.publication_id, pub.publication_reference, pub.title, pub.abstract,
        pub.keywords, pub.publication_type, pub.status,
        pub.created_at, pub.submitted_at, pub.updated_at,
        COALESCE(
            (SELECT json_agg(a.publication_author ORDER BY a.author_order)
             FROM public."Publication Author" a
             WHERE a.publication_id = pub.publication_id),
            '[]'::json
        ) AS authors,
        f.file_id, f.original_filename,
        s.user_id AS submitter_id, s.firstname AS submitter_firstname,
        s.surname AS submitter_surname, s.email AS submitter_email,
        l.user_id AS lecturer_id, l.firstname AS lecturer_firstname,
        l.surname AS lecturer_surname, l.email AS lecturer_email
    FROM public."Publications" pub
    LEFT JOIN public."Users" s ON s.user_id = pub.submitted_by
    LEFT JOIN public."Users" l ON l.user_id = pub.lecturer_id
    LEFT JOIN LATERAL (
        SELECT file_id, original_filename
        FROM public."Publication File"
        WHERE publication_id = pub.publication_id
        ORDER BY uploaded_at DESC
        LIMIT 1
    ) f ON true`;

// Lecturers only see publications of students they supervise.
async function isLecturer(req) {
    const { rows } = await db.query(
        `SELECT role FROM public."Users" WHERE user_id = $1`, [req.user.id]);
    return (rows[0]?.role || "").toLowerCase() === "lecturer";
}

async function canAccess(req, publicationId) {
    if (!(await isLecturer(req))) return true;
    const { rowCount } = await db.query(
        `SELECT 1 FROM public."Publications" WHERE publication_id = $1 AND lecturer_id = $2`,
        [publicationId, req.user.id]);
    return rowCount > 0;
}

// Get all publications
exports.getAllPublcations = async (req, res) => {
    const sql = `
        SELECT 
            pub.publication_id,
            pub.publication_reference,
            pub.title,
            pub.abstract,
            pub.keywords,
            pub.status,
            pub.created_at,
            pub.submitted_at,

            COALESCE(
                (SELECT json_agg(a.publication_author ORDER BY a.author_order) FROM public."Publication Author" a
                WHERE a.publication_id = pub.publication_id),
                '[]'::json
            ) AS authors,

            f.file_id,
            f.original_filename,
            f.stored_filename,

            u.firstname AS submitter_firstname,
            u.surname AS submitter_surname,
            u.email AS submitter_email
        FROM 
            public."Publications" pub
        LEFT JOIN
            public."Publication File" f
        ON
            pub.publication_id = f.publication_id
        LEFT JOIN
            public."Users" u
        ON
            pub.submitted_by = u.user_id
        ORDER BY 
            created_at 
        DESC`;

    try {
        const result = await db.query(sql);
        return res.status(200).json({
            total: result.rowCount,
            publications: result.rows
        });
    } catch (err) {
        console.error({error: err.message});
        return res.status(500).json({error: err.message});
    }
};

// Get all publication that have to be reviewed
// we have to consider pagination incase there is a lot 
// of pending publications
// GET /review?page=1&limit=10&status=pending,approved
exports.getReviewList = async (req, res) => {
    // get page number from query string
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    // get maximux number you 
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 30);

    // set the offset
    const offset = (page - 1) * limit;

    // statuses to show, from ?status=pending,approved (defaults to pending + approved)
    let statuses = String(req.query.status ?? "")
        .split(",").map(s => s.trim().toLowerCase())
        .filter(s => VALID_FILTERS.includes(s));
    if (statuses.length === 0) statuses = [...DEFAULT_FILTERS];
    if (statuses.includes("pending")) statuses.push("submitted");

    try {
        const conditions = ["LOWER(pub.status) = ANY($1)"];
        const params = [statuses];

        // lecturers only see their own students' publications
        if (await isLecturer(req)) {
            params.push(req.user.id);
            conditions.push(`pub.lecturer_id = $${params.length}`);
        }
        const where = `WHERE ${conditions.join(" AND ")}`;
        const n = params.length;

        const [list, count] = await Promise.all([
            db.query(
                `${PUB_SELECT} ${where} ORDER BY pub.created_at DESC LIMIT $${n + 1} OFFSET $${n + 2}`,
                [...params, limit, offset]),
            db.query(
                `SELECT COUNT(*)::int AS total FROM public."Publications" pub ${where}`,
                params)
        ]);

        const total = count.rows[0].total;
        return res.status(200).json({
            total,
            page,
            limit,
            totalPages: Math.max(Math.ceil(total / limit), 1),
            publications: list.rows
        })
    } catch (err) {
        console.error({error: err.message});
        return res.status(500).json({error: err.message});
    }
};

// Get one publication in full, with its status history
// GET /review/:id
exports.getReviewDetail = async (req, res) => {
    try {
        if (!(await canAccess(req, req.params.id)))
            return res.status(404).json({ message: "Publication not found" });

        const pub = await db.query(`${PUB_SELECT} WHERE pub.publication_id = $1`, [req.params.id]);
        if (pub.rowCount === 0)
            return res.status(404).json({ message: "Publication not found" });

        const history = await db.query(
            `SELECT previous_status, new_status, changed_by, changed_at, comments
             FROM public."Publication Status History"
             WHERE publication_id = $1 ORDER BY changed_at DESC`,
            [req.params.id]);

        return res.status(200).json({ ...pub.rows[0], history: history.rows });
    } catch (err) {
        console.error({ error: err.message });
        return res.status(500).json({ error: err.message });
    }
};

// Create a publication
exports.createPublication = async (req, res) => {
    const { title, abstract, keywords } = req.body;
    
    let authors;
    try {
        authors = JSON.parse(req.body.authors);
    } catch {
        authors = null;
    }

    const cleanAuthors = Array.isArray(authors) ? authors.map(a => String(a).trim()).filter(Boolean) : [];

    if (!title?.trim() || !abstract?.trim() || !keywords?.trim() || cleanAuthors.length === 0 || !req.file) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(400).json({error: "Missing required fields"});
    }

    if (title.trim().length > 155 || cleanAuthors.some(a => a.length > 50)) {
        fs.unlink(req.path, () => {});
        return res.status(400).json({error: "Title (max 150) or an author name (max 50) is too long"});
    }

    // Authenticated user from Keycloak JWT (set by auth.middleware.js)
    const username = req.user.id;
    const suffix = crypto.randomBytes(6).toString("hex");
    const publicationId = `PUB-${suffix}`;
    const publicationRef = `REF-${new Date().getFullYear()}-${suffix}`;
    const fileId = `FILE-${suffix}`;

    const cleanKeywords = keywords.split(",").map(k => k.trim()).filter(Boolean).join(", ");

    // dedicated connection for transactions taken from db pool
    const client = await db.connect();

    try {
        // begin tranaction
        await client.query("BEGIN");

        // insert publication
        const sqlPub = `
            INSERT 
            INTO 
                public."Publications" (publication_id, publication_reference, title, abstract, keywords, submitted_by, status, created_at, submitted_at)
            VALUES
                ($1, $2, $3, $4, $5, $6, 'submitted', now(), now())`;
        await client.query(sqlPub, [publicationId, publicationRef, title.trim(), abstract.trim(), cleanKeywords, username]);

        // insert authors
        const sqlAuth = `
            INSERT 
            INTO 
                public."Publication Author" (publication_author_id, publication_id, publication_author, author_order)
            VALUES
                ($1, $2, $3, $4)`;
        for (let i = 0; i < cleanAuthors.length; i++) {
            await client.query(sqlAuth, [`${publicationId}-${i + 1}`, publicationId, cleanAuthors[i], i + 1]);
        }

        // File
        const sqlFile = `
            INSERT 
            INTO 
                public."Publication File"
                (file_id, publication_id, original_filename, stored_filename, uploaded_at, uploaded_by)
            VALUES
                ($1, $2, $3, $4, now(), $5)`;
        await client.query(sqlFile, [fileId, publicationId, req.file.originalname, req.file.filename,username]);

        await client.query("COMMIT");
        return res.status(201).json({
            msg: "Publication paper successfully submitted",
            publication_id: publicationId,
            publication_reference: publicationRef
        });
    } catch (err) {
        await client.query("ROLLBACK");
        fs.unlink(req.file.path, () => {});
        console.error({err: err.message});
        return res.status(500).json({error: err.message});
    } finally {
        // return connection to the pool
        client.release()
    }
};

// Change publication status
// PATCH /:id/status  { status: 'approved' | 'rejected' | 'withdrawn', comments? }
exports.updatePubStatus = async (req, res) => {
    const next = String(req.body.status ?? "").toLowerCase();
    const comments = req.body.comments?.trim() || null;

    if (!["approved", "rejected", "withdrawn"].includes(next))
        return res.status(400).json({error: "Invalid status"});

    if (!(await canAccess(req, req.params.id)))
        return res.status(404).json({error: "The publication you are looking for does not exist"});

    const client = await db.connect();
    try {
        await client.query("BEGIN");

        // FOR UPDATE locks this row until COMMIT, so two reviewers acting at the
        // same moment can't both change it based on a stale status.
        const cur = await client.query(
            `SELECT status FROM public."Publications" WHERE publication_id = $1 FOR UPDATE`,
            [req.params.id]);

        if (cur.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({error: "The publication you are looking for does not exist"});
        }

        const previous = cur.rows[0].status;
        if (!(TRANSITIONS[previous.toLowerCase()] || []).includes(next)) {
            await client.query("ROLLBACK");
            return res.status(409).json({error: `A ${previous} publication cannot be changed to ${next}`});
        }

        const label = next[0].toUpperCase() + next.slice(1);
        const upd = await client.query(
            `UPDATE public."Publications" SET status = $1, updated_at = now()
             WHERE publication_id = $2
             RETURNING publication_id, status, updated_at`,
            [label, req.params.id]);

        await client.query(
            `INSERT INTO public."Publication Status History"
                (publication_id, previous_status, new_status, changed_by, comments)
             VALUES ($1, $2, $3, $4, $5)`,
            [req.params.id, previous, label, req.user.id, comments]);

        await client.query("COMMIT");
        return res.status(200).json(upd.rows[0]);
    } catch (err) {
        await client.query("ROLLBACK");
        console.error({err: err.message});
        return res.status(500).json({error: err.message});
    } finally {
        client.release();
    }
}

// Get publication file (PDF is now read from the database)
// NOTE: rename file_data to the real column name in "Publication File"
// Get publication file (stored on disk; the table keeps the file name)
exports.getPubFile = async (req, res) => {
    try {
        if (!(await canAccess(req, req.params.id)))
            return res.status(404)
                    .json({message: "The publication file was not found"});

        const result = await db.query(
            `SELECT original_filename, stored_filename
             FROM public."Publication File"
             WHERE publication_id = $1
             ORDER BY uploaded_at DESC LIMIT 1`,
            [req.params.id]);

        if (result.rowCount === 0)
            return res.status(404)
                    .json({message: "The publication file was not found"});

        const { original_filename, stored_filename } = result.rows[0];

        const uploadDir = path.resolve(__dirname, "../../uploads");
        const filePath = path.join(uploadDir, path.basename(stored_filename));

        if (!fs.existsSync(filePath))
            return res.status(404)
                    .json({message: "The publication file is missing."});

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(original_filename)}"`);
        fs.createReadStream(filePath).pipe(res);
    }

    catch (err) {
        console.error(err);
        res.status(500).json({message: "We failed to load the publication file"});
    }
}

// get all comments for a publication
// get all comments for a publication
exports.getAllReviewComments = async (req, res) => {
    const sql = `
        SELECT 
            id, title, details, created_at AS "createdAt", reviewer_id AS "reviewerId"
        FROM 
            "Review Comments"
        WHERE
            publication_id = $1
        ORDER BY
            created_at DESC
    `;

    try {
        if (!(await canAccess(req, req.params.id)))
            return res.status(404).json({ message: "Publication not found" });

        const result = await db.query(
            sql,
            [req.params.id]
        );

        return res.status(200).json(result.rows);
    }

    catch (err) {
        console.error({ error: err});
        return res.status(500).json({ message: "Failed to load review comments"});
    }
}

// Creta a review comment for a publication
exports.createReviewComment = async (req, res) => {

    const title = (req.body.title ?? "").trim();
    const details = (req.body.details ?? "").trim();

    if (!title || !details) 
        return res.status(400)
                .json({message: "Comment title or details are required"});

    const sql = `
        INSERT 
        INTO 
            "Review Comments" (publication_id, reviewer_id, title, details)
        VALUES
            ($1, $2, $3, $4)
        RETURNING
            id, title, details, created_at as "createdAt", reviewer_id as "reviewerId"
        `;

    // Authenticated reviewer from Keycloak JWT (set by auth.middleware.js)
    const reviewerId = req.user.id;

    try {
        if (!(await canAccess(req, req.params.id)))
            return res.status(404).json({ message: "Publication not found" });

        const result = await db.query(
            sql,
            [req.params.id, req.user?.id ?? reviewerId, title, details]
        );
        return res.status(201).json(result.rows[0]);
    }

    catch (err) {
        console.error({ message: err.message });
        return res.status(500).json({ message: "Failed to save review comment." });
    }
}

// ─── Public repository side: only APPROVED publications are ever returned ───
const PUBLIC_SELECT = `
    SELECT
        pub.publication_id, pub.publication_reference, pub.title, pub.abstract,
        pub.keywords, pub.publication_type, pub.status, pub.submitted_at,
        COALESCE(
            (SELECT json_agg(a.publication_author ORDER BY a.author_order)
             FROM public."Publication Author" a
             WHERE a.publication_id = pub.publication_id),
            '[]'::json
        ) AS authors
    FROM public."Publications" pub`;

const APPROVED = `LOWER(pub.status) = 'approved'`;

// Allow-list of sort choices. The user's ?sort= value is only used as a key
// into this object, so it can never inject SQL.
const SORTS = {
    newest: "pub.submitted_at DESC",
    oldest: "pub.submitted_at ASC",
    title: "LOWER(pub.title) ASC",
};

// GET /featured?limit=4
exports.getFeatured = async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 4, 1), 12);
    try {
        const { rows } = await db.query(
            `${PUBLIC_SELECT} WHERE ${APPROVED} ORDER BY pub.submitted_at DESC LIMIT $1`,
            [limit]);
        return res.status(200).json({ total: rows.length, publications: rows });
    } catch (err) {
        console.error({ error: err.message });
        return res.status(500).json({ error: err.message });
    }
};

// GET /search?q=term&page=1&sort=newest|oldest|title
exports.searchPublications = async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = 10;
    const offset = (page - 1) * limit;
    const sort = String(req.query.sort ?? "newest");
    const order = Object.hasOwn(SORTS, sort) ? SORTS[sort] : SORTS.newest;

    if (!q)
        return res.status(200).json({ total: 0, page: 1, limit, totalPages: 1, publications: [] });

    // ILIKE is a case-insensitive pattern match, and % means "any characters".
    // The user's own % and _ are escaped so they are searched literally.
    const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;

    const where = `
        WHERE ${APPROVED}
          AND (
                pub.title    ILIKE $1
             OR pub.abstract ILIKE $1
             OR pub.keywords ILIKE $1
             OR EXISTS (
                    SELECT 1 FROM public."Publication Author" a
                    WHERE a.publication_id = pub.publication_id
                      AND a.publication_author ILIKE $1)
          )`;

    try {
        const [list, count] = await Promise.all([
            db.query(`${PUBLIC_SELECT} ${where} ORDER BY ${order} LIMIT $2 OFFSET $3`,
                     [pattern, limit, offset]),
            db.query(`SELECT COUNT(*)::int AS total FROM public."Publications" pub ${where}`,
                     [pattern]),
        ]);

        const total = count.rows[0].total;
        return res.status(200).json({
            total, page, limit,
            totalPages: Math.max(Math.ceil(total / limit), 1),
            publications: list.rows,
        });
    } catch (err) {
        console.error({ error: err.message });
        return res.status(500).json({ error: err.message });
    }
};

// GET /view/:id
exports.getPublication = async (req, res) => {
    try {
        const { rows } = await db.query(
            `${PUBLIC_SELECT} WHERE pub.publication_id = $1 AND ${APPROVED}`,
            [req.params.id]);

        if (rows.length === 0)
            return res.status(404).json({ message: "Publication not found" });

        return res.status(200).json(rows[0]);
    } catch (err) {
        console.error({ error: err.message });
        return res.status(500).json({ error: err.message });
    }
};

// GET /view/:id/file  (the PDF of an approved publication)
exports.getPublicFile = async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT f.original_filename, f.stored_filename
             FROM public."Publication File" f
             JOIN public."Publications" pub ON pub.publication_id = f.publication_id
             WHERE f.publication_id = $1 AND ${APPROVED}
             ORDER BY f.uploaded_at DESC LIMIT 1`,
            [req.params.id]);

        if (rows.length === 0)
            return res.status(404).json({ message: "The publication file was not found" });

        const { original_filename, stored_filename } = rows[0];
        const uploadDir = path.resolve(__dirname, "../../uploads");
        const filePath = path.join(uploadDir, path.basename(stored_filename));

        if (!fs.existsSync(filePath))
            return res.status(404).json({ message: "The publication file is missing." });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(original_filename)}"`);
        fs.createReadStream(filePath).pipe(res);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "We failed to load the publication file" });
    }
};

const ALLOWED_TYPES = [
  'Journal Article',
  'Conference Paper',
  'Thesis',
  'Dissertation'
];

const submitPublication = async (req, res) => {
  let client;
  let transactionStarted = false;
  let submissionSucceeded = false;

  try {
    const {
      title,
      abstract,
      keywords,
      submittedBy,
      publicationType,
      authors
    } = req.body;

    // Validate required fields.
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Publication title is required.'
      });
    }

    if (typeof abstract !== 'string' || !abstract.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Abstract is required.'
      });
    }

    if (typeof keywords !== 'string' || !keywords.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Domain keywords are required.'
      });
    }

    if (
      typeof submittedBy !== 'string' ||
      !submittedBy.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Submitting student ID is required.'
      });
    }

    if (!ALLOWED_TYPES.includes(publicationType)) {
      return res.status(400).json({
        success: false,
        message: 'Select a valid publication type.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload the publication PDF.'
      });
    }

    // Validate authors.
    let authorList;

    try {
      authorList = typeof authors === 'string'
        ? JSON.parse(authors)
        : authors;
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Authors must be supplied in a valid format.'
      });
    }

    if (
      !Array.isArray(authorList) ||
      authorList.length === 0 ||
      authorList.some(
        author =>
          typeof author !== 'string' || !author.trim()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Enter at least one valid author name.'
      });
    }

    const cleanTitle = title.trim();
    const cleanAbstract = abstract.trim();
    const cleanKeywords = keywords.trim();
    const cleanSubmittedBy = (submittedBy || req.user?.id || '').trim();
    const cleanAuthors = authorList.map(author => author.trim());

    client = await db.connect();

    await client.query('BEGIN');
    transactionStarted = true;

    // Find the student and their assigned lecturer.
    const userResult = await client.query(
      `
      SELECT
        s.user_id,
        s.role,
        s.supervisor_id,
        l.role AS supervisor_role
      FROM "Users" s
      LEFT JOIN "Users" l
        ON l.user_id = s.supervisor_id
      WHERE s.user_id = $1
      `,
      [cleanSubmittedBy]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: 'The submitting user does not exist.'
      });
    }

    const user = userResult.rows[0];

    if (user.role?.toLowerCase() !== 'student') {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(403).json({
        success: false,
        message: 'Only students can submit publications through this form.'
      });
    }

    if (
      !user.supervisor_id ||
      user.supervisor_role?.toLowerCase() !== 'lecturer'
    ) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: 'No valid lecturer is assigned to this student.'
      });
    }

    // Prevent duplicate titles, ignoring case and surrounding spaces.
    const duplicateResult = await client.query(
      `
      SELECT publication_id
      FROM "Publications"
      WHERE LOWER(TRIM(title)) = LOWER(TRIM($1))
      LIMIT 1
      `,
      [cleanTitle]
    );

    if (duplicateResult.rows.length > 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(409).json({
        success: false,
        message: 'A publication with this title already exists.'
      });
    }

    // IDs must fit the database column limits.
    // PUB- plus 24 hexadecimal characters = 28 characters.
    const publicationId =
      `PUB-${crypto.randomBytes(12).toString('hex').toUpperCase()}`;

    // Keep the publication reference readable.
    const publicationReference =
      `UB-PUB-${new Date().getFullYear()}-${crypto
        .randomBytes(4)
        .toString('hex')
        .toUpperCase()}`;

    // Save the publication with its assigned lecturer.
    await client.query(
      `
      INSERT INTO "Publications" (
        abstract,
        keywords,
        submitted_by,
        status,
        created_at,
        updated_at,
        submitted_at,
        publication_id,
        publication_reference,
        title,
        publication_type,
        lecturer_id
      )
      VALUES (
        $1, $2, $3, $4, NOW(), NOW(), NOW(),
        $5, $6, $7, $8, $9
      )
      `,
      [
        cleanAbstract,
        cleanKeywords,
        user.user_id,
        'Pending',
        publicationId,
        publicationReference,
        cleanTitle,
        publicationType,
        user.supervisor_id
      ]
    );

    // Save all authors in their supplied order.
    for (let i = 0; i < cleanAuthors.length; i++) {
      await client.query(
        `
        INSERT INTO "Publication Author" (
          author_order,
          publication_id,
          publication_author_id,
          publication_author
        )
        VALUES ($1, $2, $3, $4)
        `,
        [
          i + 1,
          publicationId,
          `AUTH-${crypto.randomUUID()}`,
          cleanAuthors[i]
        ]
      );
    }

    // Save uploaded PDF metadata.
    // FILE- plus 24 hexadecimal characters = 29 characters.
    const fileId =
      `FILE-${crypto.randomBytes(12).toString('hex').toUpperCase()}`;

    await client.query(
      `
      INSERT INTO "Publication File" (
        file_id,
        publication_id,
        original_filename,
        stored_filename,
        uploaded_at,
        uploaded_by
      )
      VALUES ($1, $2, $3, $4, NOW(), $5)
      `,
      [
        fileId,
        publicationId,
        req.file.originalname,
        req.file.filename,
        user.user_id
      ]
    );

    // Record the initial status.
    await client.query(
      `
      INSERT INTO "Publication Status History" (
        publication_id,
        previous_status,
        new_status,
        changed_by,
        comments
      )
      VALUES ($1, NULL, $2, $3, $4)
      `,
      [
        publicationId,
        'Pending',
        user.user_id,
        'Publication submitted'
      ]
    );

    await client.query('COMMIT');
    transactionStarted = false;
    submissionSucceeded = true;

    return res.status(201).json({
      success: true,
      message: 'Publication submitted successfully.',
      publication: {
        publicationId,
        publicationReference,
        publicationType,
        lecturerId: user.supervisor_id,
        status: 'Pending'
      }
    });

  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Transaction rollback failed:', rollbackError);
      }

      transactionStarted = false;
    }

    console.error('Publication submission error:', error);

    // Do not leave the user with an unexplained server error.
    return res.status(500).json({
      success: false,
      message: 'Failed to submit publication. Please check your details and try again.'
    });

  } finally {
    if (client) {
      client.release();
    }

    // Remove the uploaded file if the database submission failed.
    if (!submissionSucceeded && req.file?.path) {
      try {
        await fsPromises.unlink(req.file.path);
      } catch (fileError) {
        if (fileError.code !== 'ENOENT') {
          console.error('Uploaded file cleanup failed:', fileError);
        }
      }
    }
  }
};

exports.submitPublication = submitPublication;