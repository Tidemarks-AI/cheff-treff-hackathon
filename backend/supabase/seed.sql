-- =============================================================
-- Seed data for Startup OS
-- Runs on: supabase db reset
-- Only seeds user_companies mapping (domain data is in SurrealDB)
-- =============================================================

-- Create test auth users (using Supabase's gotrue schema)
insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role)
values
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'alice@acme.example', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Alice Müller"}', now(), now(), 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'bob@acme.example', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Bob Schmidt"}', now(), now(), 'authenticated', 'authenticated'),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'clara@acme.example', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Clara Weber"}', now(), now(), 'authenticated', 'authenticated'),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'david@acme.example', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"David Fischer"}', now(), now(), 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- Also need identities for each user so login works
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
  ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'alice@acme.example', '{"sub":"22222222-2222-2222-2222-222222222222","email":"alice@acme.example"}', 'email', now(), now(), now()),
  ('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'bob@acme.example', '{"sub":"33333333-3333-3333-3333-333333333333","email":"bob@acme.example"}', 'email', now(), now(), now()),
  ('44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'clara@acme.example', '{"sub":"44444444-4444-4444-4444-444444444444","email":"clara@acme.example"}', 'email', now(), now(), now()),
  ('55555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 'david@acme.example', '{"sub":"55555555-5555-5555-5555-555555555555","email":"david@acme.example"}', 'email', now(), now(), now())
on conflict do nothing;

-- Map users to their SurrealDB company database
insert into public.user_companies (user_id, surreal_db, company_name, role)
values
  ('22222222-2222-2222-2222-222222222222', 'acme_startup_gmbh', 'Acme Startup GmbH', 'ceo'),
  ('33333333-3333-3333-3333-333333333333', 'acme_startup_gmbh', 'Acme Startup GmbH', 'cfo'),
  ('44444444-4444-4444-4444-444444444444', 'acme_startup_gmbh', 'Acme Startup GmbH', 'vp_engineering'),
  ('55555555-5555-5555-5555-555555555555', 'acme_startup_gmbh', 'Acme Startup GmbH', 'head_of_marketing')
on conflict do nothing;
