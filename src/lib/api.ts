const API_BASE = '/api';

export async function apiRequest(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  auth: {
    login: (credentials: any) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    register: (data: any) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  },
  lands: {
    list: () => apiRequest('/lands'),
    create: (data: any) => apiRequest('/lands', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => apiRequest(`/lands/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
  properties: {
    list: () => apiRequest('/properties'),
    create: (data: any) => apiRequest('/properties', { method: 'POST', body: JSON.stringify(data) }),
  },
  customers: {
    list: () => apiRequest('/customers'),
    create: (data: any) => apiRequest('/customers', { method: 'POST', body: JSON.stringify(data) }),
  },
  sales: {
    list: () => apiRequest('/sales'),
    get: (id: number) => apiRequest(`/sales/${id}`),
    create: (data: any) => apiRequest('/sales', { method: 'POST', body: JSON.stringify(data) }),
  },
  payments: {
    list: (params?: { startDate?: string, endDate?: string }) => {
      const q = params ? `?startDate=${params.startDate || ''}&endDate=${params.endDate || ''}` : '';
      return apiRequest(`/payments${q}`);
    },
    create: (data: any) => apiRequest('/payments', { method: 'POST', body: JSON.stringify(data) }),
  },
  expenses: {
    list: (params?: { startDate?: string, endDate?: string }) => {
      const q = params ? `?startDate=${params.startDate || ''}&endDate=${params.endDate || ''}` : '';
      return apiRequest(`/expenses${q}`);
    },
    create: (data: any) => apiRequest('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  },
  propertyCosts: {
    list: (params?: { startDate?: string, endDate?: string }) => {
      const q = params ? `?startDate=${params.startDate || ''}&endDate=${params.endDate || ''}` : '';
      return apiRequest(`/property-costs${q}`);
    },
    create: (data: any) => apiRequest('/property-costs', { method: 'POST', body: JSON.stringify(data) }),
  },
  approvals: {
    list: () => apiRequest('/approvals/pending'),
    approvePayment: (id: number) => apiRequest(`/approvals/payment/${id}`, { method: 'POST' }),
    approveExpense: (id: number) => apiRequest(`/approvals/expense/${id}`, { method: 'POST' }),
    approvePropertyCost: (id: number) => apiRequest(`/approvals/property-cost/${id}`, { method: 'POST' }),
  },
  dashboard: {
    stats: (params?: { startDate?: string, endDate?: string }) => {
      const q = params ? `?startDate=${params.startDate || ''}&endDate=${params.endDate || ''}` : '';
      return apiRequest(`/dashboard/stats${q}`);
    },
  },
  reports: {
    analytics: (params?: { startDate?: string, endDate?: string }) => {
      const q = params ? `?startDate=${params.startDate || ''}&endDate=${params.endDate || ''}` : '';
      return apiRequest(`/reports/analytics${q}`);
    },
  },
  migrations: {
    import: (target: string, data: any[]) => apiRequest('/migrations/import', { method: 'POST', body: JSON.stringify({ target, data }) }),
  }
};
