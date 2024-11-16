import express from "express";
import dotenv from "dotenv";


// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(express.json());



// Routes


// Error handling middleware


// Catch-all route for undefined routes
app.all("*", (req, res, next) => {
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server!`,
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


