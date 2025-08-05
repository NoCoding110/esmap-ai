/**
 * Error Handler
 * Centralized error handling with proper status codes and messages
 */

export class ErrorHandler {
  constructor() {
    this.errorTypes = {
      VALIDATION_ERROR: { status: 400, code: 'VALIDATION_ERROR' },
      MODEL_NOT_FOUND: { status: 404, code: 'MODEL_NOT_FOUND' },
      INFERENCE_ERROR: { status: 500, code: 'INFERENCE_ERROR' },
      TIMEOUT_ERROR: { status: 504, code: 'TIMEOUT_ERROR' },
      RATE_LIMIT_ERROR: { status: 429, code: 'RATE_LIMIT_ERROR' },
      AUTHENTICATION_ERROR: { status: 401, code: 'AUTHENTICATION_ERROR' },
      AUTHORIZATION_ERROR: { status: 403, code: 'AUTHORIZATION_ERROR' },
      SERVICE_UNAVAILABLE: { status: 503, code: 'SERVICE_UNAVAILABLE' }
    };
  }

  handleError(error) {
    console.error('Error occurred:', error);

    // Determine error type
    const errorType = this.classifyError(error);
    const errorInfo = this.errorTypes[errorType] || this.errorTypes.INFERENCE_ERROR;

    return {
      status: errorInfo.status,
      code: errorInfo.code,
      message: this.getUserFriendlyMessage(error, errorType),
      details: this.getErrorDetails(error),
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId()
    };
  }

  classifyError(error) {
    const message = error.message.toLowerCase();

    if (message.includes('timeout')) {
      return 'TIMEOUT_ERROR';
    }
    if (message.includes('not found')) {
      return 'MODEL_NOT_FOUND';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'VALIDATION_ERROR';
    }
    if (message.includes('rate limit')) {
      return 'RATE_LIMIT_ERROR';
    }
    if (message.includes('unauthorized')) {
      return 'AUTHENTICATION_ERROR';
    }
    if (message.includes('forbidden')) {
      return 'AUTHORIZATION_ERROR';
    }
    if (message.includes('unavailable')) {
      return 'SERVICE_UNAVAILABLE';
    }

    return 'INFERENCE_ERROR';
  }

  getUserFriendlyMessage(error, errorType) {
    const messages = {
      VALIDATION_ERROR: 'Invalid input provided. Please check your request format.',
      MODEL_NOT_FOUND: 'The requested model could not be found.',
      INFERENCE_ERROR: 'An error occurred during model inference. Please try again.',
      TIMEOUT_ERROR: 'The request timed out. Try with smaller input or simpler query.',
      RATE_LIMIT_ERROR: 'Too many requests. Please slow down and try again later.',
      AUTHENTICATION_ERROR: 'Authentication required. Please provide valid credentials.',
      AUTHORIZATION_ERROR: 'You do not have permission to access this resource.',
      SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again later.'
    };

    return messages[errorType] || error.message;
  }

  getErrorDetails(error) {
    // In production, sanitize error details
    const details = {
      type: error.constructor.name,
      message: error.message
    };

    // Add stack trace in development only
    if (process.env.NODE_ENV === 'development') {
      details.stack = error.stack;
    }

    return details;
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  createErrorResponse(error) {
    const errorData = this.handleError(error);
    
    return new Response(JSON.stringify({
      success: false,
      error: errorData
    }), {
      status: errorData.status,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': errorData.requestId
      }
    });
  }
}