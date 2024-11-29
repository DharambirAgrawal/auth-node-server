// src/server.js
import dotenv from "dotenv";
import cors from 'cors'
dotenv.config();
import express from "express";
import { errorHandler, AppError } from './src/errors/index.js';
import { logger } from "./src/utils/logger.js";

// Load environment variables

const app = express();

//connect DB
// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();


// Middleware
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger)


//for static files
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.set('view engine', 'ejs'); // Set EJS as the template engine
app.set('views', path.join(__dirname, '/public/view')); // Folder for EJS files
app.use(express.static(path.join(__dirname, 'public')));



// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Server is healthy' });
});



//routes
import { authRouter } from './src/routes/authRoutes.js';

app.use("/api/auth", authRouter);



//Handling succcess page
app.use("/api/success",(req,res)=>{
  res.render('success');
})

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