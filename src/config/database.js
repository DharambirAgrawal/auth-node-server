import mongoose from "mongoose";
import logger from "../utils/logger.js";

const connectToDatabase = async (projectId) => {
  try {
    const dbName = `auth_${projectId}`;
    const dbUri = `${process.env.MONGO_URI}/${dbName}`;

    const connection = await mongoose.connect(dbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info(`MongoDB connected: ${connection.connection.host}`);
    return connection;
  } catch (error) {
    logger.error("Error connecting to database:", error.message);
    throw error;
  }
};

const closeDatabaseConnection = async () => {
  try {
    await mongoose.connection.close();
    logger.info("Database connection closed");
  } catch (error) {
    logger.error("Error closing database connection:", error.message);
    throw error;
  }
};

export { connectToDatabase, closeDatabaseConnection };
