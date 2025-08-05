/**
 * Jest Global Setup
 * Runs once before all tests
 */

export default async function globalSetup() {
  console.log('🧪 Setting up Energy Data API Integration test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.REACT_APP_EIA_API_KEY = 'test_key';
  
  // Initialize any global test resources
  console.log('✅ Test environment setup complete');
}