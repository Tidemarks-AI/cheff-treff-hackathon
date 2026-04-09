// Hydration layer — merges SurrealDB graph nodes with external API data.
// When a table has external references (personio_employee_id, hubspot_contact_id, etc.),
// this module fetches the live data and returns a unified object.

import {
  listEmployees,
  getEmployee,
  getCompensation,
  isPersonioConfigured,
  type PersonioEmployee,
  type PersonioCompensation,
} from "./personio.js";
import {
  listContacts,
  getContact,
  listDeals,
  getDeal,
  isHubSpotConfigured,
  type HubSpotContact,
  type HubSpotDeal,
} from "./hubspot.js";

// ── Simple in-memory cache (TTL-based) ─────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 30_000; // 30 seconds

function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.data as T;
  if (entry) cache.delete(key);
  return undefined;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── Tables that have external data ──────────────────────────

export const EXTERNAL_TABLES: Record<string, "personio" | "hubspot"> = {
  employee: "personio",
  lead: "hubspot",
  opportunity: "hubspot",
  sale: "hubspot",
};

export function isExternalTable(table: string): boolean {
  return table in EXTERNAL_TABLES;
}

// ── Employee hydration (Personio) ───────────────────────────

export interface HydratedEmployee {
  // SurrealDB fields
  id: string;
  personio_employee_id: number | null;
  user_id: string | null;
  team: string | null;
  member_type: string;
  vesting_period_months: number | null;
  vesting_cliff_months: number | null;
  // Personio fields
  full_name: string | null;
  email: string | null;
  position: string | null;
  department: string | null;
  status: string | null;
  hire_date: string | null;
  _external: "personio" | null;
}

export async function hydrateEmployees(surrealRecords: any[]): Promise<HydratedEmployee[]> {
  if (!isPersonioConfigured()) {
    return surrealRecords.map((r) => ({
      ...r,
      full_name: null,
      email: null,
      position: null,
      department: null,
      status: null,
      hire_date: null,
      _external: null,
    }));
  }

  // Batch-fetch all employees from Personio
  const cacheKey = "personio:employees:all";
  let personioEmployees = getCached<PersonioEmployee[]>(cacheKey);
  if (!personioEmployees) {
    try {
      personioEmployees = await listEmployees();
      setCache(cacheKey, personioEmployees);
    } catch (err) {
      console.error("Failed to fetch Personio employees, returning SurrealDB-only data:", err);
      return surrealRecords.map((r) => ({
        ...r,
        full_name: null,
        email: null,
        position: null,
        department: null,
        status: null,
        hire_date: null,
        _external: null,
      }));
    }
  }

  const byId = new Map(personioEmployees.map((e) => [e.id, e]));

  return surrealRecords.map((r) => {
    const p = r.personio_employee_id ? byId.get(r.personio_employee_id) : undefined;
    return {
      ...r,
      full_name: p ? `${p.first_name} ${p.last_name}` : null,
      email: p?.email ?? null,
      position: p?.position ?? null,
      department: p?.department ?? null,
      status: p?.status ?? null,
      hire_date: p?.hire_date ?? null,
      _external: p ? ("personio" as const) : null,
    };
  });
}

export async function hydrateOneEmployee(surrealRecord: any): Promise<HydratedEmployee> {
  const results = await hydrateEmployees([surrealRecord]);
  return results[0];
}

// ── Compensation (Personio — replaces removed salary table) ─

export async function getEmployeeCompensation(
  personioEmployeeId: number
): Promise<PersonioCompensation | null> {
  if (!isPersonioConfigured()) return null;

  const cacheKey = `personio:compensation:${personioEmployeeId}`;
  const cached = getCached<PersonioCompensation>(cacheKey);
  if (cached) return cached;

  try {
    const comp = await getCompensation(personioEmployeeId);
    setCache(cacheKey, comp);
    return comp;
  } catch (err) {
    console.error(`Failed to fetch compensation for Personio employee ${personioEmployeeId}:`, err);
    return null;
  }
}

// ── Lead hydration (HubSpot Contacts) ───────────────────────

export interface HydratedLead {
  // SurrealDB fields
  id: string;
  hubspot_contact_id: string | null;
  notes: string | null;
  // HubSpot fields
  contact_name: string | null;
  contact_email: string | null;
  company_name: string | null;
  source: string | null;
  status: string | null;
  _external: "hubspot" | null;
}

export async function hydrateLeads(surrealRecords: any[]): Promise<HydratedLead[]> {
  if (!isHubSpotConfigured()) {
    return surrealRecords.map((r) => ({
      ...r,
      contact_name: null,
      contact_email: null,
      company_name: null,
      source: null,
      status: null,
      _external: null,
    }));
  }

  const cacheKey = "hubspot:contacts:all";
  let contacts = getCached<HubSpotContact[]>(cacheKey);
  if (!contacts) {
    try {
      contacts = await listContacts();
      setCache(cacheKey, contacts);
    } catch (err) {
      console.error("Failed to fetch HubSpot contacts:", err);
      return surrealRecords.map((r) => ({
        ...r,
        contact_name: null,
        contact_email: null,
        company_name: null,
        source: null,
        status: null,
        _external: null,
      }));
    }
  }

  const byId = new Map(contacts.map((c) => [c.id, c]));

  return surrealRecords.map((r) => {
    const c = r.hubspot_contact_id ? byId.get(r.hubspot_contact_id) : undefined;
    return {
      ...r,
      contact_name: c ? `${c.firstname} ${c.lastname}`.trim() : null,
      contact_email: c?.email ?? null,
      company_name: c?.company ?? null,
      source: c?.lifecyclestage ?? null,
      status: c?.hs_lead_status ?? null,
      _external: c ? ("hubspot" as const) : null,
    };
  });
}

// ── Opportunity hydration (HubSpot Deals) ───────────────────

export interface HydratedOpportunity {
  // SurrealDB fields
  id: string;
  hubspot_deal_id: string | null;
  lead: string | null;
  owner_user_id: string | null;
  notes: string | null;
  // HubSpot fields
  name: string | null;
  deal_value: number | null;
  currency: string | null;
  stage: string | null;
  expected_close_date: string | null;
  _external: "hubspot" | null;
}

export async function hydrateOpportunities(surrealRecords: any[]): Promise<HydratedOpportunity[]> {
  if (!isHubSpotConfigured()) {
    return surrealRecords.map((r) => ({
      ...r,
      name: null,
      deal_value: null,
      currency: null,
      stage: null,
      expected_close_date: null,
      _external: null,
    }));
  }

  const cacheKey = "hubspot:deals:all";
  let deals = getCached<HubSpotDeal[]>(cacheKey);
  if (!deals) {
    try {
      deals = await listDeals();
      setCache(cacheKey, deals);
    } catch (err) {
      console.error("Failed to fetch HubSpot deals:", err);
      return surrealRecords.map((r) => ({
        ...r,
        name: null,
        deal_value: null,
        currency: null,
        stage: null,
        expected_close_date: null,
        _external: null,
      }));
    }
  }

  const byId = new Map(deals.map((d) => [d.id, d]));

  return surrealRecords.map((r) => {
    const d = r.hubspot_deal_id ? byId.get(r.hubspot_deal_id) : undefined;
    return {
      ...r,
      name: d?.dealname ?? null,
      deal_value: d?.amount ?? null,
      currency: d?.deal_currency_code ?? null,
      stage: d?.dealstage ?? null,
      expected_close_date: d?.closedate ?? null,
      _external: d ? ("hubspot" as const) : null,
    };
  });
}

// ── Sale hydration (HubSpot Deals — closed won) ────────────

export interface HydratedSale {
  // SurrealDB fields
  id: string;
  hubspot_deal_id: string | null;
  opportunity: string | null;
  invoice_ref: string | null;
  notes: string | null;
  // HubSpot fields
  amount: number | null;
  currency: string | null;
  closed_at: string | null;
  deal_name: string | null;
  _external: "hubspot" | null;
}

export async function hydrateSales(surrealRecords: any[]): Promise<HydratedSale[]> {
  if (!isHubSpotConfigured()) {
    return surrealRecords.map((r) => ({
      ...r,
      amount: null,
      currency: null,
      closed_at: null,
      deal_name: null,
      _external: null,
    }));
  }

  // Reuse the same deals cache as opportunities
  const cacheKey = "hubspot:deals:all";
  let deals = getCached<HubSpotDeal[]>(cacheKey);
  if (!deals) {
    try {
      deals = await listDeals();
      setCache(cacheKey, deals);
    } catch (err) {
      console.error("Failed to fetch HubSpot deals:", err);
      return surrealRecords.map((r) => ({
        ...r,
        amount: null,
        currency: null,
        closed_at: null,
        deal_name: null,
        _external: null,
      }));
    }
  }

  const byId = new Map(deals.map((d) => [d.id, d]));

  return surrealRecords.map((r) => {
    const d = r.hubspot_deal_id ? byId.get(r.hubspot_deal_id) : undefined;
    return {
      ...r,
      amount: d?.amount ?? null,
      currency: d?.deal_currency_code ?? null,
      closed_at: d?.closedate ?? null,
      deal_name: d?.dealname ?? null,
      _external: d ? ("hubspot" as const) : null,
    };
  });
}

// ── Generic hydrate dispatcher ──────────────────────────────

export async function hydrateTable(table: string, records: any[]): Promise<any[]> {
  switch (table) {
    case "employee":
      return hydrateEmployees(records);
    case "lead":
      return hydrateLeads(records);
    case "opportunity":
      return hydrateOpportunities(records);
    case "sale":
      return hydrateSales(records);
    default:
      return records;
  }
}
