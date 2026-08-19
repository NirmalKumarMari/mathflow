// Talks to the MathFlow backend (server/) that replaces base44's hosted
// auth/database/LLM services. Shaped like the old @base44/sdk client
// (auth.*, entities.*, integrations.Core.InvokeLLM) so the rest of the app
// didn't need to change beyond the import.

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const TOKEN_KEY = 'mathflow_access_token';

// A Google-login redirect lands back here with ?access_token=... — pick it
// up once and scrub it from the URL, the same way the old base44 app-params
// flow handled the access_token query param.
(function adoptTokenFromUrl() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const token = params.get('access_token');
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    params.delete('access_token');
    const query = params.toString();
    window.history.replaceState({}, document.title, window.location.pathname + (query ? `?${query}` : '') + window.location.hash);
  }
})();

const getToken = () => (typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY));
const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const payload = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    const message = (payload && payload.error) || `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    error.data = payload;
    throw error;
  }
  return payload;
}

const auth = {
  async me() {
    return request('/api/auth/me');
  },
  async loginViaEmailPassword(email, password) {
    const result = await request('/api/auth/login', { method: 'POST', body: { email, password }, auth: false });
    setToken(result.access_token);
    return result;
  },
  async register({ email, password }) {
    return request('/api/auth/register', { method: 'POST', body: { email, password }, auth: false });
  },
  async verifyOtp({ email, otpCode }) {
    const result = await request('/api/auth/verify-otp', { method: 'POST', body: { email, otpCode }, auth: false });
    if (result.access_token) setToken(result.access_token);
    return result;
  },
  async resendOtp(email) {
    return request('/api/auth/resend-otp', { method: 'POST', body: { email }, auth: false });
  },
  async resetPasswordRequest(email) {
    return request('/api/auth/forgot-password', { method: 'POST', body: { email }, auth: false });
  },
  async resetPassword({ resetToken, newPassword }) {
    return request('/api/auth/reset-password', { method: 'POST', body: { resetToken, newPassword }, auth: false });
  },
  loginWithProvider(provider, returnTo = '/') {
    if (provider !== 'google') throw new Error(`Unsupported provider: ${provider}`);
    window.location.href = `${API_BASE}/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`;
  },
  setToken,
  logout(redirectUrl) {
    clearToken();
    if (redirectUrl) window.location.href = redirectUrl;
  },
  redirectToLogin(returnUrl) {
    window.location.href = `/login?returnTo=${encodeURIComponent(returnUrl || window.location.href)}`;
  },
};

const ENTITY_NAMES = [
  'StudentProfile', 'TopicMastery', 'StudyGuide', 'PracticeQuestion', 'ProblemBank', 'Subject',
];

const makeEntityClient = (name) => ({
  filter: (filter = {}, sort, limit) => {
    const params = new URLSearchParams({ filter: JSON.stringify(filter) });
    if (sort) params.set('sort', sort);
    if (limit) params.set('limit', String(limit));
    return request(`/api/entities/${name}?${params.toString()}`);
  },
  list: (sort, limit) => {
    const params = new URLSearchParams();
    if (sort) params.set('sort', sort);
    if (limit) params.set('limit', String(limit));
    const query = params.toString();
    return request(`/api/entities/${name}${query ? `?${query}` : ''}`);
  },
  get: (id) => request(`/api/entities/${name}/${id}`),
  create: (data) => request(`/api/entities/${name}`, { method: 'POST', body: data }),
  bulkCreate: (items) => request(`/api/entities/${name}`, { method: 'POST', body: items }),
  update: (id, data) => request(`/api/entities/${name}/${id}`, { method: 'PATCH', body: data }),
  delete: (id) => request(`/api/entities/${name}/${id}`, { method: 'DELETE' }),
});

const entities = Object.fromEntries(ENTITY_NAMES.map((name) => [name, makeEntityClient(name)]));

const integrations = {
  Core: {
    InvokeLLM: (params) => request('/api/invoke-llm', { method: 'POST', body: params }),
  },
};

export const api = { auth, entities, integrations };
