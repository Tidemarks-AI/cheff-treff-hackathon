-- =============================================================
-- Seed data for Acme Startup GmbH (SurrealDB database: acme_startup_gmbh)
-- =============================================================

-- ── Teams ───────────────────────────────────────────────────

CREATE team:engineering SET name = "Engineering", department = "Engineering", location = "Berlin";
CREATE team:marketing SET name = "Marketing", department = "Marketing", location = "Berlin";
CREATE team:sales SET name = "Sales", department = "Sales", location = "Berlin";
CREATE team:ga SET name = "G&A", department = "General & Admin", location = "Berlin";

-- ── Employees / Founders ────────────────────────────────────

CREATE employee:alice SET
  user_id = "22222222-2222-2222-2222-222222222222",
  full_name = "Alice Müller",
  email = "alice@acme.example",
  team = team:ga,
  member_type = "majority_founder",
  vesting_period_months = 48,
  vesting_cliff_months = 12;

CREATE employee:bob SET
  user_id = "33333333-3333-3333-3333-333333333333",
  full_name = "Bob Schmidt",
  email = "bob@acme.example",
  team = team:sales,
  member_type = "minority_founder",
  vesting_period_months = 48,
  vesting_cliff_months = 12;

CREATE employee:clara SET
  user_id = "44444444-4444-4444-4444-444444444444",
  full_name = "Clara Weber",
  email = "clara@acme.example",
  team = team:engineering,
  member_type = "employee";

CREATE employee:david SET
  user_id = "55555555-5555-5555-5555-555555555555",
  full_name = "David Fischer",
  email = "david@acme.example",
  team = team:marketing,
  member_type = "employee";

CREATE employee:max SET
  full_name = "Max Bauer",
  email = "max@acme.example",
  team = team:engineering,
  member_type = "employee";

CREATE employee:lena SET
  full_name = "Lena Koch",
  email = "lena@acme.example",
  team = team:engineering,
  member_type = "employee";

-- ── Salaries ────────────────────────────────────────────────

CREATE salary:alice_salary SET employee = employee:alice, amount = 10000, frequency = "monthly", effective_from = d"2025-01-01T00:00:00Z";
CREATE salary:bob_salary SET employee = employee:bob, amount = 9000, frequency = "monthly", effective_from = d"2025-01-01T00:00:00Z";
CREATE salary:clara_salary SET employee = employee:clara, amount = 9500, frequency = "monthly", effective_from = d"2025-01-01T00:00:00Z";
CREATE salary:david_salary SET employee = employee:david, amount = 8000, frequency = "monthly", effective_from = d"2025-01-01T00:00:00Z";
CREATE salary:max_salary SET employee = employee:max, amount = 7500, frequency = "monthly", effective_from = d"2025-01-01T00:00:00Z";
CREATE salary:lena_salary SET employee = employee:lena, amount = 5500, frequency = "monthly", effective_from = d"2025-06-01T00:00:00Z";

-- ── Equity ──────────────────────────────────────────────────

CREATE captable:main SET total_shares = 25000, shares_issued = 25000, shares_reserved = 0;

CREATE company_share:alice_shares SET
  captable = captable:main, shareholder_name = "Alice Müller",
  shareholder_user_id = "22222222-2222-2222-2222-222222222222",
  share_count = 15000, nominal_value = 1.00, percentage = 60.0, share_class = "founder";

CREATE company_share:bob_shares SET
  captable = captable:main, shareholder_name = "Bob Schmidt",
  shareholder_user_id = "33333333-3333-3333-3333-333333333333",
  share_count = 10000, nominal_value = 1.00, percentage = 40.0, share_class = "founder";

CREATE share_capital:main SET amount = 25000, currency = "EUR", minimum_required = true, paid_in = true;

-- ── Legal ───────────────────────────────────────────────────

CREATE official_founding:main SET status = "completed", completed_at = d"2025-01-15T00:00:00Z", notes = "Founded at Berlin notary";

CREATE company_agreement:main SET signed_at = d"2025-01-15T00:00:00Z", notes = "Standard GmbH Gesellschaftsvertrag";

CREATE notary_appointment:founding SET
  scheduled_at = d"2025-01-15T10:00:00Z",
  notary_name = "Dr. Hans Meyer",
  notary_office = "Kurfürstendamm 42, Berlin",
  status = "completed";

CREATE ihk_registration:main SET registration_number = "IHK-BLN-2025-4231", status = "completed";

CREATE tax_office_account:main SET tax_number = "27/123/45678", vat_id = "DE345678901", status = "completed";

CREATE transparency_register:main SET status = "completed", completed_at = d"2025-02-01T00:00:00Z";

CREATE vat_return_registration:main SET tax_account = tax_office_account:main, filing_frequency = "monthly", status = "completed";

-- ── Cost Centers ────────────────────────────────────────────

CREATE cost_center:engineering SET team = team:engineering, name = "Engineering", owner_email = "clara@acme.example";
CREATE cost_center:marketing SET team = team:marketing, name = "Marketing", owner_email = "david@acme.example";
CREATE cost_center:sales SET team = team:sales, name = "Sales", owner_email = "bob@acme.example";
CREATE cost_center:ga SET team = team:ga, name = "G&A", owner_email = "alice@acme.example";

-- ── Fixed Expenses ──────────────────────────────────────────

CREATE fixed_expense:clara_salary SET cost_center = cost_center:engineering, name = "Clara Weber - VP Engineering", amount = 9500, start_date = d"2025-01-01T00:00:00Z", source_system = "personio";
CREATE fixed_expense:max_salary SET cost_center = cost_center:engineering, name = "Max Bauer - Senior Dev", amount = 7500, start_date = d"2025-01-01T00:00:00Z", source_system = "personio";
CREATE fixed_expense:lena_salary SET cost_center = cost_center:engineering, name = "Lena Koch - Dev", amount = 5500, start_date = d"2025-06-01T00:00:00Z", source_system = "personio";
CREATE fixed_expense:aws_reserved SET cost_center = cost_center:engineering, name = "AWS Reserved Instances", amount = 3200, start_date = d"2025-01-01T00:00:00Z", end_date = d"2026-12-01T00:00:00Z";
CREATE fixed_expense:david_salary SET cost_center = cost_center:marketing, name = "David Fischer - Head of Marketing", amount = 8000, start_date = d"2025-01-01T00:00:00Z", source_system = "personio";
CREATE fixed_expense:office_rent SET cost_center = cost_center:ga, name = "Office Rent - Kreuzberg", amount = 4500, start_date = d"2025-01-01T00:00:00Z", end_date = d"2027-06-01T00:00:00Z", auto_renews = false;
CREATE fixed_expense:software SET cost_center = cost_center:ga, name = "Slack + Notion + GitHub", amount = 1200, start_date = d"2025-01-01T00:00:00Z", auto_renews = true;

-- ── Budget Lines (variable, not from fixed costs) ───────────

CREATE budget_line:eng_cloud_jan SET cost_center = cost_center:engineering, category = "Cloud Infra (Variable)", month = d"2026-01-01T00:00:00Z", planned_amount = 2000, notes = "On-demand EC2 + data transfer";
CREATE budget_line:eng_cloud_feb SET cost_center = cost_center:engineering, category = "Cloud Infra (Variable)", month = d"2026-02-01T00:00:00Z", planned_amount = 2000, notes = "On-demand EC2 + data transfer";
CREATE budget_line:eng_cloud_mar SET cost_center = cost_center:engineering, category = "Cloud Infra (Variable)", month = d"2026-03-01T00:00:00Z", planned_amount = 2500, notes = "Increased for load testing";

CREATE budget_line:mkt_ads_jan SET cost_center = cost_center:marketing, category = "Ads", month = d"2026-01-01T00:00:00Z", planned_amount = 15000, notes = "Google Ads + LinkedIn";
CREATE budget_line:mkt_ads_feb SET cost_center = cost_center:marketing, category = "Ads", month = d"2026-02-01T00:00:00Z", planned_amount = 18000, notes = "Increased for product launch";
CREATE budget_line:mkt_ads_mar SET cost_center = cost_center:marketing, category = "Ads", month = d"2026-03-01T00:00:00Z", planned_amount = 12000, notes = "Post-launch cooldown";
CREATE budget_line:mkt_events_feb SET cost_center = cost_center:marketing, category = "Events", month = d"2026-02-01T00:00:00Z", planned_amount = 5000, notes = "SaaStr sponsorship";

CREATE budget_line:sales_travel_jan SET cost_center = cost_center:sales, category = "Travel", month = d"2026-01-01T00:00:00Z", planned_amount = 3000, notes = "Customer visits";
CREATE budget_line:sales_travel_feb SET cost_center = cost_center:sales, category = "Travel", month = d"2026-02-01T00:00:00Z", planned_amount = 4000, notes = "Conference + customer visits";
CREATE budget_line:sales_travel_mar SET cost_center = cost_center:sales, category = "Travel", month = d"2026-03-01T00:00:00Z", planned_amount = 3000, notes = "Customer visits";

CREATE budget_line:ga_legal_jan SET cost_center = cost_center:ga, category = "Legal", month = d"2026-01-01T00:00:00Z", planned_amount = 2000, notes = "Contract reviews";
CREATE budget_line:ga_legal_mar SET cost_center = cost_center:ga, category = "Legal", month = d"2026-03-01T00:00:00Z", planned_amount = 8000, notes = "Funding round prep";

-- ── Actuals (costs) ─────────────────────────────────────────

-- Engineering cloud (variable)
CREATE costs:eng_cloud_jan SET cost_center = cost_center:engineering, category = "Cloud Infra (Variable)", month = d"2026-01-01T00:00:00Z", actual_amount = 1800, source = "manual", source_ref = "AWS-INV-2026-01", description = "On-demand Jan - normal";
CREATE costs:eng_cloud_feb SET cost_center = cost_center:engineering, category = "Cloud Infra (Variable)", month = d"2026-02-01T00:00:00Z", actual_amount = 4200, source = "manual", source_ref = "AWS-INV-2026-02", description = "On-demand Feb - traffic spike from Product Hunt";
CREATE costs:eng_cloud_mar SET cost_center = cost_center:engineering, category = "Cloud Infra (Variable)", month = d"2026-03-01T00:00:00Z", actual_amount = 2800, source = "manual", source_ref = "AWS-INV-2026-03", description = "On-demand Mar - load testing";

-- Marketing ads
CREATE costs:mkt_ads_jan_google SET cost_center = cost_center:marketing, category = "Ads", month = d"2026-01-01T00:00:00Z", actual_amount = 14200, source = "hubspot", source_ref = "HS-CAMP-101", description = "Google Ads Jan";
CREATE costs:mkt_ads_jan_linkedin SET cost_center = cost_center:marketing, category = "Ads", month = d"2026-01-01T00:00:00Z", actual_amount = 800, source = "hubspot", source_ref = "HS-CAMP-102", description = "LinkedIn Ads Jan";
CREATE costs:mkt_ads_feb_google SET cost_center = cost_center:marketing, category = "Ads", month = d"2026-02-01T00:00:00Z", actual_amount = 19500, source = "hubspot", source_ref = "HS-CAMP-201", description = "Google Ads Feb - agency overspent";
CREATE costs:mkt_ads_feb_linkedin SET cost_center = cost_center:marketing, category = "Ads", month = d"2026-02-01T00:00:00Z", actual_amount = 3500, source = "hubspot", source_ref = "HS-CAMP-202", description = "LinkedIn Ads Feb - launch push";
CREATE costs:mkt_ads_mar SET cost_center = cost_center:marketing, category = "Ads", month = d"2026-03-01T00:00:00Z", actual_amount = 11000, source = "hubspot", source_ref = "HS-CAMP-301", description = "Google Ads Mar";

-- Marketing events
CREATE costs:mkt_events_feb SET cost_center = cost_center:marketing, category = "Events", month = d"2026-02-01T00:00:00Z", actual_amount = 4800, source = "manual", source_ref = "INV-SAASTR-2026", description = "SaaStr sponsorship";

-- Sales travel
CREATE costs:sales_travel_jan SET cost_center = cost_center:sales, category = "Travel", month = d"2026-01-01T00:00:00Z", actual_amount = 2800, source = "manual", description = "Munich customer visit";
CREATE costs:sales_travel_feb SET cost_center = cost_center:sales, category = "Travel", month = d"2026-02-01T00:00:00Z", actual_amount = 4600, source = "manual", description = "SaaStr conference + Hamburg visit";
CREATE costs:sales_travel_mar SET cost_center = cost_center:sales, category = "Travel", month = d"2026-03-01T00:00:00Z", actual_amount = 2500, source = "manual", description = "Berlin customer visit";

-- G&A legal
CREATE costs:ga_legal_jan SET cost_center = cost_center:ga, category = "Legal", month = d"2026-01-01T00:00:00Z", actual_amount = 1800, source = "manual", source_ref = "INV-LAW-001", description = "Contract review - vendor agreement";
CREATE costs:ga_legal_mar SET cost_center = cost_center:ga, category = "Legal", month = d"2026-03-01T00:00:00Z", actual_amount = 12000, source = "manual", source_ref = "INV-LAW-003", description = "Series A term sheet review + due diligence";

-- ── Variances (pre-computed) ────────────────────────────────

CREATE variance:eng_cloud_jan SET cost_center = cost_center:engineering, category = "Cloud Infra (Variable)", month = d"2026-01-01T00:00:00Z", planned_amount = 2000, actual_amount = 1800, variance_pct = -0.10, status = "ok";
CREATE variance:eng_cloud_feb SET cost_center = cost_center:engineering, category = "Cloud Infra (Variable)", month = d"2026-02-01T00:00:00Z", planned_amount = 2000, actual_amount = 4200, variance_pct = 1.10, status = "flagged";
CREATE variance:eng_cloud_mar SET cost_center = cost_center:engineering, category = "Cloud Infra (Variable)", month = d"2026-03-01T00:00:00Z", planned_amount = 2500, actual_amount = 2800, variance_pct = 0.12, status = "flagged";

CREATE variance:mkt_ads_jan SET cost_center = cost_center:marketing, category = "Ads", month = d"2026-01-01T00:00:00Z", planned_amount = 15000, actual_amount = 15000, variance_pct = 0.0, status = "ok";
CREATE variance:mkt_ads_feb SET cost_center = cost_center:marketing, category = "Ads", month = d"2026-02-01T00:00:00Z", planned_amount = 18000, actual_amount = 23000, variance_pct = 0.2778, status = "flagged";
CREATE variance:mkt_ads_mar SET cost_center = cost_center:marketing, category = "Ads", month = d"2026-03-01T00:00:00Z", planned_amount = 12000, actual_amount = 11000, variance_pct = -0.0833, status = "ok";

CREATE variance:mkt_events_feb SET cost_center = cost_center:marketing, category = "Events", month = d"2026-02-01T00:00:00Z", planned_amount = 5000, actual_amount = 4800, variance_pct = -0.04, status = "ok";

CREATE variance:sales_travel_jan SET cost_center = cost_center:sales, category = "Travel", month = d"2026-01-01T00:00:00Z", planned_amount = 3000, actual_amount = 2800, variance_pct = -0.0667, status = "ok";
CREATE variance:sales_travel_feb SET cost_center = cost_center:sales, category = "Travel", month = d"2026-02-01T00:00:00Z", planned_amount = 4000, actual_amount = 4600, variance_pct = 0.15, status = "flagged";
CREATE variance:sales_travel_mar SET cost_center = cost_center:sales, category = "Travel", month = d"2026-03-01T00:00:00Z", planned_amount = 3000, actual_amount = 2500, variance_pct = -0.1667, status = "ok";

CREATE variance:ga_legal_jan SET cost_center = cost_center:ga, category = "Legal", month = d"2026-01-01T00:00:00Z", planned_amount = 2000, actual_amount = 1800, variance_pct = -0.10, status = "ok";
CREATE variance:ga_legal_mar SET cost_center = cost_center:ga, category = "Legal", month = d"2026-03-01T00:00:00Z", planned_amount = 8000, actual_amount = 12000, variance_pct = 0.50, status = "flagged";

-- ── Bank Account ────────────────────────────────────────────

CREATE bank_account:main SET bank_name = "Deutsche Bank", iban = "DE89370400440532013000", bic = "COBADEFFXXX", currency = "EUR", current_balance = 485000;

-- ── Graph Relations (ontology edges) ────────────────────────

-- Legal chain
RELATE official_founding:main -> requires -> company_agreement:main;
RELATE official_founding:main -> requires -> notary_appointment:founding;

-- Teams -> members
RELATE team:engineering -> has_member -> employee:clara;
RELATE team:engineering -> has_member -> employee:max;
RELATE team:engineering -> has_member -> employee:lena;
RELATE team:marketing -> has_member -> employee:david;
RELATE team:sales -> has_member -> employee:bob;
RELATE team:ga -> has_member -> employee:alice;

-- Teams -> cost centers
RELATE team:engineering -> maps_to -> cost_center:engineering;
RELATE team:marketing -> maps_to -> cost_center:marketing;
RELATE team:sales -> maps_to -> cost_center:sales;
RELATE team:ga -> maps_to -> cost_center:ga;

-- Cost center -> financial items
RELATE cost_center:engineering -> owns -> fixed_expense:clara_salary;
RELATE cost_center:engineering -> owns -> fixed_expense:max_salary;
RELATE cost_center:engineering -> owns -> fixed_expense:lena_salary;
RELATE cost_center:engineering -> owns -> fixed_expense:aws_reserved;
RELATE cost_center:marketing -> owns -> fixed_expense:david_salary;
RELATE cost_center:ga -> owns -> fixed_expense:office_rent;
RELATE cost_center:ga -> owns -> fixed_expense:software;

-- Share ownership
RELATE employee:alice -> owns -> company_share:alice_shares;
RELATE employee:bob -> owns -> company_share:bob_shares;
