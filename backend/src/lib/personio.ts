// Personio API client
// Docs: https://developer.personio.de/reference/introduction

export interface PersonioEmployee {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  department: string;
  office: string;
  hire_date: string;
  status: string;
  weekly_hours: number;
}

export interface PersonioCompensation {
  employee_id: number;
  fixed_salary: number;
  currency: string;
}

interface PersonioAuthResponse {
  success: boolean;
  data: { token: string };
}

interface PersonioListResponse<T> {
  success: boolean;
  data: T[];
}

interface PersonioSingleResponse<T> {
  success: boolean;
  data: T;
}

const BASE_URL = "https://api.personio.de/v1";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function authenticate(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const clientId = process.env.PERSONIO_CLIENT_ID;
  const clientSecret = process.env.PERSONIO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PERSONIO_CLIENT_ID and PERSONIO_CLIENT_SECRET must be set");
  }

  const res = await fetch(`${BASE_URL}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  });

  if (!res.ok) {
    throw new Error(`Personio auth failed: ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as PersonioAuthResponse;
  cachedToken = body.data.token;
  // Personio tokens last ~5 minutes; refresh after 4
  tokenExpiresAt = Date.now() + 4 * 60 * 1000;
  return cachedToken;
}

async function personioFetch<T>(path: string): Promise<T> {
  const token = await authenticate();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Personio API error: ${res.status} ${res.statusText} on ${path}`);
  }

  return res.json() as Promise<T>;
}

function parseEmployeeAttributes(raw: any): PersonioEmployee {
  const attr = raw.attributes;
  return {
    id: attr.id?.value ?? raw.id,
    first_name: attr.first_name?.value ?? "",
    last_name: attr.last_name?.value ?? "",
    email: attr.email?.value ?? "",
    position: attr.position?.value ?? "",
    department: attr.department?.value?.attributes?.name ?? "",
    office: attr.office?.value?.attributes?.name ?? "",
    hire_date: attr.hire_date?.value ?? "",
    status: attr.status?.value ?? "",
    weekly_hours: attr.weekly_hours?.value ?? 0,
  };
}

export async function listEmployees(): Promise<PersonioEmployee[]> {
  const body = await personioFetch<PersonioListResponse<any>>(
    "/company/employees?limit=200"
  );
  return body.data.map(parseEmployeeAttributes);
}

export async function getEmployee(personioId: number): Promise<PersonioEmployee> {
  const body = await personioFetch<PersonioSingleResponse<any>>(
    `/company/employees/${personioId}`
  );
  return parseEmployeeAttributes(body.data);
}

export async function getCompensation(personioId: number): Promise<PersonioCompensation> {
  // The employee endpoint returns compensation under attributes.fix_salary
  const body = await personioFetch<PersonioSingleResponse<any>>(
    `/company/employees/${personioId}`
  );
  const attr = body.data.attributes;
  return {
    employee_id: personioId,
    fixed_salary: attr.fix_salary?.value ?? 0,
    currency: attr.fix_salary_interval?.value === "monthly" ? "EUR" : "EUR",
  };
}

export function isPersonioConfigured(): boolean {
  return !!(process.env.PERSONIO_CLIENT_ID && process.env.PERSONIO_CLIENT_SECRET);
}
