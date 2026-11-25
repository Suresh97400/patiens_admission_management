export class ApiError extends Error {
  constructor(message, fields = {}) {
    super(message);
    this.fields = fields; // { fieldName: "message" } from the backend
  }
}

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(BASE + path, { headers: { 'Content-Type': 'application/json' }, ...options });
  } catch {
    throw new ApiError('Cannot reach the server. Check that the backend is running.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || 'Request failed', data.errors || {});
  return data;
}

export const api = {
  options: () => request('/api/options'),
  list: (filters) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v.trim() && params.set(k, v.trim()));
    return request('/api/patients?' + params);
  },
  create: (body) => request('/api/patients', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/api/patients/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  discharge: (id) => request(`/api/patients/${id}/discharge`, { method: 'PATCH' }),
  remove: (id) => request(`/api/patients/${id}`, { method: 'DELETE' }),
};
