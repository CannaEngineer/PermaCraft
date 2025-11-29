const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');

const db = new Database(path.join(__dirname, 'auth.db'));

// Create tables if they don't exist (Better Auth schema)
db.exec(`
  CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    emailVerified INTEGER DEFAULT 0,
    name TEXT,
    image TEXT,
    password TEXT,
    createdAt INTEGER DEFAULT (unixepoch() * 1000),
    updatedAt INTEGER DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    expiresAt INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    createdAt INTEGER DEFAULT (unixepoch() * 1000),
    updatedAt INTEGER DEFAULT (unixepoch() * 1000),
    FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
  );
`);

// Create test user
const userId = crypto.randomUUID();
const email = 'test@example.com';
const password = 'password123';
const name = 'Test User';

// Hash the password
const hashedPassword = bcrypt.hashSync(password, 10);
const now = Date.now();

// Insert user
const stmt = db.prepare(`
  INSERT INTO user (id, email, name, password, emailVerified, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, 1, ?, ?)
`);

try {
  stmt.run(userId, email, name, hashedPassword, now, now);
  console.log('✅ Test user created successfully!');
  console.log('');
  console.log('📧 Email:    test@example.com');
  console.log('🔑 Password: password123');
  console.log('');
  console.log('You can now login at: http://localhost:3000/login');
} catch (error) {
  if (error.message.includes('UNIQUE constraint')) {
    console.log('ℹ️  User already exists');
    console.log('');
    console.log('📧 Email:    test@example.com');
    console.log('🔑 Password: password123');
  } else {
    console.error('❌ Error creating user:', error.message);
  }
}

db.close();
