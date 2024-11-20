  // src/errors/errorHandler.js
  export const errorHandler = (err, req, res, next) => {
    const processedError = PrismaErrorHandler.handle(err);
  
    processedError.statusCode = processedError.statusCode || 500;
    processedError.status = processedError.status || 'error';
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
  
    const handleDevelopmentError = (err) => {
      return res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
      });
    };
  
    const handleProductionError = (err) => {
      // Operational, trusted error: send message to client
      if (err.isOperational) {
        return res.status(err.statusCode).json({
          status: err.status,
          message: err.message
        });
      }
      // Programming or other unknown error: don't leak error details
      console.error('ERROR 💥:', err);
      return res.status(500).json({
        status: 'error',
        message: 'Something went wrong!'
      });
    };
  
    if (process.env.NODE_ENV === 'development') {
      handleDevelopmentError(err);
    } else {
      handleProductionError(err);
    }
  };
 