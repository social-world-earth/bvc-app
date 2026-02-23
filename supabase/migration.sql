-- BVC Vehicle Security Inspection App - Supabase Migration
-- Run this in the Supabase SQL Editor to set up the database schema
-- ============================================================

-- Enable UUID extension (usually enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Partners (vehicle leasing/rental companies)
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_person TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  address TEXT,
  agreement_start_date DATE,
  agreement_end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Branches (offices/locations)
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  region TEXT,
  address TEXT,
  manager_id UUID, -- FK added after users table
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (inspectors, supervisors, fleet managers, admins)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('inspector', 'supervisor', 'fleet_manager', 'admin')),
  branch_id UUID REFERENCES branches(id),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Now add FK from branches to users
ALTER TABLE branches ADD CONSTRAINT fk_branches_manager FOREIGN KEY (manager_id) REFERENCES users(id);

-- Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ownership_type TEXT NOT NULL CHECK (ownership_type IN ('bvc', 'partner')),
  partner_id UUID REFERENCES partners(id),
  chassis_number TEXT UNIQUE NOT NULL,
  registration_number TEXT UNIQUE NOT NULL,
  vehicle_type TEXT,
  make TEXT,
  model TEXT,
  year INTEGER,
  branch_id UUID NOT NULL REFERENCES branches(id),
  qr_code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'decommissioned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checklist templates
CREATE TABLE IF NOT EXISTS checklist_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT,
  display_order INTEGER,
  items TEXT NOT NULL, -- JSON array of {id, name} objects
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit schedules
CREATE TABLE IF NOT EXISTS audit_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  audit_type TEXT NOT NULL CHECK (audit_type IN ('daily', 'weekly', 'monthly', 'ad_hoc', 'routine', 'spot_check')),
  scope_branches TEXT, -- JSON array of branch UUIDs
  scope_vehicles TEXT, -- JSON array of vehicle UUIDs (optional)
  start_date DATE,
  end_date DATE,
  special_instructions TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  created_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit tasks (one per vehicle per schedule)
CREATE TABLE IF NOT EXISTS audit_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_schedule_id UUID REFERENCES audit_schedules(id),
  vehicle_id UUID REFERENCES vehicles(id),
  inspector_id UUID REFERENCES users(id),
  branch_id UUID REFERENCES branches(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  assigned_at TIMESTAMPTZ,
  deadline DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inspections
CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_task_id UUID REFERENCES audit_tasks(id),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  inspector_id UUID NOT NULL REFERENCES users(id),
  inspection_type TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  odometer_reading INTEGER,
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  inspector_signature TEXT,
  supervisor_id UUID REFERENCES users(id),
  supervisor_signature TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inspection items (checklist line items)
CREATE TABLE IF NOT EXISTS inspection_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  checklist_item_id TEXT,
  category TEXT,
  item_name TEXT,
  status TEXT CHECK (status IN ('pass', 'fail', 'needs_attention')),
  notes TEXT,
  photo_urls TEXT, -- JSON array of URLs
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents (vehicle papers)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  document_type TEXT NOT NULL CHECK (document_type IN ('RC', 'insurance', 'PUC', 'fitness')),
  document_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit templates (reusable schedule templates)
CREATE TABLE IF NOT EXISTS audit_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  audit_type TEXT NOT NULL,
  checklist_categories TEXT, -- JSON array
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  notification_type TEXT,
  title TEXT,
  message TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_vehicles_branch_status ON vehicles(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_vehicles_ownership ON vehicles(ownership_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_partner ON vehicles(partner_id);
CREATE INDEX IF NOT EXISTS idx_inspections_vehicle ON inspections(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_inspections_inspector ON inspections(inspector_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspections_audit_task ON inspections(audit_task_id);
CREATE INDEX IF NOT EXISTS idx_audit_tasks_schedule ON audit_tasks(audit_schedule_id);
CREATE INDEX IF NOT EXISTS idx_audit_tasks_inspector ON audit_tasks(inspector_id);
CREATE INDEX IF NOT EXISTS idx_audit_tasks_status ON audit_tasks(status);
CREATE INDEX IF NOT EXISTS idx_users_branch_active ON users(branch_id, active);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_documents_vehicle ON documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_inspection_items_inspection ON inspection_items(inspection_id);

-- ============================================================
-- DONE! Now run seed.sql to insert demo data.
-- ============================================================
