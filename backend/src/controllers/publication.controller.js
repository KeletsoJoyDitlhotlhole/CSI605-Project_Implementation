// publication.controller.js

const db = require("../config/database");
const crypto = require("crypto");
const fs = require("fs");
const fsPromises = require("fs/promises");
const path = require("path");

// Publication statuses that will need attention from a reviewer
const REVIEW_STATUSES = ["submitted", "pending", "rejected"];

const ALLOWED_TYPES = [
  'Journal Article',
  'Conference Paper',
  'Thesis',
  'Dissertation'
];

// Get all publications with optional search, filtering, sorting, and pagination
exports.getAllPublcations = async (req, res) => {
    try {
        const { search, status, type, author, sort } = req.query;
        const page = parseInt(req.query.page, 10);
        const limit = parseInt(req.query.limit, 10);
        const isPaginated = !isNaN(page) && page > 0 && !isNaN(limit) && limit > 0;
        const pageNum = isPaginated ? page : 1;
        const limitNum = isPaginated ? Math.min(Math.max(limit, 1), 100) : null;
        const offset = isPaginated ? (pageNum - 1) * limitNum : 0;

        const conditions = [];
        const values = [];

        // 1. Text Search across title, abstract, keywords, reference, submitter, and authors
        if (search && search.trim()) {
            values.push(`%${search.trim()}%`);
            const searchIndex = values.length;
            conditions.push(`(
                pub.title ILIKE $${searchIndex}
                OR pub.abstract ILIKE $${searchIndex}
                OR pub.keywords ILIKE $${searchIndex}
                OR pub.publication_reference ILIKE $${searchIndex}
                OR u.firstname ILIKE $${searchIndex}
                OR u.surname ILIKE $${searchIndex}
                OR EXISTS (
                    SELECT 1 FROM public."Publication Author" a
                    WHERE a.publication_id = pub.publication_id
                      AND a.publication_author ILIKE $${searchIndex}
                )
            )`);
        }

        // 2. Status Filter
        if (status && status.trim() && status.toLowerCase() !== 'all') {
            values.push(status.trim().toLowerCase());
            conditions.push(`LOWER(pub.status) = $${values.length}`);
        }

        // 3. Publication Type Filter
        if (type && type.trim() && type.toLowerCase() !== 'all') {
            values.push(type.trim().toLowerCase());
            conditions.push(`LOWER(COALESCE(pub.publication_type, '')) = $${values.length}`);
        }

        // 4. Specific Author Filter
        if (author && author.trim()) {
            values.push(`%${author.trim()}%`);
            conditions.push(`EXISTS (
                SELECT 1 FROM public."Publication Author" a
                WHERE a.publication_id = pub.publication_id
                  AND a.publication_author ILIKE $${values.length}
            )`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        // Sort clause
        let orderClause = "ORDER BY pub.created_at DESC";
        if (sort === "oldest") {
            orderClause = "ORDER BY pub.created_at ASC";
        } else if (sort === "title_asc") {
            orderClause = "ORDER BY pub.title ASC";
        } else if (sort === "title_desc") {
            orderClause = "ORDER BY pub.title DESC";
        } else if (sort === "reference_asc") {
            orderClause = "ORDER BY pub.publication_reference ASC";
        }

        const countValues = [...values];
        const countSql = `SELECT COUNT(*)::int AS total FROM public."Publications" pub LEFT JOIN public."Users" u ON pub.submitted_by = u.user_id ${whereClause}`;
        const countResult = await db.query(countSql, countValues);
        const total = countResult.rows[0]?.total || 0;

        let querySql = `
            SELECT 
                pub.publication_id,
                pub.publication_reference,
                pub.title,
                pub.abstract,
                pub.keywords,
                pub.status,
                pub.publication_type,
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
            LEFT JOIN (
                SELECT DISTINCT ON (publication_id) file_id, publication_id, original_filename, stored_filename
                FROM public."Publication File"
                ORDER BY publication_id, uploaded_at DESC
            ) f ON pub.publication_id = f.publication_id
            LEFT JOIN
                public."Users" u
            ON
                pub.submitted_by = u.user_id
            ${whereClause}
            ${orderClause}
        `;

        if (isPaginated) {
            values.push(limitNum);
            const limitParam = values.length;
            values.push(offset);
            const offsetParam = values.length;
            querySql += ` LIMIT $${limitParam} OFFSET $${offsetParam}`;
        }

        const result = await db.query(querySql, values);

        return res.status(200).json({
            total,
            page: isPaginated ? pageNum : 1,
            limit: isPaginated ? limitNum : total,
            totalPages: isPaginated ? Math.max(Math.ceil(total / limitNum), 1) : 1,
            publications: result.rows
        });
    } catch (err) {
        console.error({ error: err.message });
        return res.status(500).json({ error: err.message });
    }
};

// Get a single publication by ID
exports.getPublicationById = async (req, res) => {
    const sql = `
        SELECT 
            pub.publication_id,
            pub.publication_reference,
            pub.title,
            pub.abstract,
            pub.keywords,
            pub.status,
            pub.publication_type,
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
        LEFT JOIN (
            SELECT DISTINCT ON (publication_id) file_id, publication_id, original_filename, stored_filename
            FROM public."Publication File"
            ORDER BY publication_id, uploaded_at DESC
        ) f ON pub.publication_id = f.publication_id
        LEFT JOIN
            public."Users" u
        ON
            pub.submitted_by = u.user_id
        WHERE
            pub.publication_id = $1
    `;

    try {
        const result = await db.query(sql, [req.params.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "The publication you are looking for does not exist" });
        }
        return res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error({ error: err.message });
        return res.status(500).json({ error: err.message });
    }
};

// Get all publications that have to be reviewed with pagination
exports.getReviewList = async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 30);
    const offset = (page - 1) * limit;

    const sqlList = `
        SELECT 
            pub.publication_id,
            pub.publication_reference,
            pub.title,
            pub.abstract,
            pub.keywords,
            pub.status,
            pub.publication_type,
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
        LEFT JOIN (
            SELECT DISTINCT ON (publication_id) file_id, publication_id, original_filename, stored_filename
            FROM public."Publication File"
            ORDER BY publication_id, uploaded_at DESC
        ) f ON pub.publication_id = f.publication_id
        LEFT JOIN
            public."Users" u
        ON
            pub.submitted_by = u.user_id
        WHERE
            LOWER(pub.status) = ANY($1)
        ORDER BY 
            pub.created_at 
        DESC
        LIMIT $2 OFFSET $3`;

    const sqlCount = `SELECT COUNT(*)::int AS total FROM public."Publications" WHERE LOWER(status) = ANY($1)`;

    try {
        const [list, count] = await Promise.all([
            db.query(sqlList, [REVIEW_STATUSES, limit, offset]),
            db.query(sqlCount, [REVIEW_STATUSES])
        ]);

        const total = count.rows[0].total;
        return res.status(200).json({
            total,
            page,
            limit,
            totalPages: Math.max(Math.ceil(total / limit), 1),
            publications: list.rows
        });
    } catch (err) {
        console.error({ error: err.message });
        return res.status(500).json({ error: err.message });
    }
};

// Change publication status (approve | reject | pending)
exports.updatePubStatus = async (req, res) => {
    const { status } = req.body;

    if (!status || typeof status !== 'string') {
        return res.status(400).json({ error: "A valid status is required" });
    }

    const normalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    const validStatuses = ['Pending', 'Approved', 'Rejected', 'Withdrawn'];

    if (!validStatuses.includes(normalizedStatus)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const client = await db.connect();
    try {
        await client.query("BEGIN");

        const prevRes = await client.query(
            `SELECT status FROM public."Publications" WHERE publication_id = $1`,
            [req.params.id]
        );

        if (prevRes.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "The publication you are looking for does not exist" });
        }

        const previousStatus = prevRes.rows[0].status;

        const updateSql = `
            UPDATE 
                public."Publications" 
            SET 
                status = $1, 
                updated_at = now() 
            WHERE 
                publication_id = $2
            RETURNING 
                publication_id, 
                status, 
                updated_at`;

        const result = await client.query(updateSql, [normalizedStatus, req.params.id]);

        const changedBy = (req.user?.id || 'LEC000001').substring(0, 9);
        await client.query(`
            INSERT INTO public."Publication Status History"
                (publication_id, previous_status, new_status, changed_by, changed_at, comments)
            VALUES ($1, $2, $3, $4, now(), $5)
        `, [req.params.id, previousStatus, normalizedStatus, changedBy, `Status updated to ${normalizedStatus}`]);

        await client.query("COMMIT");
        return res.status(200).json(result.rows[0]);
    } catch (err) {
        await client.query("ROLLBACK");
        console.error({ err: err.message });
        return res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// Get publication file (stream PDF)
exports.getPubFile = async (req, res) => {
    const sql = `SELECT original_filename, stored_filename FROM "Publication File" WHERE publication_id = $1 ORDER BY uploaded_at DESC LIMIT 1`;

    try {
        const result = await db.query(sql, [req.params.id]);

        if (result.rowCount === 0)
            return res.status(404).json({ message: "The publication file was not found" });

        const { original_filename, stored_filename } = result.rows[0];

        const uploadDir = path.resolve(__dirname, "../../uploads");
        const filePath = path.join(uploadDir, path.basename(stored_filename));

        if (!fs.existsSync(filePath))
            return res.status(404).json({ message: "The publication file is missing." });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(original_filename)}"`);
        fs.createReadStream(filePath).pipe(res);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "We failed to load the publication file" });
    }
};

// Get all review comments for a publication
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
        const result = await db.query(sql, [req.params.id]);
        return res.status(200).json(result.rows);
    } catch (err) {
        console.error({ error: err });
        return res.status(500).json({ message: "Failed to load review comments" });
    }
};

// Create a review comment for a publication
exports.createReviewComment = async (req, res) => {
    const title = (req.body.title ?? "").trim();
    const details = (req.body.details ?? "").trim();

    if (!title || !details) 
        return res.status(400).json({ message: "Comment title or details are required" });

    const sql = `
        INSERT 
        INTO 
            "Review Comments" (publication_id, reviewer_id, title, details)
        VALUES
            ($1, $2, $3, $4)
        RETURNING
            id, title, details, created_at as "createdAt", reviewer_id as "reviewerId"
        `;

    const reviewerId = (req.user?.id || 'LEC000001').substring(0, 50);

    try {
        const result = await db.query(sql, [req.params.id, reviewerId, title, details]);
        return res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error({ message: err.message });
        return res.status(500).json({ message: "Failed to save review comment." });
    }
};

// Submit a publication (full transactional submission)
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

    const cleanSubmittedBy = (submittedBy || req.user?.id || '').trim();
    if (!cleanSubmittedBy) {
      return res.status(400).json({
        success: false,
        message: 'Submitting student ID is required.'
      });
    }

    const cleanPubType = publicationType || 'Journal Article';
    if (!ALLOWED_TYPES.includes(cleanPubType)) {
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

    let authorList;
    try {
      authorList = typeof authors === 'string' ? JSON.parse(authors) : authors;
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Authors must be supplied in a valid format.'
      });
    }

    if (
      !Array.isArray(authorList) ||
      authorList.length === 0 ||
      authorList.some(author => typeof author !== 'string' || !author.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: 'Enter at least one valid author name.'
      });
    }

    const cleanTitle = title.trim();
    const cleanAbstract = abstract.trim();
    const cleanKeywords = keywords.trim();
    const cleanAuthors = authorList.map(author => author.trim());

    if (cleanTitle.length > 155 || cleanAuthors.some(a => a.length > 50)) {
      return res.status(400).json({
        success: false,
        message: 'Title (max 155 characters) or an author name (max 50 characters) is too long.'
      });
    }

    client = await db.connect();
    await client.query('BEGIN');
    transactionStarted = true;

    // Find the submitting user and their assigned supervisor
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
      WHERE s.user_id = $1 OR LOWER(s.email) = LOWER($1)
      LIMIT 1
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
    const roleLower = user.role?.toLowerCase();

    if (roleLower !== 'student' && roleLower !== 'admin' && roleLower !== 'lecturer' && roleLower !== 'reviewer') {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(403).json({
        success: false,
        message: 'Only students, lecturers, and administrators can submit publications through this form.'
      });
    }

    // If submitter is a lecturer, they can self-supervise or assign another lecturer
    if (roleLower === 'lecturer' || roleLower === 'reviewer') {
      if (!user.supervisor_id) {
        user.supervisor_id = user.user_id;
        user.supervisor_role = 'Lecturer';
      }
    } else if (!user.supervisor_id || user.supervisor_role?.toLowerCase() !== 'lecturer') {
      const defaultLecturer = await client.query(`SELECT user_id, role FROM "Users" WHERE LOWER(role) = 'lecturer' LIMIT 1`);
      if (defaultLecturer.rows.length > 0) {
        user.supervisor_id = defaultLecturer.rows[0].user_id;
        user.supervisor_role = defaultLecturer.rows[0].role;
      } else {
        await client.query('ROLLBACK');
        transactionStarted = false;

        return res.status(400).json({
          success: false,
          message: 'No valid lecturer is assigned to this student.'
        });
      }
    }

    // Prevent duplicate titles (case-insensitive)
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

    const suffix = crypto.randomBytes(6).toString('hex').toUpperCase();
    const publicationId = `PUB-${suffix}`;
    const publicationReference = `UB-PUB-${new Date().getFullYear()}-${suffix}`;

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
        cleanPubType,
        user.supervisor_id
      ]
    );

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
          `${publicationId}-${i + 1}`,
          cleanAuthors[i]
        ]
      );
    }

    const fileId = `FILE-${suffix}`;

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
        user.user_id.substring(0, 9),
        'Publication submitted'
      ]
    );

    await client.query('COMMIT');
    transactionStarted = false;
    submissionSucceeded = true;

    return res.status(201).json({
      success: true,
      message: 'Publication submitted successfully.',
      msg: 'Publication submitted successfully.',
      publication_id: publicationId,
      publication_reference: publicationReference,
      publication: {
        publicationId,
        publicationReference,
        publicationType: cleanPubType,
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

    return res.status(500).json({
      success: false,
      message: 'Failed to submit publication. Please check your details and try again.'
    });

  } finally {
    if (client) {
      client.release();
    }

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
exports.createPublication = submitPublication;
