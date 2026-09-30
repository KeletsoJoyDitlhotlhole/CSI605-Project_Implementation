const pool = require('../config/database');
const crypto = require('crypto');

const submitPublication = async (req, res) => {
  const client = await pool.connect();

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

module.exports = {
  submitPublication
};