-- =============================================================
-- Seed data for Startup OS
-- Runs on: supabase db reset
-- =============================================================

-- Company
insert into public.companies (id, name)
values ('11111111-1111-1111-1111-111111111111', 'Acme Startup GmbH')
on conflict do nothing;

-- People
insert into public.people (id, full_name, email)
values
  ('22222222-2222-2222-2222-222222222222', 'Alice Müller', 'alice@acme.example'),
  ('33333333-3333-3333-3333-333333333333', 'Bob Schmidt', 'bob@acme.example'),
  ('44444444-4444-4444-4444-444444444444', 'Clara Weber', 'clara@acme.example'),
  ('55555555-5555-5555-5555-555555555555', 'David Fischer', 'david@acme.example')
on conflict do nothing;

-- Company Members
insert into public.company_members (company_id, person_id, role)
values
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'CEO'),
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'CFO'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'VP Engineering'),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'Head of Marketing')
on conflict do nothing;

-- Cost Centers
insert into public.cost_centers (id, company_id, name, owner_email)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Engineering', 'clara@acme.example'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Marketing', 'david@acme.example'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Sales', 'bob@acme.example'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'G&A', 'alice@acme.example')
on conflict do nothing;

-- =============================================================
-- Fixed Costs (recurring monthly)
-- =============================================================
insert into public.fixed_costs (id, cost_center_id, category, name, amount, start_date, end_date, source, source_ref)
values
  -- Engineering salaries
  ('fc000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Salaries', 'Clara Weber - VP Engineering', 9500.00, '2025-01-01', null, 'personio', 'EMP-101'),
  ('fc000001-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Salaries', 'Max Bauer - Senior Dev', 7500.00, '2025-01-01', null, 'personio', 'EMP-102'),
  ('fc000001-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Salaries', 'Lena Koch - Dev', 5500.00, '2025-06-01', null, 'personio', 'EMP-103'),
  -- Engineering infra
  ('fc000001-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cloud Infra', 'AWS Reserved Instances', 3200.00, '2025-01-01', '2026-12-01', null, null),
  -- Marketing salary
  ('fc000001-0000-0000-0000-000000000005', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Salaries', 'David Fischer - Head of Marketing', 8000.00, '2025-01-01', null, 'personio', 'EMP-201'),
  -- G&A office rent
  ('fc000001-0000-0000-0000-000000000006', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Office', 'Office Rent - Kreuzberg', 4500.00, '2025-01-01', '2027-06-01', null, 'LEASE-001'),
  -- G&A software
  ('fc000001-0000-0000-0000-000000000007', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Software', 'Slack + Notion + GitHub', 1200.00, '2025-01-01', null, null, null);

-- =============================================================
-- Variable budget lines (not from fixed costs)
-- =============================================================
insert into public.budget_lines (cost_center_id, category, month, planned_amount, notes)
values
  -- Engineering: variable cloud usage on top of reserved
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cloud Infra (Variable)', '2026-01-01', 2000.00, 'On-demand EC2 + data transfer'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cloud Infra (Variable)', '2026-02-01', 2000.00, 'On-demand EC2 + data transfer'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cloud Infra (Variable)', '2026-03-01', 2500.00, 'Increased for load testing'),
  -- Marketing: ads
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Ads', '2026-01-01', 15000.00, 'Google Ads + LinkedIn'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Ads', '2026-02-01', 18000.00, 'Increased for product launch'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Ads', '2026-03-01', 12000.00, 'Post-launch cooldown'),
  -- Marketing: events
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Events', '2026-02-01', 5000.00, 'SaaStr sponsorship'),
  -- Sales: travel
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Travel', '2026-01-01', 3000.00, 'Customer visits'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Travel', '2026-02-01', 4000.00, 'Conference + customer visits'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Travel', '2026-03-01', 3000.00, 'Customer visits'),
  -- G&A: misc
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Legal', '2026-01-01', 2000.00, 'Contract reviews'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Legal', '2026-03-01', 8000.00, 'Funding round prep')
on conflict do nothing;

-- =============================================================
-- Generate fixed costs for Q1 2026
-- This populates budget_lines + actuals from fixed_costs
-- =============================================================
select public.generate_fixed_costs('2026-01-01');
select public.generate_fixed_costs('2026-02-01');
select public.generate_fixed_costs('2026-03-01');

-- =============================================================
-- Variable actuals (real-world events with variance stories)
-- =============================================================
insert into public.actuals (cost_center_id, category, month, actual_amount, source, source_ref, description)
values
  -- Engineering: cloud overspend in Feb (unexpected traffic spike)
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cloud Infra (Variable)', '2026-01-01', 1800.00, 'manual', 'AWS-INV-2026-01', 'On-demand Jan - normal'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cloud Infra (Variable)', '2026-02-01', 4200.00, 'manual', 'AWS-INV-2026-02', 'On-demand Feb - traffic spike from Product Hunt'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cloud Infra (Variable)', '2026-03-01', 2800.00, 'manual', 'AWS-INV-2026-03', 'On-demand Mar - load testing'),

  -- Marketing: ads overspend in Feb (agency error), underspend in Jan
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Ads', '2026-01-01', 14200.00, 'hubspot', 'HS-CAMP-101', 'Google Ads Jan'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Ads', '2026-01-01', 800.00, 'hubspot', 'HS-CAMP-102', 'LinkedIn Ads Jan'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Ads', '2026-02-01', 19500.00, 'hubspot', 'HS-CAMP-201', 'Google Ads Feb - agency overspent'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Ads', '2026-02-01', 3500.00, 'hubspot', 'HS-CAMP-202', 'LinkedIn Ads Feb - launch push'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Ads', '2026-03-01', 11000.00, 'hubspot', 'HS-CAMP-301', 'Google Ads Mar'),

  -- Marketing: events on budget
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Events', '2026-02-01', 4800.00, 'manual', 'INV-SAASTR-2026', 'SaaStr sponsorship'),

  -- Sales: travel mostly on budget, slight over in Feb
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Travel', '2026-01-01', 2800.00, 'manual', null, 'Munich customer visit'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Travel', '2026-02-01', 4600.00, 'manual', null, 'SaaStr conference + Hamburg visit'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Travel', '2026-03-01', 2500.00, 'manual', null, 'Berlin customer visit'),

  -- G&A: legal on budget in Jan, big spend in Mar for funding round
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Legal', '2026-01-01', 1800.00, 'manual', 'INV-LAW-001', 'Contract review - vendor agreement'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Legal', '2026-03-01', 12000.00, 'manual', 'INV-LAW-003', 'Series A term sheet review + due diligence');

-- =============================================================
-- Recompute variances for all variable cost cells
-- =============================================================
select public.recompute_variance('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cloud Infra (Variable)', '2026-01-01');
select public.recompute_variance('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cloud Infra (Variable)', '2026-02-01');
select public.recompute_variance('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cloud Infra (Variable)', '2026-03-01');

select public.recompute_variance('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Ads', '2026-01-01');
select public.recompute_variance('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Ads', '2026-02-01');
select public.recompute_variance('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Ads', '2026-03-01');

select public.recompute_variance('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Events', '2026-02-01');

select public.recompute_variance('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Travel', '2026-01-01');
select public.recompute_variance('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Travel', '2026-02-01');
select public.recompute_variance('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Travel', '2026-03-01');

select public.recompute_variance('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Legal', '2026-01-01');
select public.recompute_variance('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Legal', '2026-03-01');
