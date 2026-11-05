// publication.controller.js

const db = require("../config/database");
const crypto = require("crypto");
const fs = require("fs");
const fsPromises = require("fs/promises");
const path = require("path");
const emailService = require("../services/email.service");

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

        // 0. Visibility rules by role:
        //    - Guests (not signed in) and Students: only Approved publications
        //    - Lecturers / Reviewers / Admins: all publications
        const userRoles = (req.user?.roles || []).map(r => r.toLowerCase());
        const isStaff = userRoles.some(r => r === 'lecturer' || r === 'reviewer' || r === 'admin');
        if (!isStaff) {
            conditions.push(`LOWER(pub.status) = 'approved'`);
        }

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
                pub.academic_level,
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
                u.email AS submitter_email,
                u.academic_level AS submitter_academic_level,

                pub.lecturer_id,
                l.firstname AS lecturer_firstname,
                l.surname AS lecturer_surname,
                l.email AS lecturer_email
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
            LEFT JOIN
                public."Users" l
            ON
                pub.lecturer_id = l.user_id
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
            pub.submitted_by,
            pub.publication_type,
            pub.academic_level,
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
            u.email AS submitter_email,
            u.academic_level AS submitter_academic_level,

            pub.lecturer_id,
            l.firstname AS lecturer_firstname,
            l.surname AS lecturer_surname,
            l.email AS lecturer_email
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
        LEFT JOIN
            public."Users" l
        ON
            pub.lecturer_id = l.user_id
        WHERE
            pub.publication_id = $1
    `;

    try {
        const result = await db.query(sql, [req.params.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "The publication you are looking for does not exist" });
        }
        const row = result.rows[0];
        const isApproved = (row.status || '').toLowerCase() === 'approved';
        const userRoles = (req.user?.roles || []).map(r => r.toLowerCase());
        const isStaff = userRoles.some(r => r === 'lecturer' || r === 'reviewer' || r === 'admin');
        if (!isApproved && !isStaff) {
            return res.status(404).json({ error: "The publication you are looking for does not exist" });
        }
        return res.status(200).json(row);
    } catch (err) {
        console.error({ error: err.message });
        return res.status(500).json({ error: err.message });
    }
};

// Get publications submitted by the currently signed-in student/user (including review status and latest reviewer comment)
exports.getMySubmissions = async (req, res) => {
    const userId = req.user?.id || null;
    const userEmail = req.user?.email || null;

    if (!userId && !userEmail) {
        return res.status(401).json({ error: "Please sign in to view your submissions." });
    }

    const sql = `
        SELECT
            pub.publication_id,
            pub.publication_reference,
            pub.title,
            pub.abstract,
            pub.keywords,
            pub.status,
            pub.submitted_by,
            pub.publication_type,
            pub.academic_level,
            pub.created_at,
            pub.updated_at,
            pub.submitted_at,
            pub.lecturer_id,
            l.firstname AS lecturer_firstname,
            l.surname AS lecturer_surname,
            l.email AS lecturer_email,
            rc.title AS latest_comment_title,
            rc.details AS latest_comment_details,
            rc.created_at AS latest_comment_at
        FROM public."Publications" pub
        LEFT JOIN public."Users" u ON pub.submitted_by = u.user_id
        LEFT JOIN public."Users" l ON pub.lecturer_id = l.user_id
        LEFT JOIN LATERAL (
            SELECT title, details, created_at
            FROM public."Review Comments" c
            WHERE c.publication_id = pub.publication_id
            ORDER BY c.created_at DESC
            LIMIT 1
        ) rc ON TRUE
        WHERE ($1::text IS NOT NULL AND LOWER(pub.submitted_by) = LOWER($1))
           OR ($2::text IS NOT NULL AND LOWER(u.email) = LOWER($2))
        ORDER BY COALESCE(pub.updated_at, pub.created_at) DESC
    `;

    try {
        const result = await db.query(sql, [userId, userEmail]);
        return res.status(200).json({
            total: result.rows.length,
            publications: result.rows
        });
    } catch (err) {
        console.error({ error: err.message });
        return res.status(500).json({ error: err.message });
    }
};

// Get all publications that have to be reviewed with pagination
// Excludes publications submitted by the currently logged-in lecturer so they cannot review their own work
exports.getReviewList = async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 30);
    const offset = (page - 1) * limit;
    const currentUserId = req.user?.id || null;

    const sqlList = `
        SELECT 
            pub.publication_id,
            pub.publication_reference,
            pub.title,
            pub.abstract,
            pub.keywords,
            pub.status,
            pub.submitted_by,
            pub.publication_type,
            pub.academic_level,
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
            u.email AS submitter_email,
            u.academic_level AS submitter_academic_level,

            pub.lecturer_id,
            l.firstname AS lecturer_firstname,
            l.surname AS lecturer_surname,
            l.email AS lecturer_email
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
        LEFT JOIN
            public."Users" l
        ON
            pub.lecturer_id = l.user_id
        WHERE
            LOWER(pub.status) = ANY($1)
            AND ($2::text IS NULL OR pub.submitted_by <> $2)
        ORDER BY 
            pub.created_at 
        DESC
        LIMIT $3 OFFSET $4`;

    const sqlCount = `
        SELECT COUNT(*)::int AS total
        FROM public."Publications"
        WHERE LOWER(status) = ANY($1)
          AND ($2::text IS NULL OR submitted_by <> $2)`;

    try {
        const [list, count] = await Promise.all([
            db.query(sqlList, [REVIEW_STATUSES, currentUserId, limit, offset]),
            db.query(sqlCount, [REVIEW_STATUSES, currentUserId])
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

    // "changed_by" is a foreign key to Users(user_id) — the reviewer must be a registered user
    if (!req.user?.registered) {
        return res.status(403).json({ error: "Your account is not registered in the publications database, so the decision cannot be recorded." });
    }
    const changedBy = req.user.id;

    let client;
    try {
        client = await db.connect();
        await client.query("BEGIN");

        const prevRes = await client.query(
            `SELECT status, submitted_by FROM public."Publications" WHERE publication_id = $1`,
            [req.params.id]
        );

        if (prevRes.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "The publication you are looking for does not exist" });
        }

        if (prevRes.rows[0].submitted_by && prevRes.rows[0].submitted_by === changedBy) {
            await client.query("ROLLBACK");
            return res.status(403).json({
                error: "You cannot review, approve, or reject a publication that you submitted yourself. Another lecturer must review it."
            });
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

        // Use explicit comments from request body or fall back to the latest comment in "Review Comments"
        let decisionComments = (req.body.comments || '').trim();
        if (!decisionComments) {
            const latestCommentRes = await client.query(
                `SELECT title, details FROM public."Review Comments" WHERE publication_id = $1 ORDER BY created_at DESC LIMIT 1`,
                [req.params.id]
            );
            if (latestCommentRes.rowCount > 0) {
                const c = latestCommentRes.rows[0];
                decisionComments = `${c.title}: ${c.details}`;
            }
        }

        await client.query(`
            INSERT INTO public."Publication Status History"
                (publication_id, previous_status, new_status, changed_by, changed_at, comments)
            VALUES ($1, $2, $3, $4, now(), $5)
        `, [req.params.id, previousStatus, normalizedStatus, changedBy, decisionComments || `Status updated to ${normalizedStatus}`]);

        // Fetch student & reviewer details for email notification
        const notifyDetails = await client.query(`
            SELECT 
                pub.title, 
                pub.publication_reference, 
                u.email AS student_email, 
                u.firstname AS student_firstname, 
                u.surname AS student_surname,
                l.firstname AS reviewer_firstname,
                l.surname AS reviewer_surname
            FROM public."Publications" pub
            JOIN public."Users" u ON pub.submitted_by = u.user_id
            LEFT JOIN public."Users" l ON l.user_id = $2
            WHERE pub.publication_id = $1
            LIMIT 1
        `, [req.params.id, changedBy]);

        await client.query("COMMIT");

        // Send email notification to student via MailHog
        const pubInfo = notifyDetails.rows[0];
        if (pubInfo && pubInfo.student_email) {
            const studentName = `${pubInfo.student_firstname || ''} ${pubInfo.student_surname || ''}`.trim();
            const reviewerName = `${pubInfo.reviewer_firstname || ''} ${pubInfo.reviewer_surname || ''}`.trim() || 'Assigned Lecturer';
            emailService.sendReviewDecisionNotification({
                studentEmail: pubInfo.student_email,
                studentName,
                title: pubInfo.title,
                reference: pubInfo.publication_reference,
                status: normalizedStatus,
                comments: decisionComments,
                reviewerName,
            }).catch(err => console.error('[Notification] Review decision email error:', err.message));
        }

        return res.status(200).json(result.rows[0]);
    } catch (err) {
        if (client) {
            await client.query("ROLLBACK").catch(() => {});
        }
        console.error({ err: err.message });
        return res.status(500).json({ error: err.message });
    } finally {
        if (client) client.release();
    }
};

// Get publication file (stream PDF)
exports.getPubFile = async (req, res) => {
    // Guests and Students may only download files of approved publications; Staff may download any
    const userRoles = (req.user?.roles || []).map(r => r.toLowerCase());
    const isStaff = userRoles.some(r => r === 'lecturer' || r === 'reviewer' || r === 'admin');
    const sql = `
        SELECT f.original_filename, f.stored_filename
        FROM "Publication File" f
        JOIN "Publications" p ON p.publication_id = f.publication_id
        WHERE f.publication_id = $1
          AND ($2::boolean OR LOWER(p.status) = 'approved')
        ORDER BY f.uploaded_at DESC
        LIMIT 1`;

    try {
        const result = await db.query(sql, [req.params.id, isStaff]);

        if (result.rowCount === 0)
            return res.status(404).json({ message: "The publication file was not found" });

        const { original_filename, stored_filename } = result.rows[0];

        const uploadDir = path.resolve(__dirname, "../../uploads");
        const filePath = path.join(uploadDir, path.basename(stored_filename));

        if (!fs.existsSync(filePath))
            return res.status(404).json({ message: "The publication file is missing." });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(original_filename)}`);
        const stream = fs.createReadStream(filePath);
        stream.on("error", (streamErr) => {
            console.error("File stream error:", streamErr.message);
            if (!res.headersSent) {
                res.status(500).json({ message: "We failed to load the publication file" });
            } else {
                res.destroy(streamErr);
            }
        });
        stream.pipe(res);
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

    const reviewerId = (req.user?.id || '').substring(0, 50) || null;

    try {
        const pubCheck = await db.query(
            `SELECT submitted_by FROM public."Publications" WHERE publication_id = $1`,
            [req.params.id]
        );
        if (pubCheck.rowCount === 0) {
            return res.status(404).json({ message: "The publication you are commenting on does not exist." });
        }
        if (reviewerId && pubCheck.rows[0].submitted_by === reviewerId) {
            return res.status(403).json({
                message: "You cannot add review comments to your own publication. Another lecturer must review it."
            });
        }

        const result = await db.query(sql, [req.params.id, reviewerId, title, details]);
        return res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error({ message: err.message });
        if (err.code === '23503') {
            return res.status(404).json({ message: "The publication you are commenting on does not exist." });
        }
        if (err.code === '22001') {
            return res.status(400).json({ message: "Comment title must not exceed 150 characters." });
        }
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

    // Use the explicit submittedBy Student ID if provided, or fall back to the signed-in user's DB ID
    const requestedSubmitter = typeof submittedBy === 'string' ? submittedBy.trim() : '';
    const tokenSubmitter = req.user?.registered ? req.user.id : (req.user?.id || '');
    const cleanSubmittedBy = (requestedSubmitter || tokenSubmitter || '').trim();
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
        s.firstname AS student_firstname,
        s.surname AS student_surname,
        s.email AS student_email,
        s.role,
        s.supervisor_id,
        s.academic_level,
        l.firstname AS lecturer_firstname,
        l.surname AS lecturer_surname,
        l.email AS lecturer_email,
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
    let roleLower = (user.role || '').trim().toLowerCase();
    if (roleLower.includes('admin')) roleLower = 'admin'; // e.g. "System Admin"

    if (roleLower !== 'student' && roleLower !== 'admin' && roleLower !== 'lecturer' && roleLower !== 'reviewer') {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(403).json({
        success: false,
        message: 'Only students, lecturers, and administrators can submit publications through this form.'
      });
    }

    // Enforce rule for Lecturers: Lecturers only submit Journal Articles or Conference Papers (no Thesis or Dissertation)
    if ((roleLower === 'lecturer' || roleLower === 'reviewer') && (cleanPubType === 'Thesis' || cleanPubType === 'Dissertation')) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: 'Lecturers can only submit Journal Articles or Conference Papers. Theses and Dissertations are reserved for graduate students.'
      });
    }

    // Enforce rule from Users.academic_level in the database:
    // Master's students see/submit Thesis; PhD students see/submit Dissertation
    const dbLevel = (user.academic_level || '').toLowerCase();
    const fallbackLevel = (req.body.studentLevel || req.body.academicLevel || '').toLowerCase();
    const effectiveLevel = dbLevel || fallbackLevel;
    const isMasters = effectiveLevel.includes('master');
    const isPhd = effectiveLevel.includes('phd') || effectiveLevel.includes('doc');

    if (isMasters && cleanPubType === 'Dissertation') {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: "Dissertations are reserved for PhD students. Master's students must submit a Thesis."
      });
    }

    if (isPhd && cleanPubType === 'Thesis') {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: "Theses are reserved for Master's students. PhD students must submit a Dissertation."
      });
    }

    let academicLevelToSave = user.academic_level || null;
    if (!academicLevelToSave) {
      if (cleanPubType === 'Thesis' || isMasters) {
        academicLevelToSave = "Master's";
      } else if (cleanPubType === 'Dissertation' || isPhd) {
        academicLevelToSave = "PhD";
      }
    }

    // If submitter is a lecturer, assign ANOTHER lecturer to review it (never self-review)
    if (roleLower === 'lecturer' || roleLower === 'reviewer') {
      if (!user.supervisor_id || user.supervisor_id === user.user_id) {
        const peerLecturer = await client.query(
          `SELECT user_id, role, firstname, surname, email
           FROM "Users"
           WHERE LOWER(role) IN ('lecturer', 'reviewer')
             AND user_id <> $1
           ORDER BY user_id ASC
           LIMIT 1`,
          [user.user_id]
        );

        if (peerLecturer.rows.length > 0) {
          user.supervisor_id = peerLecturer.rows[0].user_id;
          user.supervisor_role = peerLecturer.rows[0].role;
          user.lecturer_firstname = peerLecturer.rows[0].firstname;
          user.lecturer_surname = peerLecturer.rows[0].surname;
          user.lecturer_email = peerLecturer.rows[0].email;
        } else {
          await client.query('ROLLBACK');
          transactionStarted = false;

          return res.status(400).json({
            success: false,
            message: 'Another lecturer is required to review your publication, but no other lecturer was found.'
          });
        }
      }
    } else if (!user.supervisor_id || user.supervisor_role?.toLowerCase() !== 'lecturer') {
      const defaultLecturer = await client.query(`SELECT user_id, role, firstname, surname, email FROM "Users" WHERE LOWER(role) = 'lecturer' LIMIT 1`);
      if (defaultLecturer.rows.length > 0) {
        user.supervisor_id = defaultLecturer.rows[0].user_id;
        user.supervisor_role = defaultLecturer.rows[0].role;
        user.lecturer_firstname = defaultLecturer.rows[0].firstname;
        user.lecturer_surname = defaultLecturer.rows[0].surname;
        user.lecturer_email = defaultLecturer.rows[0].email;
      } else {
        await client.query('ROLLBACK');
        transactionStarted = false;

        return res.status(400).json({
          success: false,
          message: 'No valid lecturer is assigned to this student.'
        });
      }
    }

    // Save academic level for student user if not set yet
    if (roleLower === 'student' && !user.academic_level && academicLevelToSave) {
      await client.query(
        `UPDATE public."Users" SET academic_level = $1 WHERE user_id = $2`,
        [academicLevelToSave, user.user_id]
      );
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
        lecturer_id,
        academic_level
      )
      VALUES (
        $1, $2, $3, $4, NOW(), NOW(), NOW(),
        $5, $6, $7, $8, $9, $10
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
        user.supervisor_id,
        academicLevelToSave
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

    // Send email notification to the student (and assigned lecturer) via MailHog
    const studentFullName = `${user.student_firstname || ''} ${user.student_surname || ''}`.trim() || user.user_id;
    const lecturerFullName = `${user.lecturer_firstname || ''} ${user.lecturer_surname || ''}`.trim() || user.supervisor_id;

    if (user.student_email) {
      emailService.sendSubmissionConfirmation({
        studentEmail: user.student_email,
        studentName: studentFullName,
        title: cleanTitle,
        reference: publicationReference,
        publicationType: cleanPubType,
        academicLevel: academicLevelToSave,
        lecturerName: lecturerFullName,
        lecturerEmail: user.lecturer_email,
      }).catch(err => console.error('[Notification] Student submission email error:', err.message));
    }

    if (user.lecturer_email) {
      emailService.sendLecturerAssignmentNotification({
        lecturerEmail: user.lecturer_email,
        lecturerName: lecturerFullName,
        studentName: studentFullName,
        studentEmail: user.student_email,
        title: cleanTitle,
        reference: publicationReference,
        publicationType: cleanPubType,
      }).catch(err => console.error('[Notification] Lecturer assignment email error:', err.message));
    }

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
