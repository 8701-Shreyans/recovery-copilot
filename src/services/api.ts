/**
 * Recovery Copilot API Client
 * Connects the React 19 frontend to the FastAPI backend.
 * Falls back to client-side simulation if the backend is unavailable.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

type RequestOptions = {
  method?: string;
  body?: unknown;
  role?: 'ops' | 'admin';
};

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-User-Role': opts.role || 'ops',
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// --- Case APIs ---

export const CasesAPI = {
  list: (params?: { status?: string; search?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'All Statuses') query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.limit) query.set('limit', String(params.limit));
    return request(`/cases?${query.toString()}`);
  },

  get: (caseId: string) => request(`/cases/${caseId}`),

  ingest: (count = 50, scenarioId = 'baseline') =>
    request(`/cases/ingest?count=${count}&scenario_id=${scenarioId}`, { method: 'POST' }),

  createPromise: (payload: { case_id: string; promise_date: string; promised_amount: number; notes?: string }) =>
    request('/cases/promises', { method: 'POST', body: payload }),
};

// --- Batch Runner APIs ---

export interface BatchRunRequest {
  scenario_id?: string;
  batch_size?: number;
  custom_rules?: {
    max_retries?: number;
    cooldown_hours?: number;
    opt_out_strict?: boolean;
    escalation_threshold?: number;
  };
  simulate_provider_outage?: boolean;
}

export const BatchAPI = {
  run: (payload: BatchRunRequest) =>
    request('/batch/run', { method: 'POST', body: payload }),
};

// --- Metrics APIs ---

export const MetricsAPI = {
  summary: () => request('/metrics/summary'),
};

// --- Compliance APIs ---

export const ComplianceAPI = {
  getConfig: () => request('/compliance/config'),

  updateConfig: (payload: {
    max_retries?: number;
    cooldown_hours?: number;
    opt_out_strict?: boolean;
    escalation_threshold?: number;
  }) => request('/compliance/config', { method: 'PUT', body: payload, role: 'admin' }),

  listOptOuts: () => request('/compliance/opt-outs'),

  addOptOut: (payload: { customer_id: string; phone?: string; email?: string; reason?: string }) =>
    request('/compliance/opt-outs', { method: 'POST', body: payload, role: 'admin' }),
};

// --- Audit Log APIs ---

export const AuditAPI = {
  list: (params?: { case_id?: string; event_type?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.case_id) query.set('case_id', params.case_id);
    if (params?.event_type) query.set('event_type', params.event_type);
    if (params?.limit) query.set('limit', String(params.limit));
    return request(`/audit?${query.toString()}`);
  },
};
