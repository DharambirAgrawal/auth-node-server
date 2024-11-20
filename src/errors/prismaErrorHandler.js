// utils/errors/PrismaErrorHandler.js
import { Prisma } from '@prisma/client';
import { DatabaseError } from './databaseErrors.js';

export class PrismaErrorHandler {
  static handle(error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle known Prisma errors
      switch (error.code) {
        case 'P2002':
          return new DatabaseError('User already Exists!');
        case 'P2014':
          return new DatabaseError('Invalid ID. The record you\'re trying to relate does not exist.');
        case 'P2003':
          return new DatabaseError('Foreign key constraint failed.');
        case 'P2025':
          return new DatabaseError('Record not found.');
        default:
          return new DatabaseError(`Database error: ${error.message}`);
      }
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return new DatabaseError('Invalid data provided to database operation.');
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return new DatabaseError('Failed to initialize database connection.');
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      return new DatabaseError('An unexpected database error occurred.');
    }

    // If it's not a Prisma error, return the original error
    return error;
  }
}
