// HubSpot CRM API client
// Docs: https://developers.hubspot.com/docs/api/crm

export interface HubSpotContact {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  company: string;
  lifecyclestage: string;
  hs_lead_status: string;
}

export interface HubSpotDeal {
  id: string;
  dealname: string;
  amount: number;
  dealstage: string;
  closedate: string;
  deal_currency_code: string;
  hubspot_owner_id: string;
}

const BASE_URL = "https://api.hubapi.com";

function getAccessToken(): string {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    throw new Error("HUBSPOT_ACCESS_TOKEN must be set");
  }
  return token;
}

async function hubspotFetch<T>(path: string): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`HubSpot API error: ${res.status} ${res.statusText} on ${path}`);
  }

  return res.json() as Promise<T>;
}

function parseContact(raw: any): HubSpotContact {
  const p = raw.properties ?? {};
  return {
    id: raw.id,
    firstname: p.firstname ?? "",
    lastname: p.lastname ?? "",
    email: p.email ?? "",
    company: p.company ?? "",
    lifecyclestage: p.lifecyclestage ?? "",
    hs_lead_status: p.hs_lead_status ?? "",
  };
}

function parseDeal(raw: any): HubSpotDeal {
  const p = raw.properties ?? {};
  return {
    id: raw.id,
    dealname: p.dealname ?? "",
    amount: Number(p.amount) || 0,
    dealstage: p.dealstage ?? "",
    closedate: p.closedate ?? "",
    deal_currency_code: p.deal_currency_code ?? "EUR",
    hubspot_owner_id: p.hubspot_owner_id ?? "",
  };
}

const CONTACT_PROPERTIES = "firstname,lastname,email,company,lifecyclestage,hs_lead_status";
const DEAL_PROPERTIES = "dealname,amount,dealstage,closedate,deal_currency_code,hubspot_owner_id";

export async function listContacts(): Promise<HubSpotContact[]> {
  const body = await hubspotFetch<{ results: any[] }>(
    `/crm/v3/objects/contacts?properties=${CONTACT_PROPERTIES}&limit=100`
  );
  return body.results.map(parseContact);
}

export async function getContact(contactId: string): Promise<HubSpotContact> {
  const body = await hubspotFetch<any>(
    `/crm/v3/objects/contacts/${contactId}?properties=${CONTACT_PROPERTIES}`
  );
  return parseContact(body);
}

export async function listDeals(): Promise<HubSpotDeal[]> {
  const body = await hubspotFetch<{ results: any[] }>(
    `/crm/v3/objects/deals?properties=${DEAL_PROPERTIES}&limit=100`
  );
  return body.results.map(parseDeal);
}

export async function getDeal(dealId: string): Promise<HubSpotDeal> {
  const body = await hubspotFetch<any>(
    `/crm/v3/objects/deals/${dealId}?properties=${DEAL_PROPERTIES}`
  );
  return parseDeal(body);
}

export function isHubSpotConfigured(): boolean {
  return !!process.env.HUBSPOT_ACCESS_TOKEN;
}
