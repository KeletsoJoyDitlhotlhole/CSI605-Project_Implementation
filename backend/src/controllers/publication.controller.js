// publication.controller.js

const db = require("../config/database");
const crypto = require("crypto")
const fs = require("fs");
const path = require("path");

// Publication statuses that will need attention from a reviwer
const REVIEW_STATUSES = ["submitted", "pending", "rejected"];

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
exports.getReviewList = async (req, res) => {
    // get page number from query string
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    // get maximux number you 
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 30);

    // set the offset
    const offset = (page - 1) * limit;

    const sqlList = `
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
        WHERE
            pub.status = ANY($1)
        ORDER BY 
            created_at 
        DESC
        LIMIT $2 OFFSET $3`;

    const sqlCount = `SELECT COUNT(*)::int AS total FROM public."Publications" WHERE status = ANY($1)`;

    try {
        // const result = await db.query(sql, [REVIEW_STATUSES]);
        // return res.status(200).json({
        //     total: result.rowCount,
        //     publications: result.rows
        // });
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
        })
    } catch (err) {
        console.error({error: err.message});
        return res.status(500).json({error: err.message});
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

    // server side data
    const username = "U0000001";
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
exports.updatePubStatus = async (req, res) => {
    const { status } = req.body;

    const sql = `
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

    try {
        const result = await db.query(sql, [status, req.params.id]);

        if (result.rowCount === 0) {
            return res.status(404).json({error: "The publication you are looking for does not exist"});
        }

        return res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error({err: err.message});
        return res.status(500).json({error: err.message});
    }
}

// Get publication file
exports.getPubFile = async (req, res) => {
    const sql = `SELECT original_filename, stored_filename FROM "Publication File" WHERE publication_id = $1 ORDER BY uploaded_at DESC LIMIT 1`;

    try {
        const result = await db.query(sql, [req.params.id]);

        if (result.rowCount === 0)
            return res.status(404)
                    .json({message: "The publication file was not found"});

        const {original_filename, stored_filename } = result.rows[0];

        // prepare the file
        const uploadDir = path.resolve(__dirname, "../../uploads");
        console.log(uploadDir);
        const filePath = path.join(uploadDir, path.basename(stored_filename));

        if (!fs.existsSync(filePath))
            return res.status(404).
                    json({message: "The publication file is missing."});

        // set response hearders for the file
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
    const details = (req.body.details).trim();

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

    // placeholder value, remove or comment out after implementing authentication
    const reviewerId = 1;

    try {
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

// Alternate submitPublication implementation
exports.submitPublication = async (req, res) => {
  const client = await db.connect();

  try {
    const {
      title,
      abstract,
      keywords,
      submittedBy,
      authors
    } = req.body;

    // Basic validation
    if (!title || !abstract || !keywords || !submittedBy || !authors) {
      return res.status(400).json({
        success: false,
        message: 'Title, abstract, keywords, submittedBy and authors are required.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Publication PDF file is required.'
      });
    }

    // Convert authors to an array
    let authorList;

    try {
      authorList = typeof authors === 'string'
        ? JSON.parse(authors)
        : authors;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid authors format.'
      });
    }

    if (!Array.isArray(authorList) || authorList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one author is required.'
      });
    }

    await client.query('BEGIN');

    const publicationId = `PUB-${Date.now()}`;

    const publicationReference =
      `UB-PUB-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Insert publication
    await client.query(
      `
      INSERT INTO "Publications"
      (
        abstract,
        keywords,
        submitted_by,
        status,
        created_at,
        updated_at,
        submitted_at,
        publication_id,
        publication_reference,
        title
      )
      VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW(), $5, $6, $7)
      `,
      [
        abstract,
        keywords,
        submittedBy,
        'SUBMITTED',
        publicationId,
        publicationReference,
        title
      ]
    );

    // Insert authors
    for (let i = 0; i < authorList.length; i++) {
      const author = authorList[i];

      const publicationAuthorId =
        `AUTH-${Date.now()}-${i}-${Math.round(Math.random() * 10000)}`;

      await client.query(
        `
        INSERT INTO "Publication Author"
        (
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
          publicationAuthorId,
          author
        ]
      );
    }

    // Insert uploaded file information
    const fileId =
      `FILE-${Date.now()}-${Math.round(Math.random() * 10000)}`;

    await client.query(
      `
      INSERT INTO "Publication File"
      (
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
        submittedBy
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Publication submitted successfully.',
      publication: {
        publicationId,
        publicationReference,
        status: 'SUBMITTED'
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Publication submission error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to submit publication.',
      error: error.message
    });

  } finally {
    client.release();
  }
};
