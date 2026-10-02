const multer = require("multer");
const path = require("path");
const crypto = require("crypto")

// Where to save physical files
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, "../../uploads")),
    filename: (req, file, cb) => {
        const randomName = crypto.randomBytes(8).toString("hex");
        cb(null, randomName, path.extname(file.originalname));
    }
});

// the uploader
const upload = multer({
    storage: storage,
    limits: {fileSize: 100 * 1024 * 1024},
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== "application/pdf") {
            return cb(new Error("Only PDF files are allowed"));
        }

        cb(null, true);
    }
});

module.exports = upload;