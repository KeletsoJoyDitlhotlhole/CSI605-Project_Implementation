// Import required modules
const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Initialize the app
const app = express();
const port = process.env.PORT || 3000; // Port variable should be set on the .env file if not default to 3000

// import routes
const publicationsRoutes = require("./routes/publication.routes");
const { log } = require("node:console");

// Add middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Mount routes/endpoints
app.use(publicationsRoutes);

// Multer errors
app.use((err, req, res, next) => {
    res.status(400).json({error: err.message});
});

// Start server
app.listen(port, err => {
    if (err) {
        throw err;
    }
    
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`Test url here: http://localhost:${port}`);
});