import express from "express";
import dotenv from "dotenv";
import { errorHandler, AppError, asyncHandler } from './src/errors/index.js';


// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(errorHandler);
app.use(express.json());



// Routes
  // Example route with error handling
  app.get('/api/resource', asyncHandler(async (req, res) => {
    const resource = await findResource();
    if (!resource) {
      throw new AppError('Resource not found', 404);
    }
    res.json(resource);
  }));
  
  // Handle 404 routes
  app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    process.exit(1);
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    server.close(() => {
      process.exit(1);
    });
  });



// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on: https://localhost:${PORT}`);
});


