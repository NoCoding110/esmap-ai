/**
 * Error Handler for Forecasting Models
 */

export class ErrorHandler {
  constructor() {
    this.errorTypes = {
      VALIDATION_ERROR: { status: 400, code: 'VALIDATION_ERROR' },
      TRAINING_ERROR: { status: 500, code: 'TRAINING_ERROR' },
      INFERENCE_ERROR: { status: 500, code: 'INFERENCE_ERROR' },
      MODEL_NOT_FOUND: { status: 404, code: 'MODEL_NOT_FOUND' },
      INSUFFICIENT_DATA: { status: 400, code: 'INSUFFICIENT_DATA' },
      ACCURACY_THRESHOLD_NOT_MET: { status: 422, code: 'ACCURACY_THRESHOLD_NOT_MET' },
      CROSS_VALIDATION_ERROR: { status: 500, code: 'CROSS_VALIDATION_ERROR' },
      AB_TEST_ERROR: { status: 500, code: 'AB_TEST_ERROR' },
      TIMEOUT_ERROR: { status: 504, code: 'TIMEOUT_ERROR' },
      RESOURCE_LIMIT_ERROR: { status: 429, code: 'RESOURCE_LIMIT_ERROR' }
    };
  }

  handleError(error) {
    console.error('Error occurred:', error);

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

    if (message.includes('training') && message.includes('failed')) {
      return 'TRAINING_ERROR';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'VALIDATION_ERROR';
    }
    if (message.includes('insufficient data') || message.includes('minimum') && message.includes('required')) {
      return 'INSUFFICIENT_DATA';
    }
    if (message.includes('accuracy') && message.includes('threshold')) {
      return 'ACCURACY_THRESHOLD_NOT_MET';
    }
    if (message.includes('not found')) {
      return 'MODEL_NOT_FOUND';
    }
    if (message.includes('cross-validation')) {
      return 'CROSS_VALIDATION_ERROR';
    }
    if (message.includes('a/b test') || message.includes('ab test')) {
      return 'AB_TEST_ERROR';
    }
    if (message.includes('timeout')) {
      return 'TIMEOUT_ERROR';
    }
    if (message.includes('limit') || message.includes('quota')) {
      return 'RESOURCE_LIMIT_ERROR';
    }

    return 'INFERENCE_ERROR';
  }

  getUserFriendlyMessage(error, errorType) {
    const messages = {
      VALIDATION_ERROR: 'Invalid input provided. Please check your request format and data quality.',
      TRAINING_ERROR: 'Model training failed. Please check your training data and hyperparameters.',
      INFERENCE_ERROR: 'An error occurred during forecasting. Please try again.',
      MODEL_NOT_FOUND: 'The requested forecasting model could not be found.',
      INSUFFICIENT_DATA: 'Insufficient historical data for reliable forecasting. Please provide more data points.',
      ACCURACY_THRESHOLD_NOT_MET: 'Trained model did not meet the required accuracy threshold.',
      CROSS_VALIDATION_ERROR: 'Cross-validation failed. Please check your validation configuration.',
      AB_TEST_ERROR: 'A/B testing failed. Please verify model IDs and test data.',
      TIMEOUT_ERROR: 'Request timed out. Try with smaller datasets or simpler models.',
      RESOURCE_LIMIT_ERROR: 'Resource limits exceeded. Please reduce request size or try again later.'
    };

    return messages[errorType] || error.message;
  }

  getErrorDetails(error) {
    const details = {
      type: error.constructor.name,
      message: error.message
    };

    // Add specific details based on error type
    if (error.code) details.code = error.code;
    if (error.data) details.data = error.data;

    return details;
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}