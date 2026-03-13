export function getAuthToken() {
  return localStorage.getItem('auth_token');
}

export function setAuthToken(token: string | null) {
  if (!token) {
    localStorage.removeItem('auth_token');
    return;
  }
  localStorage.setItem('auth_token', token);
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = getAuthToken();
  const headers = new Headers(init.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: 'include',
  });

  return response;
}
