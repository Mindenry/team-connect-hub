import { auth } from './auth';

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const authHeaders = await auth.getAuthHeaders();
  
  // Don't set Content-Type for FormData, browser will set it automatically
  const isFormData = options.body instanceof FormData;
  
  // Remove Content-Type from auth headers if FormData
  const cleanAuthHeaders: HeadersInit = isFormData 
    ? Object.fromEntries(
        Object.entries(authHeaders).filter(([key]) => key.toLowerCase() !== 'content-type')
      )
    : authHeaders;
  
  const requestHeaders: HeadersInit = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...cleanAuthHeaders,
    ...options.headers,
  };
  
  // Ensure URL starts with /api (but not double /api/api)
  const apiUrl = url.startsWith('/api') ? url : url.startsWith('/') ? `/api${url}` : `/api/${url}`;
  
  const response = await fetch(`${API_BASE}${apiUrl}`, {
    ...options,
    headers: requestHeaders,
  });

  // If unauthorized, try to refresh token and retry once
  if (response.status === 401 && auth.getRefreshToken()) {
    const newToken = await auth.refreshAccessToken();
    if (newToken) {
      const newHeaders = await auth.getAuthHeaders();
      const cleanRetryHeaders: HeadersInit = isFormData
        ? Object.fromEntries(
            Object.entries(newHeaders).filter(([key]) => key.toLowerCase() !== 'content-type')
          )
        : newHeaders;
      
      const retryHeaders: HeadersInit = {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...cleanRetryHeaders,
        ...options.headers,
      };
      return fetch(`${API_BASE}${apiUrl}`, {
        ...options,
        headers: retryHeaders,
      });
    } else {
      // Refresh failed, redirect to login
      auth.clear();
      window.location.href = '/login';
      throw new Error('Session expired');
    }
  }

  return response;
}

export async function apiGet<T = any>(url: string): Promise<T> {
  const res = await apiFetch(url);
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function apiPost<T = any>(url: string, data?: any): Promise<T> {
  const res = await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: `API Error: ${res.status}` }));
    throw new Error(error.message || `API Error: ${res.status}`);
  }
  return res.json();
}

export async function apiPatch<T = any>(url: string, data?: any): Promise<T> {
  const res = await apiFetch(url, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: `API Error: ${res.status}` }));
    throw new Error(error.message || `API Error: ${res.status}`);
  }
  return res.json();
}

export async function apiDelete<T = any>(url: string, options?: { body?: any }): Promise<T> {
  const res = await apiFetch(url, {
    method: 'DELETE',
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: `API Error: ${res.status}` }));
    throw new Error(error.message || `API Error: ${res.status}`);
  }
  return res.json();
}

