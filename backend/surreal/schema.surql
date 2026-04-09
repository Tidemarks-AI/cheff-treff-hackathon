-- =============================================================
-- Founders Ontology Schema for SurrealDB
-- Applied per-company database (no company FK needed)
--
-- HR data (employees, salaries, contracts) lives in Personio.
-- CRM data (contacts, deals) lives in HubSpot.
-- SurrealDB stores the graph / ontology layer with external IDs.
-- =============================================================

-- ── HR ──────────────────────────────────────────────────────

DEFINE TABLE team SCHEMAFULL;
DEFINE FIELD name ON team TYPE string;
DEFINE FIELD department ON team TYPE option<string>;
DEFINE FIELD location ON team TYPE option<string>;
DEFINE FIELD personio_department_id ON team TYPE option<int>;
DEFINE FIELD personio_team_id ON team TYPE option<int>;
DEFINE FIELD created_at ON team TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON team TYPE datetime VALUE time::now();

DEFINE TABLE employee SCHEMAFULL;
DEFINE FIELD personio_employee_id ON employee TYPE option<int>;
DEFINE FIELD user_id ON employee TYPE option<string>;
DEFINE FIELD team ON employee TYPE option<record<team>>;
DEFINE FIELD member_type ON employee TYPE "majority_founder" | "minority_founder" | "employee" DEFAULT "employee";
DEFINE FIELD vesting_period_months ON employee TYPE option<int>;
DEFINE FIELD vesting_cliff_months ON employee TYPE option<int>;
DEFINE FIELD created_at ON employee TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON employee TYPE datetime VALUE time::now();

-- salary table REMOVED — compensation data fetched from Personio
-- employment_contract table REMOVED — contract data fetched from Personio

DEFINE TABLE job_offer SCHEMAFULL;
DEFINE FIELD team ON job_offer TYPE option<record<team>>;
DEFINE FIELD position_title ON job_offer TYPE string;
DEFINE FIELD offered_salary ON job_offer TYPE option<decimal>;
DEFINE FIELD currency ON job_offer TYPE string DEFAULT "EUR";
DEFINE FIELD status ON job_offer TYPE "draft" | "sent" | "accepted" | "declined" DEFAULT "draft";
DEFINE FIELD personio_application_id ON job_offer TYPE option<int>;
DEFINE FIELD created_at ON job_offer TYPE datetime DEFAULT time::now();

-- ── Equity ──────────────────────────────────────────────────

DEFINE TABLE captable SCHEMAFULL;
DEFINE FIELD total_shares ON captable TYPE int DEFAULT 0;
DEFINE FIELD shares_issued ON captable TYPE int DEFAULT 0;
DEFINE FIELD shares_reserved ON captable TYPE int DEFAULT 0;
DEFINE FIELD last_updated ON captable TYPE datetime DEFAULT time::now();
DEFINE FIELD created_at ON captable TYPE datetime DEFAULT time::now();

DEFINE TABLE company_share SCHEMAFULL;
DEFINE FIELD captable ON company_share TYPE record<captable>;
DEFINE FIELD shareholder_name ON company_share TYPE string;
DEFINE FIELD shareholder_user_id ON company_share TYPE option<string>;
DEFINE FIELD share_count ON company_share TYPE int;
DEFINE FIELD nominal_value ON company_share TYPE decimal;
DEFINE FIELD percentage ON company_share TYPE float;
DEFINE FIELD share_class ON company_share TYPE "ordinary" | "preferred" | "founder";
DEFINE FIELD created_at ON company_share TYPE datetime DEFAULT time::now();

DEFINE TABLE share_capital SCHEMAFULL;
DEFINE FIELD amount ON share_capital TYPE decimal;
DEFINE FIELD currency ON share_capital TYPE string DEFAULT "EUR";
DEFINE FIELD minimum_required ON share_capital TYPE bool DEFAULT true;
DEFINE FIELD paid_in ON share_capital TYPE bool DEFAULT false;
DEFINE FIELD created_at ON share_capital TYPE datetime DEFAULT time::now();

-- ── Legal ───────────────────────────────────────────────────

DEFINE TABLE official_founding SCHEMAFULL;
DEFINE FIELD status ON official_founding TYPE "pending" | "in_progress" | "completed" DEFAULT "pending";
DEFINE FIELD completed_at ON official_founding TYPE option<datetime>;
DEFINE FIELD notes ON official_founding TYPE option<string>;
DEFINE FIELD created_at ON official_founding TYPE datetime DEFAULT time::now();

DEFINE TABLE company_agreement SCHEMAFULL;
DEFINE FIELD document_url ON company_agreement TYPE option<string>;
DEFINE FIELD signed_at ON company_agreement TYPE option<datetime>;
DEFINE FIELD notes ON company_agreement TYPE option<string>;
DEFINE FIELD created_at ON company_agreement TYPE datetime DEFAULT time::now();

DEFINE TABLE ca_clause SCHEMAFULL;
DEFINE FIELD agreement ON ca_clause TYPE record<company_agreement>;
DEFINE FIELD title ON ca_clause TYPE string;
DEFINE FIELD body ON ca_clause TYPE option<string>;
DEFINE FIELD created_at ON ca_clause TYPE datetime DEFAULT time::now();

DEFINE TABLE shareholder_agreement SCHEMAFULL;
DEFINE FIELD document_url ON shareholder_agreement TYPE option<string>;
DEFINE FIELD signed_at ON shareholder_agreement TYPE option<datetime>;
DEFINE FIELD notes ON shareholder_agreement TYPE option<string>;
DEFINE FIELD created_at ON shareholder_agreement TYPE datetime DEFAULT time::now();

DEFINE TABLE sha_clause SCHEMAFULL;
DEFINE FIELD agreement ON sha_clause TYPE record<shareholder_agreement>;
DEFINE FIELD title ON sha_clause TYPE string;
DEFINE FIELD body ON sha_clause TYPE option<string>;
DEFINE FIELD created_at ON sha_clause TYPE datetime DEFAULT time::now();

DEFINE TABLE notary_appointment SCHEMAFULL;
DEFINE FIELD scheduled_at ON notary_appointment TYPE option<datetime>;
DEFINE FIELD notary_name ON notary_appointment TYPE option<string>;
DEFINE FIELD notary_office ON notary_appointment TYPE option<string>;
DEFINE FIELD status ON notary_appointment TYPE "scheduled" | "completed" | "cancelled" DEFAULT "scheduled";
DEFINE FIELD notes ON notary_appointment TYPE option<string>;
DEFINE FIELD created_at ON notary_appointment TYPE datetime DEFAULT time::now();

DEFINE TABLE ihk_registration SCHEMAFULL;
DEFINE FIELD registration_number ON ihk_registration TYPE option<string>;
DEFINE FIELD status ON ihk_registration TYPE "pending" | "completed" DEFAULT "pending";
DEFINE FIELD submitted_at ON ihk_registration TYPE option<datetime>;
DEFINE FIELD completed_at ON ihk_registration TYPE option<datetime>;
DEFINE FIELD created_at ON ihk_registration TYPE datetime DEFAULT time::now();

DEFINE TABLE tax_office_account SCHEMAFULL;
DEFINE FIELD tax_number ON tax_office_account TYPE option<string>;
DEFINE FIELD vat_id ON tax_office_account TYPE option<string>;
DEFINE FIELD status ON tax_office_account TYPE "pending" | "completed" DEFAULT "pending";
DEFINE FIELD registered_at ON tax_office_account TYPE option<datetime>;
DEFINE FIELD created_at ON tax_office_account TYPE datetime DEFAULT time::now();

DEFINE TABLE transparency_register SCHEMAFULL;
DEFINE FIELD status ON transparency_register TYPE "pending" | "completed" DEFAULT "pending";
DEFINE FIELD submitted_at ON transparency_register TYPE option<datetime>;
DEFINE FIELD completed_at ON transparency_register TYPE option<datetime>;
DEFINE FIELD created_at ON transparency_register TYPE datetime DEFAULT time::now();

DEFINE TABLE vat_return_registration SCHEMAFULL;
DEFINE FIELD tax_account ON vat_return_registration TYPE record<tax_office_account>;
DEFINE FIELD filing_frequency ON vat_return_registration TYPE "monthly" | "quarterly" DEFAULT "monthly";
DEFINE FIELD status ON vat_return_registration TYPE "pending" | "completed" DEFAULT "pending";
DEFINE FIELD created_at ON vat_return_registration TYPE datetime DEFAULT time::now();

-- ── Finance ─────────────────────────────────────────────────

DEFINE TABLE cost_center SCHEMAFULL;
DEFINE FIELD team ON cost_center TYPE option<record<team>>;
DEFINE FIELD name ON cost_center TYPE string;
DEFINE FIELD owner_email ON cost_center TYPE option<string>;
DEFINE FIELD personio_cost_center_id ON cost_center TYPE option<int>;
DEFINE FIELD created_at ON cost_center TYPE datetime DEFAULT time::now();

DEFINE TABLE budget_line SCHEMAFULL;
DEFINE FIELD cost_center ON budget_line TYPE record<cost_center>;
DEFINE FIELD category ON budget_line TYPE string;
DEFINE FIELD month ON budget_line TYPE datetime;
DEFINE FIELD planned_amount ON budget_line TYPE decimal;
DEFINE FIELD currency ON budget_line TYPE string DEFAULT "EUR";
DEFINE FIELD notes ON budget_line TYPE option<string>;
DEFINE FIELD created_at ON budget_line TYPE datetime DEFAULT time::now();

DEFINE TABLE costs SCHEMAFULL;
DEFINE FIELD cost_center ON costs TYPE record<cost_center>;
DEFINE FIELD category ON costs TYPE string;
DEFINE FIELD month ON costs TYPE datetime;
DEFINE FIELD actual_amount ON costs TYPE decimal;
DEFINE FIELD source ON costs TYPE "personio" | "hubspot" | "manual" | "fixed_cost" DEFAULT "manual";
DEFINE FIELD source_ref ON costs TYPE option<string>;
DEFINE FIELD description ON costs TYPE option<string>;
DEFINE FIELD created_at ON costs TYPE datetime DEFAULT time::now();

DEFINE TABLE variance SCHEMAFULL;
DEFINE FIELD cost_center ON variance TYPE record<cost_center>;
DEFINE FIELD category ON variance TYPE string;
DEFINE FIELD month ON variance TYPE datetime;
DEFINE FIELD planned_amount ON variance TYPE decimal;
DEFINE FIELD actual_amount ON variance TYPE decimal;
DEFINE FIELD variance_pct ON variance TYPE option<float>;
DEFINE FIELD status ON variance TYPE "ok" | "flagged" | "explained" | "accepted" DEFAULT "ok";
DEFINE FIELD explanation ON variance TYPE option<string>;
DEFINE FIELD updated_at ON variance TYPE datetime VALUE time::now();
DEFINE FIELD created_at ON variance TYPE datetime DEFAULT time::now();

DEFINE TABLE fixed_expense SCHEMAFULL;
DEFINE FIELD cost_center ON fixed_expense TYPE record<cost_center>;
DEFINE FIELD name ON fixed_expense TYPE string;
DEFINE FIELD amount ON fixed_expense TYPE decimal;
DEFINE FIELD currency ON fixed_expense TYPE string DEFAULT "EUR";
DEFINE FIELD frequency ON fixed_expense TYPE "monthly" | "quarterly" | "annual" DEFAULT "monthly";
DEFINE FIELD start_date ON fixed_expense TYPE datetime;
DEFINE FIELD end_date ON fixed_expense TYPE option<datetime>;
DEFINE FIELD auto_renews ON fixed_expense TYPE bool DEFAULT false;
DEFINE FIELD cancellation_notice_days ON fixed_expense TYPE option<int>;
DEFINE FIELD source_system ON fixed_expense TYPE option<string>;
DEFINE FIELD created_at ON fixed_expense TYPE datetime DEFAULT time::now();

DEFINE TABLE variable_expense SCHEMAFULL;
DEFINE FIELD cost_center ON variable_expense TYPE record<cost_center>;
DEFINE FIELD name ON variable_expense TYPE string;
DEFINE FIELD unit_price ON variable_expense TYPE decimal;
DEFINE FIELD currency ON variable_expense TYPE string DEFAULT "EUR";
DEFINE FIELD driver ON variable_expense TYPE option<string>;
DEFINE FIELD driver_metric ON variable_expense TYPE option<"tokens" | "compute_hours" | "api_calls" | "storage_gb" | "seats" | "deals_closed" | "clicks" | "transactions">;
DEFINE FIELD source_system ON variable_expense TYPE option<string>;
DEFINE FIELD last_month_quantity ON variable_expense TYPE option<float>;
DEFINE FIELD trend_pct ON variable_expense TYPE option<float>;
DEFINE FIELD created_at ON variable_expense TYPE datetime DEFAULT time::now();

DEFINE TABLE financial_forecast SCHEMAFULL;
DEFINE FIELD period_start ON financial_forecast TYPE datetime;
DEFINE FIELD period_end ON financial_forecast TYPE datetime;
DEFINE FIELD total_revenue ON financial_forecast TYPE option<decimal>;
DEFINE FIELD total_expense ON financial_forecast TYPE option<decimal>;
DEFINE FIELD notes ON financial_forecast TYPE option<string>;
DEFINE FIELD created_at ON financial_forecast TYPE datetime DEFAULT time::now();

DEFINE TABLE runway_calculation SCHEMAFULL;
DEFINE FIELD cash_on_hand ON runway_calculation TYPE decimal;
DEFINE FIELD monthly_burn_rate ON runway_calculation TYPE decimal;
DEFINE FIELD months_remaining ON runway_calculation TYPE option<float>;
DEFINE FIELD notes ON runway_calculation TYPE option<string>;
DEFINE FIELD created_at ON runway_calculation TYPE datetime DEFAULT time::now();

DEFINE TABLE bank_account SCHEMAFULL;
DEFINE FIELD bank_name ON bank_account TYPE string;
DEFINE FIELD iban ON bank_account TYPE option<string>;
DEFINE FIELD bic ON bank_account TYPE option<string>;
DEFINE FIELD account_type ON bank_account TYPE "business" | "escrow" | "savings" DEFAULT "business";
DEFINE FIELD currency ON bank_account TYPE string DEFAULT "EUR";
DEFINE FIELD current_balance ON bank_account TYPE option<decimal>;
DEFINE FIELD last_synced_at ON bank_account TYPE option<datetime>;
DEFINE FIELD created_at ON bank_account TYPE datetime DEFAULT time::now();

-- ── CRM (references to HubSpot) ────────────────────────────

DEFINE TABLE lead SCHEMAFULL;
DEFINE FIELD hubspot_contact_id ON lead TYPE option<string>;
DEFINE FIELD notes ON lead TYPE option<string>;
DEFINE FIELD created_at ON lead TYPE datetime DEFAULT time::now();

DEFINE TABLE opportunity SCHEMAFULL;
DEFINE FIELD hubspot_deal_id ON opportunity TYPE option<string>;
DEFINE FIELD lead ON opportunity TYPE option<record<lead>>;
DEFINE FIELD owner_user_id ON opportunity TYPE option<string>;
DEFINE FIELD notes ON opportunity TYPE option<string>;
DEFINE FIELD created_at ON opportunity TYPE datetime DEFAULT time::now();

DEFINE TABLE likelihood_of_success SCHEMAFULL;
DEFINE FIELD opportunity ON likelihood_of_success TYPE record<opportunity>;
DEFINE FIELD probability_pct ON likelihood_of_success TYPE float;
DEFINE FIELD basis ON likelihood_of_success TYPE option<string>;
DEFINE FIELD assessed_by ON likelihood_of_success TYPE option<string>;
DEFINE FIELD created_at ON likelihood_of_success TYPE datetime DEFAULT time::now();

DEFINE TABLE sale SCHEMAFULL;
DEFINE FIELD hubspot_deal_id ON sale TYPE option<string>;
DEFINE FIELD opportunity ON sale TYPE option<record<opportunity>>;
DEFINE FIELD invoice_ref ON sale TYPE option<string>;
DEFINE FIELD notes ON sale TYPE option<string>;
DEFINE FIELD created_at ON sale TYPE datetime DEFAULT time::now();

DEFINE TABLE sales_prognosis SCHEMAFULL;
DEFINE FIELD period_start ON sales_prognosis TYPE datetime;
DEFINE FIELD period_end ON sales_prognosis TYPE datetime;
DEFINE FIELD projected_amount ON sales_prognosis TYPE decimal;
DEFINE FIELD currency ON sales_prognosis TYPE string DEFAULT "EUR";
DEFINE FIELD confidence_pct ON sales_prognosis TYPE option<float>;
DEFINE FIELD notes ON sales_prognosis TYPE option<string>;
DEFINE FIELD created_at ON sales_prognosis TYPE datetime DEFAULT time::now();

DEFINE TABLE revenue SCHEMAFULL;
DEFINE FIELD sale ON revenue TYPE option<record<sale>>;
DEFINE FIELD amount ON revenue TYPE decimal;
DEFINE FIELD currency ON revenue TYPE string DEFAULT "EUR";
DEFINE FIELD month ON revenue TYPE datetime;
DEFINE FIELD source ON revenue TYPE option<string>;
DEFINE FIELD description ON revenue TYPE option<string>;
DEFINE FIELD created_at ON revenue TYPE datetime DEFAULT time::now();

DEFINE TABLE revenue_forecast SCHEMAFULL;
DEFINE FIELD month ON revenue_forecast TYPE datetime;
DEFINE FIELD forecasted_amount ON revenue_forecast TYPE decimal;
DEFINE FIELD currency ON revenue_forecast TYPE string DEFAULT "EUR";
DEFINE FIELD basis ON revenue_forecast TYPE option<string>;
DEFINE FIELD created_at ON revenue_forecast TYPE datetime DEFAULT time::now();

-- ── Change Requests ──────────────────────────────────────────

DEFINE TABLE change_request SCHEMAFULL;
DEFINE FIELD status ON change_request TYPE "pending" | "approved" | "rejected" DEFAULT "pending";
DEFINE FIELD received_at ON change_request TYPE datetime DEFAULT time::now();
DEFINE FIELD source_channel ON change_request TYPE string DEFAULT "email";
DEFINE FIELD source_mailbox ON change_request TYPE option<string>;
DEFINE FIELD source_from ON change_request TYPE string;
DEFINE FIELD source_subject ON change_request TYPE string;
DEFINE FIELD source_attachment ON change_request TYPE option<string>;
DEFINE FIELD source_gmail_id ON change_request TYPE option<string>;
DEFINE FIELD proposal_action ON change_request TYPE "create_node" | "update_node";
DEFINE FIELD proposal_target_type ON change_request TYPE string;
DEFINE FIELD proposal_values ON change_request TYPE object;
DEFINE FIELD proposal_edges ON change_request TYPE array DEFAULT [];
DEFINE FIELD reasoning_summary ON change_request TYPE string;
DEFINE FIELD reasoning_confidence ON change_request TYPE float;
DEFINE FIELD reasoning_evidence ON change_request TYPE array DEFAULT [];
DEFINE FIELD policy_triggered ON change_request TYPE array DEFAULT [];
DEFINE FIELD policy_satisfied ON change_request TYPE bool DEFAULT false;
DEFINE FIELD policy_message ON change_request TYPE option<string>;
DEFINE FIELD impact_monthly_burn_delta ON change_request TYPE decimal DEFAULT 0;
DEFINE FIELD impact_annual_cost_delta ON change_request TYPE decimal DEFAULT 0;
DEFINE FIELD impact_runway_months_delta ON change_request TYPE float DEFAULT 0;
DEFINE FIELD impact_forecast_after ON change_request TYPE option<object>;
DEFINE FIELD discord_message_id ON change_request TYPE option<string>;
DEFINE FIELD discord_channel_id ON change_request TYPE option<string>;
DEFINE FIELD resolved_by ON change_request TYPE option<string>;
DEFINE FIELD resolved_at ON change_request TYPE option<datetime>;
DEFINE FIELD created_at ON change_request TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON change_request TYPE datetime VALUE time::now();

DEFINE INDEX idx_change_request_status ON change_request FIELDS status;

-- ── Graph Relations (ontology edges) ────────────────────────

DEFINE TABLE requires TYPE RELATION;
DEFINE FIELD label ON requires TYPE option<string>;
DEFINE FIELD created_at ON requires TYPE datetime DEFAULT time::now();

DEFINE TABLE contains TYPE RELATION;
DEFINE FIELD label ON contains TYPE option<string>;
DEFINE FIELD created_at ON contains TYPE datetime DEFAULT time::now();

DEFINE TABLE owns TYPE RELATION;
DEFINE FIELD label ON owns TYPE option<string>;
DEFINE FIELD created_at ON owns TYPE datetime DEFAULT time::now();

DEFINE TABLE has_member TYPE RELATION;
DEFINE FIELD label ON has_member TYPE option<string>;
DEFINE FIELD created_at ON has_member TYPE datetime DEFAULT time::now();

DEFINE TABLE informs TYPE RELATION;
DEFINE FIELD label ON informs TYPE option<string>;
DEFINE FIELD created_at ON informs TYPE datetime DEFAULT time::now();

DEFINE TABLE generates TYPE RELATION;
DEFINE FIELD label ON generates TYPE option<string>;
DEFINE FIELD created_at ON generates TYPE datetime DEFAULT time::now();

DEFINE TABLE maps_to TYPE RELATION;
DEFINE FIELD label ON maps_to TYPE option<string>;
DEFINE FIELD created_at ON maps_to TYPE datetime DEFAULT time::now();

DEFINE TABLE defines TYPE RELATION;
DEFINE FIELD label ON defines TYPE option<string>;
DEFINE FIELD created_at ON defines TYPE datetime DEFAULT time::now();

DEFINE TABLE converts_to TYPE RELATION;
DEFINE FIELD label ON converts_to TYPE option<string>;
DEFINE FIELD created_at ON converts_to TYPE datetime DEFAULT time::now();

DEFINE TABLE affects TYPE RELATION;
DEFINE FIELD label ON affects TYPE option<string>;
DEFINE FIELD created_at ON affects TYPE datetime DEFAULT time::now();

DEFINE TABLE proposes TYPE RELATION;
DEFINE FIELD label ON proposes TYPE option<string>;
DEFINE FIELD created_at ON proposes TYPE datetime DEFAULT time::now();

-- ── Indexes ─────────────────────────────────────────────────

DEFINE INDEX idx_employee_user_id ON employee FIELDS user_id;
DEFINE INDEX idx_employee_team ON employee FIELDS team;
DEFINE INDEX idx_employee_personio_id ON employee FIELDS personio_employee_id UNIQUE;
DEFINE INDEX idx_cost_center_team ON cost_center FIELDS team;
DEFINE INDEX idx_budget_line_cc ON budget_line FIELDS cost_center;
DEFINE INDEX idx_costs_cc ON costs FIELDS cost_center;
DEFINE INDEX idx_variance_cc ON variance FIELDS cost_center;
DEFINE INDEX idx_fixed_expense_cc ON fixed_expense FIELDS cost_center;
DEFINE INDEX idx_variable_expense_cc ON variable_expense FIELDS cost_center;
DEFINE INDEX idx_lead_hubspot_id ON lead FIELDS hubspot_contact_id UNIQUE;
DEFINE INDEX idx_opportunity_lead ON opportunity FIELDS lead;
DEFINE INDEX idx_opportunity_hubspot_id ON opportunity FIELDS hubspot_deal_id UNIQUE;
DEFINE INDEX idx_sale_opportunity ON sale FIELDS opportunity;
DEFINE INDEX idx_sale_hubspot_id ON sale FIELDS hubspot_deal_id;
DEFINE INDEX idx_company_share_captable ON company_share FIELDS captable;
