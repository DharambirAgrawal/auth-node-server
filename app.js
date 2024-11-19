// src/server.js
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { errorHandler, AppError, asyncHandler } from './src/errors/index.js';
import { logger } from "./src/utils/logger.js";

// Load environment variables

const app = express();

//connect DB
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export {prisma}
// const newUser = await prisma.user.create({
//   data: { name:"Dharamfbir", email:"df@gmail.com" },
// });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger)

// Security Headers (Optional but recommended)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'deny');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Server is healthy' });
});

// Example route with error handling
import { ValidationError,DatabaseError } from "./src/errors/index.js";
app.get('/api/resource', asyncHandler(async (req, res) => {
  const resource = undefined
  throw new DatabaseError('Failed to create user');
  // throw new ValidationError([
  //   { field: 'email', message: 'Email is required' },
  //   { field: 'password', message: 'Password is required' }
  // ]);
  if (!resource) {
    throw new AppError('Resource not found', 404);
  }
  res.json(resource);
}));


//routes
import { authRouter } from './src/routes/authRoutes.js';

app.use("/api/auth", authRouter);


// Handle 404 routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handling middleware (should be last)
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on: http://localhost:${PORT}`);
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

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated!');
  });
});

export default app;