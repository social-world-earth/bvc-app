-- BVC Vehicle Security Inspection App - Seed Data
-- Run this AFTER migration.sql in the Supabase SQL Editor
-- All passwords are: password123
-- ============================================================

-- Partners
INSERT INTO partners (id, name, contact_person, contact_phone, contact_email, status) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Zoomcar Fleet Services', 'Rahul Mehta', '+91-9876543210', 'rahul@zoomcar.com', 'active'),
  ('a0000000-0000-0000-0000-000000000002', 'Orix Auto Infrastructure', 'Priya Sharma', '+91-9876543211', 'priya@orix.in', 'active');

-- Branches
INSERT INTO branches (id, name, region, address) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Mumbai Central', 'West', '123 LBS Marg, Mumbai'),
  ('b0000000-0000-0000-0000-000000000002', 'Delhi NCR Hub', 'North', '45 Ring Road, New Delhi'),
  ('b0000000-0000-0000-0000-000000000003', 'Bangalore Tech Park', 'South', '78 Whitefield, Bangalore');

-- Users (password: password123 → bcrypt hash)
INSERT INTO users (id, name, email, phone, password_hash, role, branch_id, active) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Admin User', 'admin@bvc.org', '+91-9000000001', '$2b$10$ClFqYuV05SdTq2FiIobm5eetxpculI.mi4lDiI.gGuwnjeVjbQFnG', 'admin', 'b0000000-0000-0000-0000-000000000001', true),
  ('c0000000-0000-0000-0000-000000000002', 'Suresh Inspector', 'inspector@bvc.org', '+91-9000000002', '$2b$10$ClFqYuV05SdTq2FiIobm5eetxpculI.mi4lDiI.gGuwnjeVjbQFnG', 'inspector', 'b0000000-0000-0000-0000-000000000001', true),
  ('c0000000-0000-0000-0000-000000000003', 'Priya Supervisor', 'supervisor@bvc.org', '+91-9000000003', '$2b$10$ClFqYuV05SdTq2FiIobm5eetxpculI.mi4lDiI.gGuwnjeVjbQFnG', 'supervisor', 'b0000000-0000-0000-0000-000000000001', true),
  ('c0000000-0000-0000-0000-000000000004', 'Amit Fleet Manager', 'fleet@bvc.org', '+91-9000000004', '$2b$10$ClFqYuV05SdTq2FiIobm5eetxpculI.mi4lDiI.gGuwnjeVjbQFnG', 'fleet_manager', 'b0000000-0000-0000-0000-000000000001', true),
  ('c0000000-0000-0000-0000-000000000005', 'Delhi Inspector', 'delhi.inspector@bvc.org', '+91-9000000005', '$2b$10$ClFqYuV05SdTq2FiIobm5eetxpculI.mi4lDiI.gGuwnjeVjbQFnG', 'inspector', 'b0000000-0000-0000-0000-000000000002', true),
  ('c0000000-0000-0000-0000-000000000006', 'Delhi Supervisor', 'delhi.supervisor@bvc.org', '+91-9000000006', '$2b$10$ClFqYuV05SdTq2FiIobm5eetxpculI.mi4lDiI.gGuwnjeVjbQFnG', 'supervisor', 'b0000000-0000-0000-0000-000000000002', true);

-- Update branch managers
UPDATE branches SET manager_id = 'c0000000-0000-0000-0000-000000000001' WHERE id = 'b0000000-0000-0000-0000-000000000001';
UPDATE branches SET manager_id = 'c0000000-0000-0000-0000-000000000006' WHERE id = 'b0000000-0000-0000-0000-000000000002';

-- Vehicles (BVC-owned)
INSERT INTO vehicles (id, ownership_type, chassis_number, registration_number, vehicle_type, make, model, year, branch_id, status) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'bvc', 'CH001MUM2024', 'MH01AB1234', 'SUV', 'Toyota', 'Innova Crysta', 2024, 'b0000000-0000-0000-0000-000000000001', 'active'),
  ('d0000000-0000-0000-0000-000000000002', 'bvc', 'CH002MUM2023', 'MH01CD5678', 'Sedan', 'Maruti', 'Ciaz', 2023, 'b0000000-0000-0000-0000-000000000001', 'active'),
  ('d0000000-0000-0000-0000-000000000003', 'bvc', 'CH003DEL2024', 'DL01EF9012', 'SUV', 'Mahindra', 'XUV700', 2024, 'b0000000-0000-0000-0000-000000000002', 'active'),
  ('d0000000-0000-0000-0000-000000000004', 'bvc', 'CH004DEL2023', 'DL01GH3456', 'Hatchback', 'Tata', 'Altroz', 2023, 'b0000000-0000-0000-0000-000000000002', 'active');

-- Vehicles (Partner-owned)
INSERT INTO vehicles (id, ownership_type, partner_id, chassis_number, registration_number, vehicle_type, make, model, year, branch_id, status) VALUES
  ('d0000000-0000-0000-0000-000000000005', 'partner', 'a0000000-0000-0000-0000-000000000001', 'CH005MUM2024P', 'MH02IJ7890', 'SUV', 'Hyundai', 'Creta', 2024, 'b0000000-0000-0000-0000-000000000001', 'active'),
  ('d0000000-0000-0000-0000-000000000006', 'partner', 'a0000000-0000-0000-0000-000000000002', 'CH006BLR2024P', 'KA01KL2345', 'Sedan', 'Honda', 'City', 2024, 'b0000000-0000-0000-0000-000000000003', 'active');

-- Checklist templates (based on BVC SOP)
INSERT INTO checklist_templates (id, name, category, display_order, items, active) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'Exterior Inspection', 'Exterior', 1,
   '[{"id":"ext_1","name":"Body condition - no dents or scratches"},{"id":"ext_2","name":"Windshield - no cracks or chips"},{"id":"ext_3","name":"All windows intact and operational"},{"id":"ext_4","name":"Side mirrors - intact and adjustable"},{"id":"ext_5","name":"Headlights working (low/high beam)"},{"id":"ext_6","name":"Tail lights and brake lights working"},{"id":"ext_7","name":"Turn indicators working"},{"id":"ext_8","name":"Tyres - adequate tread depth"},{"id":"ext_9","name":"Tyre pressure within range"},{"id":"ext_10","name":"Number plates legible and secured"}]', true),

  ('e0000000-0000-0000-0000-000000000002', 'Engine Bay', 'Engine', 2,
   '[{"id":"eng_1","name":"Engine oil level adequate"},{"id":"eng_2","name":"Coolant level adequate"},{"id":"eng_3","name":"Brake fluid level adequate"},{"id":"eng_4","name":"Battery terminals clean and secure"},{"id":"eng_5","name":"Belt condition - no cracks or wear"},{"id":"eng_6","name":"No visible fluid leaks"}]', true),

  ('e0000000-0000-0000-0000-000000000003', 'Interior', 'Interior', 3,
   '[{"id":"int_1","name":"Seats - clean and undamaged"},{"id":"int_2","name":"Seatbelts - all functional"},{"id":"int_3","name":"Dashboard - all gauges working"},{"id":"int_4","name":"AC/Heater functioning"},{"id":"int_5","name":"Horn working"},{"id":"int_6","name":"Steering wheel - no excessive play"},{"id":"int_7","name":"Brakes - proper pedal feel"}]', true),

  ('e0000000-0000-0000-0000-000000000004', 'Safety Equipment', 'Safety', 4,
   '[{"id":"saf_1","name":"First aid kit present and stocked"},{"id":"saf_2","name":"Fire extinguisher present and valid"},{"id":"saf_3","name":"Reflective triangles present"},{"id":"saf_4","name":"Jack and wheel spanner present"},{"id":"saf_5","name":"Spare tyre in good condition"}]', true),

  ('e0000000-0000-0000-0000-000000000005', 'Documentation', 'Documentation', 5,
   '[{"id":"doc_1","name":"Registration Certificate (RC) present"},{"id":"doc_2","name":"Insurance valid and current"},{"id":"doc_3","name":"PUC certificate valid"},{"id":"doc_4","name":"Fitness certificate valid"},{"id":"doc_5","name":"Permit documents (if applicable)"}]', true);

-- ============================================================
-- Seed data loaded! You can now deploy the app.
--
-- Test accounts:
--   admin@bvc.org / password123     (Admin)
--   inspector@bvc.org / password123 (Inspector - Mumbai)
--   supervisor@bvc.org / password123 (Supervisor - Mumbai)
--   fleet@bvc.org / password123     (Fleet Manager)
-- ============================================================
