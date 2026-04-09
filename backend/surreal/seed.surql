-- =============================================================
-- Seed data for Acme Startup GmbH (SurrealDB database: acme_startup_gmbh)
-- =============================================================

-- ── Teams ───────────────────────────────────────────────────

CREATE team:engineering SET name = "Engineering", department = "Engineering", location = "Berlin", personio_department_id = 11330177;
CREATE team:marketing SET name = "Marketing", department = "Marketing", location = "Berlin", personio_department_id = 11330168;
CREATE team:sales SET name = "Sales", department = "Sales", location = "Berlin", personio_department_id = 11330169;
CREATE team:ga SET name = "G&A", department = "General & Admin", location = "Berlin", personio_department_id = 11330159;

-- ── Employees / Founders ────────────────────────────────────
-- Name, email, status, salary, contracts all live in Personio.
-- SurrealDB only stores the graph node with startup-specific fields.

CREATE employee:tom SET
  personio_employee_id = 36262438,
  user_id = "22222222-2222-2222-2222-222222222222",
  team = team:ga,
  member_type = "majority_founder",
  vesting_period_months = 48,
  vesting_cliff_months = 12;

CREATE employee:alexander SET
  personio_employee_id = 36238338,
  user_id = "33333333-3333-3333-3333-333333333333",
  team = team:sales,
  member_type = "minority_founder",
  vesting_period_months = 48,
  vesting_cliff_months = 12;

CREATE employee:sina SET
  personio_employee_id = 36238337,
  user_id = "44444444-4444-4444-4444-444444444444",
  team = team:engineering,
  member_type = "employee";

CREATE employee:michael SET
  personio_employee_id = 36238336,
  user_id = "55555555-5555-5555-5555-555555555555",
  team = team:marketing,
  member_type = "employee";

CREATE employee:luisa SET
  personio_employee_id = 36238335,
  team = team:engineering,
  member_type = "employee";

CREATE employee:lars SET
  personio_employee_id = 36238334,
  team = team:engineering,
  member_type = "employee";

-- salary records REMOVED — compensation data fetched from Personio

-- ── Equity ──────────────────────────────────────────────────

CREATE captable:main SET total_shares = 25000, shares_issued = 25000, shares_reserved = 0;

CREATE company_share:tom_shares SET
  captable = captable:main, shareholder_name = "Tom Last",
  shareholder_user_id = "22222222-2222-2222-2222-222222222222",
  share_count = 15000, nominal_value = 1.00, percentage = 60.0, share_class = "founder";

CREATE company_share:alexander_shares SET
  captable = captable:main, shareholder_name = "Alexander Bergmann",
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

CREATE cost_center:engineering SET team = team:engineering, name = "Engineering", owner_email = "sina.meier@personio-sample.com", personio_cost_center_id = 201;
CREATE cost_center:marketing SET team = team:marketing, name = "Marketing", owner_email = "michael.miller@personio-sample.com", personio_cost_center_id = 202;
CREATE cost_center:sales SET team = team:sales, name = "Sales", owner_email = "alexander.bergmann@personio-sample.com", personio_cost_center_id = 203;
CREATE cost_center:ga SET team = team:ga, name = "G&A", owner_email = "tom@elbtech.dev", personio_cost_center_id = 204;

-- ── Fixed Expenses ──────────────────────────────────────────

CREATE fixed_expense:sina_salary SET cost_center = cost_center:engineering, name = "Sina Meier - VP Engineering", amount = 9500, start_date = d"2025-01-01T00:00:00Z", source_system = "personio";
CREATE fixed_expense:luisa_salary SET cost_center = cost_center:engineering, name = "Luisa Riley - Senior Dev", amount = 7500, start_date = d"2025-01-01T00:00:00Z", source_system = "personio";
CREATE fixed_expense:lars_salary SET cost_center = cost_center:engineering, name = "Lars Pressly - Dev", amount = 5500, start_date = d"2025-06-01T00:00:00Z", source_system = "personio";
CREATE fixed_expense:aws_reserved SET cost_center = cost_center:engineering, name = "AWS Reserved Instances", amount = 3200, start_date = d"2025-01-01T00:00:00Z", end_date = d"2026-12-01T00:00:00Z";
CREATE fixed_expense:michael_salary SET cost_center = cost_center:marketing, name = "Michael Miller - Head of Marketing", amount = 8000, start_date = d"2025-01-01T00:00:00Z", source_system = "personio";
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

-- ── CRM (references to HubSpot) ────────────────────────────

CREATE lead:widgetco SET
  hubspot_contact_id = "754696181959",
  notes = "Met at SaaStr, strong interest in enterprise tier";

CREATE lead:dataflow SET
  hubspot_contact_id = "754740826356",
  notes = "Inbound from website, German mid-market";

CREATE lead:cloudnine SET
  hubspot_contact_id = "754711973109",
  notes = "Referral from investor network";

CREATE opportunity:widgetco_enterprise SET
  hubspot_deal_id = "498383016160",
  lead = lead:widgetco,
  owner_user_id = "33333333-3333-3333-3333-333333333333",
  notes = "Enterprise pilot discussed, Q2 close expected";

CREATE opportunity:dataflow_annual SET
  hubspot_deal_id = "498369406165",
  lead = lead:dataflow,
  owner_user_id = "33333333-3333-3333-3333-333333333333",
  notes = "Annual license, presentation scheduled";

CREATE opportunity:cloudnine_platform SET
  hubspot_deal_id = "498344131770",
  lead = lead:cloudnine,
  owner_user_id = "33333333-3333-3333-3333-333333333333",
  notes = "Closed won - platform deal";

CREATE sale:cloudnine_closed SET
  hubspot_deal_id = "498344131770",
  opportunity = opportunity:cloudnine_platform,
  invoice_ref = "INV-2026-001",
  notes = "First enterprise customer";

CREATE likelihood_of_success:widgetco SET
  opportunity = opportunity:widgetco_enterprise,
  probability_pct = 65.0,
  basis = "Strong champion, budget confirmed, timeline Q2",
  assessed_by = "alexander";

CREATE likelihood_of_success:dataflow SET
  opportunity = opportunity:dataflow_annual,
  probability_pct = 40.0,
  basis = "Early stage, presentation not yet done",
  assessed_by = "alexander";

-- ── Graph Relations (ontology edges) ────────────────────────

-- Legal chain
RELATE official_founding:main -> requires -> company_agreement:main;
RELATE official_founding:main -> requires -> notary_appointment:founding;

-- Teams -> members
RELATE team:engineering -> has_member -> employee:sina;
RELATE team:engineering -> has_member -> employee:luisa;
RELATE team:engineering -> has_member -> employee:lars;
RELATE team:marketing -> has_member -> employee:michael;
RELATE team:sales -> has_member -> employee:alexander;
RELATE team:ga -> has_member -> employee:tom;

-- Teams -> cost centers
RELATE team:engineering -> maps_to -> cost_center:engineering;
RELATE team:marketing -> maps_to -> cost_center:marketing;
RELATE team:sales -> maps_to -> cost_center:sales;
RELATE team:ga -> maps_to -> cost_center:ga;

-- Cost center -> financial items
RELATE cost_center:engineering -> owns -> fixed_expense:sina_salary;
RELATE cost_center:engineering -> owns -> fixed_expense:luisa_salary;
RELATE cost_center:engineering -> owns -> fixed_expense:lars_salary;
RELATE cost_center:engineering -> owns -> fixed_expense:aws_reserved;
RELATE cost_center:marketing -> owns -> fixed_expense:michael_salary;
RELATE cost_center:ga -> owns -> fixed_expense:office_rent;
RELATE cost_center:ga -> owns -> fixed_expense:software;

-- Share ownership
RELATE employee:tom -> owns -> company_share:tom_shares;
RELATE employee:alexander -> owns -> company_share:alexander_shares;

-- Lead -> opportunity -> sale chain
RELATE lead:widgetco -> converts_to -> opportunity:widgetco_enterprise;
RELATE lead:dataflow -> converts_to -> opportunity:dataflow_annual;
RELATE lead:cloudnine -> converts_to -> opportunity:cloudnine_platform;
RELATE opportunity:cloudnine_platform -> converts_to -> sale:cloudnine_closed;
