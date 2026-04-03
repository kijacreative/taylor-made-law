-- =============================================================================
-- Seed data for local development
-- Run via: npx supabase db reset (applies migrations + this seed)
-- =============================================================================

-- ============================================================================
-- 1. Auth user + Profile (needed for FK references and auth context)
-- ============================================================================

-- Create a test user in auth.users (Supabase Auth)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at, role, aud
) VALUES (
  'a1b2c3d4-0001-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'dev@taylormadelaw.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"full_name": "Dev Lawyer"}'::jsonb,
  now(), now(), 'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Profile row (auto-created by trigger, but upsert to ensure fields are set)
INSERT INTO profiles (
  id, email, full_name, phone, role, user_type, user_status,
  membership_status, subscription_status, firm_name, bar_number,
  bio, states_licensed, practice_areas, years_experience,
  email_verified, password_set, profile_completed_at,
  referral_agreement_accepted, referral_agreement_version
) VALUES (
  'a1b2c3d4-0001-4000-8000-000000000001',
  'dev@taylormadelaw.com',
  'Dev Lawyer',
  '(555) 123-4567',
  'admin', 'admin', 'approved',
  'paid', 'active',
  'Mock & Associates LLP',
  'TX12345678',
  'Experienced trial attorney specializing in personal injury and mass tort litigation.',
  ARRAY['Texas', 'California'],
  ARRAY['Personal Injury', 'Mass Torts', 'Medical Malpractice'],
  10,
  true, true, now(),
  true, '1.0'
) ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  user_status = EXCLUDED.user_status,
  full_name = EXCLUDED.full_name;

-- Lawyer profile
INSERT INTO lawyer_profiles (
  id, user_id, full_name, email, firm_name, phone, bar_number,
  bio, states_licensed, practice_areas, years_experience,
  status, subscription_status, referral_agreement_accepted,
  profile_completed
) VALUES (
  'a1b2c3d4-1001-4000-8000-000000000001',
  'a1b2c3d4-0001-4000-8000-000000000001',
  'Dev Lawyer',
  'dev@taylormadelaw.com',
  'Mock & Associates LLP',
  '(555) 123-4567',
  'TX12345678',
  'Experienced trial attorney specializing in personal injury and mass tort litigation.',
  ARRAY['Texas', 'California'],
  ARRAY['Personal Injury', 'Mass Torts', 'Medical Malpractice'],
  10,
  'approved', 'active', true, true
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. Blog Posts
-- ============================================================================

INSERT INTO blog_posts (id, title, slug, excerpt, body, category, tags, author_name, author_email, status, is_pinned, published_at, read_time_minutes, featured_image_url) VALUES
(
  'b1000001-0001-4000-8000-000000000001',
  'Understanding Mass Tort Litigation in 2026',
  'understanding-mass-tort-litigation-2026',
  'A comprehensive guide to navigating mass tort cases in the current legal landscape.',
  '<h2>What Is Mass Tort Litigation?</h2><p>Mass tort litigation involves claims brought by multiple plaintiffs against one or more defendants. Unlike class actions, each plaintiff maintains their individual case while sharing common legal issues.</p><h2>Key Trends in 2026</h2><p>Several emerging trends are shaping the mass tort landscape this year, including increased use of technology in case management and evolving standards for scientific evidence.</p><p>Attorneys should pay close attention to recent rulings that have expanded the scope of discoverable electronic evidence.</p>',
  'Mass Torts',
  ARRAY['mass tort', 'litigation', 'legal trends'],
  'Sarah Mitchell',
  'sarah@taylormadelaw.com',
  'published', false,
  now() - interval '3 days',
  4,
  'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800'
),
(
  'b1000001-0002-4000-8000-000000000002',
  'Building a Successful Attorney Referral Network',
  'building-attorney-referral-network',
  'Learn how strategic referral partnerships can grow your practice and serve clients better.',
  '<h2>Why Referral Networks Matter</h2><p>In today''s competitive legal market, referral networks are essential for growth. They allow attorneys to connect clients with specialists who can best serve their needs.</p><h2>Best Practices</h2><p>Start by identifying complementary practice areas. A personal injury attorney, for example, might build relationships with employment law and medical malpractice specialists.</p><p>Regular communication and transparent fee-sharing agreements are the foundation of lasting referral partnerships.</p>',
  'Marketing',
  ARRAY['referrals', 'networking', 'practice growth'],
  'James Taylor',
  'james@taylormadelaw.com',
  'published', true,
  now() - interval '1 day',
  3,
  'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800'
),
(
  'b1000001-0003-4000-8000-000000000003',
  'Compliance Checklist for Attorney Advertising',
  'compliance-checklist-attorney-advertising',
  'Stay compliant with state bar advertising rules while effectively marketing your practice.',
  '<h2>State Bar Requirements</h2><p>Each state has unique rules governing attorney advertising. This checklist covers the most common requirements across jurisdictions.</p><h2>Digital Marketing Compliance</h2><p>Social media, Google Ads, and website content all fall under advertising rules. Ensure disclaimers are visible and claims are verifiable.</p>',
  'Compliance',
  ARRAY['compliance', 'advertising', 'ethics'],
  'Dev Lawyer',
  'dev@taylormadelaw.com',
  'published', false,
  now() - interval '7 days',
  5,
  NULL
),
(
  'b1000001-0004-4000-8000-000000000004',
  'Case Management Best Practices for Small Firms',
  'case-management-best-practices',
  'Streamline your workflow with these proven case management strategies.',
  '<h2>Organize Your Caseload</h2><p>Effective case management starts with a clear intake process and consistent file organization.</p>',
  'Case Management',
  ARRAY['case management', 'efficiency', 'small firms'],
  'Dev Lawyer',
  'dev@taylormadelaw.com',
  'draft', false,
  NULL,
  3,
  NULL
);

-- ============================================================================
-- 3. Content Posts (platform updates / legal news)
-- ============================================================================

INSERT INTO content_posts (id, title, slug, excerpt, content, category, tags, author_name, is_pinned, is_published, published_at) VALUES
(
  'c1000001-0001-4000-8000-000000000001',
  'Welcome to the Taylor Made Law Network',
  'welcome-to-tml-network',
  'We are excited to launch our attorney referral network.',
  '<p>Taylor Made Law is a new kind of legal network designed to connect attorneys for case exchange, collaboration, and professional growth.</p><p>Our platform makes it easy to find the right attorney for every case.</p>',
  'Announcement',
  ARRAY['launch', 'network', 'welcome'],
  'Taylor Made Law',
  true,
  true,
  now() - interval '30 days'
),
(
  'c1000001-0002-4000-8000-000000000002',
  'New Feature: Legal Circles for Group Collaboration',
  'legal-circles-launch',
  'Introducing Legal Circles — private groups for case sharing and collaboration.',
  '<p>Legal Circles allow attorneys to form private groups for sharing cases, documents, and real-time chat.</p><p>Create a circle, invite your trusted colleagues, and start collaborating today.</p>',
  'Platform Update',
  ARRAY['circles', 'collaboration', 'new feature'],
  'Taylor Made Law',
  false,
  true,
  now() - interval '14 days'
);

-- ============================================================================
-- 4. Resources
-- ============================================================================

INSERT INTO resources (id, title, slug, description, resource_type, category, tags, status, visibility, is_featured, published_at, file_url, file_name, file_type) VALUES
(
  'a1000ee1-0001-4000-8000-000000000001',
  'Attorney Referral Agreement Template',
  'referral-agreement-template',
  'A standardized referral agreement template for use between network attorneys.',
  'upload',
  'Templates',
  ARRAY['referral', 'agreement', 'template'],
  'published',
  'all_lawyers',
  true,
  now() - interval '20 days',
  'https://example.com/referral-agreement.pdf',
  'referral-agreement-template.pdf',
  'pdf'
),
(
  'a1000ee1-0002-4000-8000-000000000002',
  'Mass Tort Case Evaluation Checklist',
  'mass-tort-evaluation-checklist',
  'A step-by-step checklist for evaluating potential mass tort cases.',
  'upload',
  'Mass Torts',
  ARRAY['mass tort', 'evaluation', 'checklist'],
  'published',
  'approved_only',
  false,
  now() - interval '10 days',
  'https://example.com/mass-tort-checklist.pdf',
  'mass-tort-evaluation-checklist.pdf',
  'pdf'
);

-- ============================================================================
-- 5. Mass Torts
-- ============================================================================

INSERT INTO mass_torts (id, title, slug, status, jurisdiction, short_summary, overview, ideal_cases, key_details, important_dates, external_links, tags, is_featured, is_published) VALUES
(
  'a100ee01-0001-4000-8000-000000000001',
  'Camp Lejeune Water Contamination',
  'camp-lejeune-water-contamination',
  'Open',
  'Federal',
  'Claims for health conditions caused by contaminated water at Camp Lejeune military base.',
  'The Camp Lejeune Justice Act allows veterans and family members who lived or worked at Camp Lejeune between 1953 and 1987 to file claims for health conditions linked to contaminated drinking water.',
  'Veterans, family members, and civilian workers who lived or worked at Camp Lejeune for 30+ days between August 1953 and December 1987.',
  ARRAY['Over 1 million people potentially exposed', 'Linked to cancers, neurological disorders, and other conditions', 'Federal claims filed in Eastern District of North Carolina'],
  '[{"date": "2022-08-10", "description": "Camp Lejeune Justice Act signed into law"}, {"date": "2026-08-10", "description": "Statute of limitations deadline"}]'::jsonb,
  '[{"url": "https://www.va.gov/disability/eligibility/hazardous-materials-exposure/camp-lejeune-water-contamination/", "label": "VA Camp Lejeune Information"}]'::jsonb,
  ARRAY['camp lejeune', 'water contamination', 'military', 'federal'],
  true,
  true
),
(
  'a100ee01-0002-4000-8000-000000000002',
  'AFFF Firefighting Foam Litigation',
  'afff-firefighting-foam',
  'Monitoring',
  'Multi-State',
  'Lawsuits against manufacturers of AFFF foam containing PFAS chemicals.',
  'Aqueous Film Forming Foam (AFFF) used by firefighters and military personnel contains PFAS chemicals linked to various cancers and health conditions.',
  'Firefighters, military personnel, and residents near military bases or airports where AFFF was used.',
  ARRAY['MDL consolidated in District of South Carolina', 'Multiple bellwether trials scheduled', 'Municipal water contamination claims included'],
  '[]'::jsonb,
  '[]'::jsonb,
  ARRAY['AFFF', 'PFAS', 'firefighting foam', 'contamination'],
  false,
  true
);

-- ============================================================================
-- 6. Cases (for case exchange)
-- ============================================================================

INSERT INTO cases (id, title, summary, description, state, practice_area, estimated_value, status, is_trending, client_first_name, client_last_name, client_email, client_phone, published_at, published_by) VALUES
(
  'ca5e0001-0001-4000-8000-000000000001',
  'Trucking Accident — Multiple Injuries',
  'Multi-vehicle trucking accident on I-35 with serious injuries to driver and passenger.',
  'Client was rear-ended by an 18-wheeler on Interstate 35 near San Antonio. Client and one passenger sustained serious injuries including broken ribs, concussion, and herniated discs. Commercial vehicle had prior safety violations.',
  'Texas',
  'Truck Accidents',
  75000,
  'published',
  true,
  'John', 'Smith', 'john.smith@example.com', '(555) 234-5678',
  now() - interval '2 days',
  'dev@taylormadelaw.com'
),
(
  'ca5e0001-0002-4000-8000-000000000002',
  'Medical Malpractice — Surgical Error',
  'Patient suffered complications from surgical error during routine appendectomy.',
  'Client underwent routine laparoscopic appendectomy at a local hospital. Surgeon inadvertently perforated the bowel, leading to sepsis and a 3-week ICU stay. Client has ongoing complications.',
  'California',
  'Medical Malpractice',
  150000,
  'published',
  false,
  'Maria', 'Garcia', 'maria.garcia@example.com', '(555) 345-6789',
  now() - interval '5 days',
  'dev@taylormadelaw.com'
),
(
  'ca5e0001-0003-4000-8000-000000000003',
  'Workers Comp — Construction Fall',
  'Construction worker fell from scaffolding at job site.',
  'Client fell approximately 15 feet from improperly secured scaffolding at a commercial construction site. Sustained a fractured pelvis and two broken vertebrae. OSHA investigation pending.',
  'Texas',
  'Workers Compensation',
  45000,
  'published',
  false,
  'Robert', 'Johnson', 'robert.j@example.com', '(555) 456-7890',
  now() - interval '1 day',
  'dev@taylormadelaw.com'
);

-- ============================================================================
-- 7. Leads (for admin dashboard)
-- ============================================================================

INSERT INTO leads (id, first_name, last_name, email, phone, practice_area, state, description, urgency, estimated_value, status, source) VALUES
(
  '1ead0001-0001-4000-8000-000000000001',
  'Emily', 'Chen',
  'emily.chen@example.com', '(555) 567-8901',
  'Personal Injury', 'Texas',
  'Car accident on Highway 290. Other driver ran red light. Client has neck and back injuries, currently in physical therapy.',
  'high',
  35000,
  'new',
  'website'
),
(
  '1ead0001-0002-4000-8000-000000000002',
  'Michael', 'Brown',
  'michael.brown@example.com', '(555) 678-9012',
  'Mass Torts', 'Florida',
  'Camp Lejeune veteran stationed 1975-1980. Diagnosed with kidney cancer in 2024.',
  'urgent',
  NULL,
  'new',
  'website'
),
(
  '1ead0001-0003-4000-8000-000000000003',
  'Lisa', 'Davis',
  'lisa.davis@example.com', '(555) 789-0123',
  'Employment Law', 'California',
  'Wrongful termination after filing sexual harassment complaint with HR. Has documentation of complaints and retaliatory actions.',
  'medium',
  50000,
  'junior_review',
  'website'
);

-- ============================================================================
-- 8. Popups (for popup modal system)
-- ============================================================================

INSERT INTO popups (id, name, status, headline, body_text, button_label, link_url, placement, audience, trigger_type, frequency, size) VALUES
(
  'b0b00001-0001-4000-8000-000000000001',
  'Welcome Popup',
  'active',
  'Welcome to Taylor Made Law!',
  'Explore our case exchange, connect with attorneys, and grow your practice.',
  'Get Started',
  '/LawyerDashboard',
  'dashboard',
  'all',
  'on_load',
  'once_ever',
  'medium'
);

-- ============================================================================
-- 9. Legal Circles + Members
-- ============================================================================

INSERT INTO legal_circles (id, name, slug, description, group_type, visibility, tags, member_count, is_active, case_sharing_enabled, member_can_submit_cases, member_can_accept_cases, created_by_user_id, created_by_email, created_by_name) VALUES
(
  'c1c1e001-0001-4000-8000-000000000001',
  'Texas Personal Injury Network',
  'texas-pi-network',
  'A collaborative group for Texas-based personal injury attorneys to share cases, resources, and insights.',
  'practice_group',
  'discoverable',
  ARRAY['texas', 'personal injury', 'networking'],
  1,
  true,
  true, true, true,
  'a1b2c3d4-0001-4000-8000-000000000001',
  'dev@taylormadelaw.com',
  'Dev Lawyer'
),
(
  'c1c1e001-0002-4000-8000-000000000002',
  'Mass Tort Coordination Group',
  'mass-tort-coordination',
  'Private group for attorneys coordinating on active mass tort litigation.',
  'special_interest',
  'hidden',
  ARRAY['mass tort', 'coordination', 'litigation'],
  1,
  true,
  true, true, false,
  'a1b2c3d4-0001-4000-8000-000000000001',
  'dev@taylormadelaw.com',
  'Dev Lawyer'
);

INSERT INTO legal_circle_members (id, circle_id, user_id, user_email, user_name, full_name, role, status, joined_at) VALUES
(
  'a1e1be01-0001-4000-8000-000000000001',
  'c1c1e001-0001-4000-8000-000000000001',
  'a1b2c3d4-0001-4000-8000-000000000001',
  'dev@taylormadelaw.com',
  'Dev Lawyer',
  'Dev Lawyer',
  'admin',
  'active',
  now() - interval '30 days'
),
(
  'a1e1be01-0002-4000-8000-000000000002',
  'c1c1e001-0002-4000-8000-000000000002',
  'a1b2c3d4-0001-4000-8000-000000000001',
  'dev@taylormadelaw.com',
  'Dev Lawyer',
  'Dev Lawyer',
  'admin',
  'active',
  now() - interval '14 days'
);
