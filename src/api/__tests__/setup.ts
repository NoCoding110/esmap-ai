/**
 * Jest Test Setup
 * Global test configuration and mocks
 */

import { jest } from '@jest/globals';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Mock fetch globally
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn((key: string) => null),
  setItem: jest.fn((key: string, value: string) => {}),
  removeItem: jest.fn((key: string) => {}),
  clear: jest.fn(() => {}),
  length: 0,
  key: jest.fn((index: number) => null)
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock indexedDB
const indexedDBMock = {
  open: jest.fn(() => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null
  })),
  deleteDatabase: jest.fn()
};

Object.defineProperty(window, 'indexedDB', {
  value: indexedDBMock
});

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now())
  }
});

// Set up global test timeout
jest.setTimeout(30000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});