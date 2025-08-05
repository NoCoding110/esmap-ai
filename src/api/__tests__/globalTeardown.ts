/**
 * Jest Global Teardown
 * Runs once after all tests complete
 */

export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');
  
  // Clean up any global test resources
  console.log('✅ Test environment cleanup complete');
}