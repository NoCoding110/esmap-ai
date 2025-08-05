import type { ApiResponse } from '../types';
import { Logger } from './logger';

export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  
  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'ApiError';
  }
}

export function handleError(error: unknown, logger: Logger): Response {
  const requestId = logger.getRequestId();
  
  if (error instanceof ApiError) {
    logger.error(`API Error: ${error.message}`, {
      statusCode: error.statusCode,
      code: error.code,
      stack: error.stack
    });
    
    const response: ApiResponse = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      requestId
    };
    
    return Response.json(response, { status: error.statusCode });
  }
  
  logger.error(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`, {
    error: error instanceof Error ? error.stack : error
  });
  
  const response: ApiResponse = {
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
    requestId
  };
  
  return Response.json(response, { status: 500 });
}

export function createSuccessResponse<T>(data: T, requestId: string): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    requestId
  };
}