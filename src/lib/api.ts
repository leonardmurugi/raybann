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
    create: (data: any) => apiRequest('/sales', { method: 'POST', body: JSON.stringify(data) }),
  },
  approvals: {
    list: () => apiRequest('/approvals/pending'),
    approvePayment: (id: number) => apiRequest(`/approvals/payment/${id}`, { method: 'POST' }),
    approveExpense: (id: number) => apiRequest(`/approvals/expense/${id}`, { method: 'POST' }),
  },
  dashboard: {
    stats: () => apiRequest('/dashboard/stats'),
  },
};
