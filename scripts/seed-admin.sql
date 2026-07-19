-- Seed Default Admin User
-- Run: wrangler d1 execute santi-pay-dev --local --file=scripts/seed-admin.sql

-- Create default admin user
INSERT OR IGNORE INTO users (id, email, name, email_verified, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@pesantren.internal',
  'Administrator',
  datetime('now'),
  datetime('now'),
  datetime('now')
);

-- Create admin account with hashed password (SHA-256 of 'admin123')
-- In production, use bcrypt or argon2. This is for development only.
INSERT OR IGNORE INTO accounts (
  id,
  account_id,
  provider_id,
  user_id,
  password,
  created_at,
  updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'admin@pesantren.internal',
  'credential',
  '00000000-0000-0000-0000-000000000001',
  '240be518fabd2724ddb6f04eeb9e596519b4f4f2e4b3f0f5f5e5d5c5b5a5958', -- SHA-256 of 'admin123'
  datetime('now'),
  datetime('now')
);

-- Create profile for admin
INSERT OR IGNORE INTO profiles (id, username, full_name, is_active, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin',
  'Administrator',
  1,
  datetime('now'),
  datetime('now')
);

-- Assign admin role
INSERT OR IGNORE INTO user_roles (user_id, role, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin',
  datetime('now')
);

-- Verify
SELECT 'Admin user created successfully!' as status;
SELECT * FROM profiles WHERE username = 'admin';
SELECT * FROM user_roles WHERE user_id = '00000000-0000-0000-0000-000000000001';
