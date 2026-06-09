const API_BASE = import.meta.env.VITE_API_URL || '/api';

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

  if (response.status === 204) {
    return null;
  }

  // Try to parse JSON response
  let data: any;
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    // If JSON parsing fails, create an error message
    if (!response.ok) {
      throw new Error(`Server error (${response.status}): Unable to parse response`);
    }
    // If response was OK but couldn't parse, return null
    return null;
  }

  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }

  return data;
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
    delete: (id: number) => apiRequest(`/lands/${id}`, { method: 'DELETE' }),
  },
  inventory: {
    list: () => apiRequest('/inventory'),
    create: (data: any) => apiRequest('/inventory', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => apiRequest(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiRequest(`/inventory/${id}`, { method: 'DELETE' }),
  },
  properties: {
    list: () => apiRequest('/properties'),
    create: (data: any) => apiRequest('/properties', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => apiRequest(`/properties/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiRequest(`/properties/${id}`, { method: 'DELETE' }),
  },
  customers: {
    list: () => apiRequest('/customers'),
    create: (data: any) => apiRequest('/customers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => apiRequest(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiRequest(`/customers/${id}`, { method: 'DELETE' }),
    getDocuments: (customerId: number) => apiRequest(`/customers/${customerId}/documents`),
    uploadDocument: (customerId: number, formData: FormData) => {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      return fetch(`${import.meta.env.VITE_API_URL || '/api'}/customers/${customerId}/documents`, {
        method: 'POST',
        body: formData,
        headers,
      }).then(res => {
        if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
        return res.json();
      });
    },
    downloadDocument: (customerId: number, docId: number) => {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const url = `${import.meta.env.VITE_API_URL || '/api'}/customers/${customerId}/documents/${docId}/download`;
      return fetch(url, { headers }).then(res => {
        if (!res.ok) throw new Error('Download failed');
        return res.blob().then(blob => {
          const link = document.createElement('a');
          link.href = window.URL.createObjectURL(blob);
          link.download = `document-${docId}`;
          link.click();
        });
      });
    },
    deleteDocument: (customerId: number, docId: number) => apiRequest(`/customers/${customerId}/documents/${docId}`, { method: 'DELETE' }),
  },
  sales: {
    list: () => apiRequest('/sales'),
    get: (id: number) => apiRequest(`/sales/${id}`),
    create: (data: any) => apiRequest('/sales', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => apiRequest(`/sales/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiRequest(`/sales/${id}`, { method: 'DELETE' }),
  },
  payments: {
    list: (params?: { startDate?: string, endDate?: string }) => {
      const q = params ? `?startDate=${params.startDate || ''}&endDate=${params.endDate || ''}` : '';
      return apiRequest(`/payments${q}`);
    },
    create: (data: any) => apiRequest('/payments', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => apiRequest(`/payments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiRequest(`/payments/${id}`, { method: 'DELETE' }),
  },
  expenses: {
    list: (params?: { startDate?: string, endDate?: string }) => {
      const q = params ? `?startDate=${params.startDate || ''}&endDate=${params.endDate || ''}` : '';
      return apiRequest(`/expenses${q}`);
    },
    create: (data: any) => apiRequest('/expenses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => apiRequest(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiRequest(`/expenses/${id}`, { method: 'DELETE' }),
  },
  propertyCosts: {
    list: (params?: { startDate?: string, endDate?: string }) => {
      const q = params ? `?startDate=${params.startDate || ''}&endDate=${params.endDate || ''}` : '';
      return apiRequest(`/property-costs${q}`);
    },
    create: (data: any) => apiRequest('/property-costs', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => apiRequest(`/property-costs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiRequest(`/property-costs/${id}`, { method: 'DELETE' }),
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
  },
  debtsPayables: {
    list: () => apiRequest('/debts-payables'),
    create: (data: any) => apiRequest('/debts-payables', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => apiRequest(`/debts-payables/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiRequest(`/debts-payables/${id}`, { method: 'DELETE' }),
  },
  payroll: {
    list: () => apiRequest('/payroll'),
    listUnpaid: () => apiRequest('/payroll/unpaid'),
    create: (data: any) => apiRequest('/payroll', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => apiRequest(`/payroll/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiRequest(`/payroll/${id}`, { method: 'DELETE' }),
    runPayroll: (data: any) => apiRequest('/payroll/run', { method: 'POST', body: JSON.stringify(data) }),
  },
  salaryPayments: {
    list: () => apiRequest('/salary-payments'),
    create: (data: any) => apiRequest('/salary-payments', { method: 'POST', body: JSON.stringify(data) }),
  },
  pettyCash: {
    list: () => apiRequest('/petty-cash'),
    create: (data: any) => apiRequest('/petty-cash', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => apiRequest(`/petty-cash/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiRequest(`/petty-cash/${id}`, { method: 'DELETE' }),
  }
};
