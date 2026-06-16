CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'engineer' CHECK (role IN ('engineer', 'team_lead', 'admin')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_types (
  id SERIAL PRIMARY KEY,
  label VARCHAR(100) NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS systems (
  id SERIAL PRIMARY KEY,
  label VARCHAR(100) NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  type_id INTEGER REFERENCES task_types(id),
  requestor VARCHAR(100) NOT NULL,
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'on_hold')),
  assigned_to INTEGER REFERENCES users(id),
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deployments (
  id SERIAL PRIMARY KEY,
  cr_number VARCHAR(50) UNIQUE NOT NULL,
  requestor VARCHAR(100) NOT NULL,
  system_id INTEGER REFERENCES systems(id),
  scheduled_date TIMESTAMPTZ,
  release_note_path VARCHAR(500),
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready_to_deploy', 'deployed', 'overdue', 'on_hold', 'rolled_back')),
  notes TEXT,
  deployed_by INTEGER REFERENCES users(id),
  deployed_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO task_types (label) VALUES
  ('Production Access'),
  ('Service restart'),
  ('Troubleshooting'),
  ('Database Task'),
  ('UAT deployment'),
  ('SIT deployment'),,
  ('Other')
ON CONFLICT (label) DO NOTHING;

INSERT INTO systems (label) VALUES
  ('FS'),
  ('Newgen'),
  ('PlatformX'),
  ('SME'),
  ('Outsystems'),
  ('Oracle')
ON CONFLICT (label) DO NOTHING;
