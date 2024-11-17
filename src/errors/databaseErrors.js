  // src/errors/databaseErrors.js
  import { AppError } from "./AppError.js";
  export class DatabaseError extends AppError {
    constructor(message) {
      super(message || 'Database Error', 500);
      this.isDatabaseError = true;
    }
  }