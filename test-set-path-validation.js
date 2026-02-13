#!/usr/bin/env node
/**
 * Test script to verify Zod validation in set-path API
 * Run this after the dev server is running on localhost:3000
 */

const testCases = [
  {
    name: 'Valid UUID',
    body: { learning_path_id: '550e8400-e29b-41d4-a716-446655440000' },
    expectedStatus: 401, // Will be unauthorized without auth, but passes validation
  },
  {
    name: 'Valid null (reset path)',
    body: { learning_path_id: null },
    expectedStatus: 401, // Will be unauthorized without auth, but passes validation
  },
  {
    name: 'Invalid - not a UUID',
    body: { learning_path_id: 'not-a-uuid' },
    expectedStatus: 400, // Should fail validation
  },
  {
    name: 'Invalid - number instead of string',
    body: { learning_path_id: 123 },
    expectedStatus: 400, // Should fail validation
  },
  {
    name: 'Invalid - empty string',
    body: { learning_path_id: '' },
    expectedStatus: 400, // Should fail validation
  },
  {
    name: 'Invalid - missing field',
    body: {},
    expectedStatus: 400, // Should fail validation
  },
];

async function runTests() {
  console.log('Testing /api/learning/set-path validation...\n');

  for (const testCase of testCases) {
    try {
      const response = await fetch('http://localhost:3000/api/learning/set-path', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.body),
      });

      const data = await response.json();
      const status = response.status;

      const passed = status === testCase.expectedStatus;
      const icon = passed ? '✓' : '✗';

      console.log(`${icon} ${testCase.name}`);
      console.log(`  Expected: ${testCase.expectedStatus}, Got: ${status}`);
      if (!passed || status === 400) {
        console.log(`  Response:`, JSON.stringify(data, null, 2));
      }
      console.log('');
    } catch (error) {
      console.log(`✗ ${testCase.name} - Error: ${error.message}\n`);
    }
  }
}

runTests().catch(console.error);
