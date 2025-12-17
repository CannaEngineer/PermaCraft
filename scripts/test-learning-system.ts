/**
 * Learning System API Test Script
 *
 * This script tests all the learning system API endpoints.
 * Run with: npx tsx scripts/test-learning-system.ts
 *
 * Prerequisites:
 * - Server must be running (npm run dev)
 * - You must be logged in and have a session cookie
 * - Database must have seed data loaded
 */

const BASE_URL = 'http://localhost:3001';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  message?: string;
  duration: number;
}

const results: TestResult[] = [];

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name: string) {
  log(`\n🧪 Testing: ${name}`, 'cyan');
}

function logPass(message: string) {
  log(`  ✓ ${message}`, 'green');
}

function logFail(message: string) {
  log(`  ✗ ${message}`, 'red');
}

function logInfo(message: string) {
  log(`  ℹ ${message}`, 'blue');
}

async function makeRequest(
  path: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data?: any; error?: string }> {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = response.ok ? await response.json() : null;

    return {
      ok: response.ok,
      status: response.status,
      data,
      error: response.ok ? undefined : await response.text(),
    };
  } catch (error: any) {
    return {
      ok: false,
      status: 0,
      error: error.message,
    };
  }
}

async function test(
  name: string,
  fn: () => Promise<void>
): Promise<TestResult> {
  const start = Date.now();
  logTest(name);

  try {
    await fn();
    const duration = Date.now() - start;
    logPass(`Passed (${duration}ms)`);
    return { name, status: 'pass', duration };
  } catch (error: any) {
    const duration = Date.now() - start;
    logFail(`Failed: ${error.message}`);
    return { name, status: 'fail', message: error.message, duration };
  }
}

// Helper assertion functions
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${expected}, got ${actual}`
    );
  }
}

function assertExists(value: any, name: string) {
  if (!value) {
    throw new Error(`${name} should exist`);
  }
}

// Test Suite
async function runTests() {
  log('\n========================================', 'cyan');
  log('Learning System API Tests', 'cyan');
  log('========================================\n', 'cyan');

  // Check server is running
  logInfo('Checking if server is running...');
  const healthCheck = await makeRequest('/api/debug/env');
  if (!healthCheck.ok) {
    log('\n❌ Server is not running! Please start the server with: npm run dev\n', 'red');
    process.exit(1);
  }
  logPass('Server is running');

  // Test 1: Get Learning Paths
  results.push(
    await test('GET /api/learning/paths', async () => {
      const res = await makeRequest('/api/learning/paths');
      assert(res.ok, `Request failed with status ${res.status}`);
      assert(Array.isArray(res.data), 'Response should be an array');
      assert(res.data.length > 0, 'Should have at least one learning path');

      const path = res.data[0];
      assertExists(path.id, 'path.id');
      assertExists(path.name, 'path.name');
      assertExists(path.slug, 'path.slug');
      logInfo(`Found ${res.data.length} learning paths`);
    })
  );

  // Test 2: Get Topics
  results.push(
    await test('GET /api/learning/topics', async () => {
      const res = await makeRequest('/api/learning/topics');
      assert(res.ok, `Request failed with status ${res.status}`);
      assert(Array.isArray(res.data), 'Response should be an array');
      assert(res.data.length > 0, 'Should have at least one topic');

      const topic = res.data[0];
      assertExists(topic.id, 'topic.id');
      assertExists(topic.name, 'topic.name');
      assertExists(topic.slug, 'topic.slug');
      logInfo(`Found ${res.data.length} topics`);
    })
  );

  // Test 3: Get Badges (unauthenticated - should return all badges with earned: false)
  results.push(
    await test('GET /api/learning/badges (unauthenticated)', async () => {
      const res = await makeRequest('/api/learning/badges');
      assert(res.ok, `Request failed with status ${res.status}`);
      assert(Array.isArray(res.data), 'Response should be an array');
      assert(res.data.length > 0, 'Should have at least one badge');

      const badge = res.data[0];
      assertExists(badge.id, 'badge.id');
      assertExists(badge.name, 'badge.name');
      assertExists(badge.badge_type, 'badge.badge_type');
      assertEqual(badge.earned, false, 'Unauthenticated badges should have earned: false');
      logInfo(`Found ${res.data.length} badges`);
    })
  );

  // Test 4: Get Lesson by Slug
  results.push(
    await test('GET /api/learning/lessons/[slug]', async () => {
      // First get a lesson slug from database
      const topicsRes = await makeRequest('/api/learning/topics');
      assert(topicsRes.ok, 'Failed to get topics');

      // Find a topic that has lessons
      let topicWithLessons = null;
      let lessons = null;

      for (const topic of topicsRes.data) {
        const topicDetailRes = await makeRequest(`/api/learning/topics/${topic.slug}`);
        assert(topicDetailRes.ok, 'Failed to get topic details');

        if (topicDetailRes.data.lessons && topicDetailRes.data.lessons.length > 0) {
          topicWithLessons = topic;
          lessons = topicDetailRes.data.lessons;
          break;
        }
      }

      assert(topicWithLessons && lessons, 'Should find at least one topic with lessons');

      const lessonSlug = lessons[0].slug;
      const lessonRes = await makeRequest(`/api/learning/lessons/${lessonSlug}`);
      assert(lessonRes.ok, `Request failed with status ${lessonRes.status}`);

      assertExists(lessonRes.data.id, 'lesson.id');
      assertExists(lessonRes.data.title, 'lesson.title');
      assertExists(lessonRes.data.content, 'lesson.content');

      const content = JSON.parse(lessonRes.data.content);
      assertExists(content.core_content, 'content.core_content');
      logInfo(`Successfully loaded lesson: ${lessonRes.data.title}`);
    })
  );

  // Test 5: Create Practice Farm (requires authentication)
  let practiceFarmId: string | null = null;
  results.push(
    await test('POST /api/learning/practice-farms', async () => {
      const res = await makeRequest('/api/learning/practice-farms', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Practice Farm',
          description: 'Automated test farm',
          center_lat: 40.7128,
          center_lng: -74.006,
          zoom_level: 15,
        }),
      });

      if (res.status === 401) {
        throw new Error('Authentication required - Please log in to test authenticated endpoints');
      }

      assert(res.ok, `Request failed with status ${res.status}: ${res.error}`);
      assertExists(res.data.id, 'practice farm id');
      practiceFarmId = res.data.id;
      logInfo(`Created practice farm with id: ${practiceFarmId}`);
    })
  );

  // Test 6: Get Practice Farm by ID
  if (practiceFarmId) {
    results.push(
      await test('GET /api/learning/practice-farms/[id]', async () => {
        const res = await makeRequest(`/api/learning/practice-farms/${practiceFarmId}`);
        assert(res.ok, `Request failed with status ${res.status}`);
        assertEqual(res.data.id, practiceFarmId, 'Practice farm ID should match');
        assertExists(res.data.zones, 'Should have zones array');
        assertExists(res.data.plantings, 'Should have plantings array');
        logInfo(`Loaded practice farm: ${res.data.name}`);
      })
    );

    // Test 7: Add Zone to Practice Farm
    results.push(
      await test('POST /api/learning/practice-farms/[id]/zones', async () => {
        const res = await makeRequest(`/api/learning/practice-farms/${practiceFarmId}/zones`, {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test Zone',
            zone_type: 'zone_1',
            geometry: JSON.stringify({
              type: 'Polygon',
              coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
            }),
          }),
        });

        assert(res.ok, `Request failed with status ${res.status}: ${res.error}`);
        assertExists(res.data.id, 'zone.id');
        logInfo(`Created zone: ${res.data.name || res.data.zone_type}`);
      })
    );

    // Test 8: Delete Practice Farm
    results.push(
      await test('DELETE /api/learning/practice-farms/[id]', async () => {
        const res = await makeRequest(`/api/learning/practice-farms/${practiceFarmId}`, {
          method: 'DELETE',
        });

        assert(res.ok, `Request failed with status ${res.status}: ${res.error}`);
        assertEqual(res.data.success, true, 'Should return success: true');
        logInfo('Successfully deleted practice farm');
      })
    );
  }

  // Test 9: Get Contextual Hints
  results.push(
    await test('GET /api/learning/contextual-hints', async () => {
      const res = await makeRequest('/api/learning/contextual-hints?trigger=first_zone');

      if (res.status === 401) {
        throw new Error('Authentication required');
      }

      assert(res.ok, `Request failed with status ${res.status}`);
      // Hint might be null if user has dismissed it
      logInfo(res.data.hint ? `Found hint for first_zone trigger` : 'Hint already dismissed or not found');
    })
  );

  // Test 10: Get User Progress (requires authentication)
  results.push(
    await test('GET /api/learning/progress', async () => {
      const res = await makeRequest('/api/learning/progress');

      if (res.status === 401) {
        throw new Error('Authentication required');
      }

      assert(res.ok, `Request failed with status ${res.status}`);
      assertExists(res.data, 'progress data');
      logInfo(`User Level: ${res.data.current_level || 0}, Total XP: ${res.data.total_xp || 0}`);
    })
  );

  // Print summary
  log('\n========================================', 'cyan');
  log('Test Summary', 'cyan');
  log('========================================\n', 'cyan');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const total = results.length;

  log(`Total: ${total}`, 'blue');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');

  if (failed > 0) {
    log('\nFailed Tests:', 'red');
    results
      .filter(r => r.status === 'fail')
      .forEach(r => {
        log(`  • ${r.name}: ${r.message}`, 'red');
      });
  }

  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
  log(`\nTotal time: ${totalTime}ms\n`, 'blue');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log(`\nUnexpected error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
