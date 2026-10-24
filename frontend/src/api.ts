export const getAuthToken = (): string | null => {
  return localStorage.getItem('emq_token');
};

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('emq_token', token);
  } else {
    localStorage.removeItem('emq_token');
  }
};

export const apiCall = async (endpoint: string, method = 'GET', body: any = null) => {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/api/v1${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
};
