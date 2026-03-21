import { auth } from './auth';
import { updateSocketAuth } from './websocket';

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// Request queue and throttling
interface QueuedRequest {
  url: string;
  options: RequestInit;
  resolve: (value: Response) => void;
  reject: (error: Error) => void;
  retries: number;
}

class RequestManager {
  private queue: QueuedRequest[] = [];
  private activeRequests = 0;
  // Reduce concurrency back to 4 to prevent triggering 429 Too Many Requests on backend 
  // (Tasks page fires 8 parallel requests on load)
  private readonly maxConcurrent = 4;
  private readonly minDelay = 100; // Minimum 100ms between requests to space out the burst
  private lastRequestTime = 0;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly cacheTTL = 60000; // 60 seconds cache (increased to reduce duplicate requests)
  // Track pending requests to deduplicate identical requests
  private pendingRequests = new Map<string, Promise<Response>>();
  private isProcessing = false;

  async enqueue(url: string, options: RequestInit = {}, retries = 0): Promise<Response> {
    // Create a unique key for this request
    const requestKey = this.getRequestKey(url, options);
    
    // If the same request is already pending, return the existing promise with a cloned response
    const pending = this.pendingRequests.get(requestKey);
    if (pending) {
      return pending.then(res => res.clone());
    }

    // Create new promise for this request
    const promise = new Promise<Response>((resolve, reject) => {
      this.queue.push({
        url,
        options,
        resolve,
        reject,
        retries,
      });
      this.processQueue();
    });

    // Store the promise and clean it up when done
    this.pendingRequests.set(requestKey, promise);
    promise.finally(() => {
      this.pendingRequests.delete(requestKey);
    });

    return promise.then(res => res.clone());
  }

  private getRequestKey(url: string, options: RequestInit): string {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  private async processQueue() {
    if (this.queue.length === 0 || this.activeRequests >= this.maxConcurrent) {
      this.isProcessing = false;
      return;
    }

    // Prevent multiple processQueue calls from running simultaneously
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    // Use a small, consistent spacing between requests (no artificial 1s delay on first call)
    const baseDelay = this.minDelay;
    const delay = Math.max(0, baseDelay - timeSinceLastRequest);

    if (delay > 0) {
      setTimeout(() => {
        this.isProcessing = false;
        this.processQueue();
      }, delay);
      return;
    }

    const request = this.queue.shift();
    if (!request) {
      this.isProcessing = false;
      return;
    }

    this.activeRequests++;
    this.lastRequestTime = Date.now();

    try {
      const response = await this.executeRequest(request.url, request.options);
      
      // Handle 429 Too Many Requests with exponential backoff
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        // Use longer delays for 429 errors - start with 5 seconds minimum
        const baseDelay = retryAfter 
          ? Math.max(parseInt(retryAfter) * 1000, 5000) 
          : Math.min(5000 * Math.pow(2, request.retries), 30000); // 5s, 10s, 20s, max 30s
        
        if (request.retries < 2) {
          // Re-queue with longer delay at the end of queue (not front) to avoid immediate retry
          this.activeRequests--;
          this.isProcessing = false;
          setTimeout(() => {
            this.queue.push({
              ...request,
              retries: request.retries + 1,
            });
            this.processQueue();
          }, baseDelay);
          return;
        } else {
          // Max retries reached - return error response instead of rejecting
          this.activeRequests--;
          this.isProcessing = false;
          // Return the 429 response so it can be handled gracefully
          request.resolve(response);
          this.processQueue();
          return;
        }
      }

      this.activeRequests--;
      this.isProcessing = false;
      request.resolve(response);
      this.processQueue();
    } catch (error) {
      this.activeRequests--;
      this.isProcessing = false;
      request.reject(error as Error);
      this.processQueue();
    }
  }

  private async executeRequest(url: string, options: RequestInit): Promise<Response> {
  const authHeaders = await auth.getAuthHeaders();
  
  const isFormData = options.body instanceof FormData;
  
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
  
  const apiUrl = url.startsWith('/api') ? url : url.startsWith('/') ? `/api${url}` : `/api/${url}`;
  
    const response = await fetch(`${API_BASE}${apiUrl}`, {
      ...options,
      headers: requestHeaders,
    });
    
    if (response.status === 401) {
       // Auto-logout on 401 globally if token is invalid/ghost
       auth.clear();
       window.dispatchEvent(new Event("storage"));
       if (!window.location.pathname.includes('/login')) {
         window.location.href = '/login';
       }
    }
    
    return response;
  }

  getCacheKey(url: string, options: RequestInit): string {
    return this.getRequestKey(url, options);
  }

  getCached(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clearCache() {
    this.cache.clear();
  }
}

const requestManager = new RequestManager();

// Export function to clear cache if needed
export function clearApiCache() {
  requestManager.clearCache();
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Check cache for GET requests
  const method = options.method || 'GET';
  if (method === 'GET') {
    const cacheKey = requestManager.getCacheKey(url, options);
    const cached = requestManager.getCached(cacheKey);
    if (cached !== null) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Queue the request
  const response = await requestManager.enqueue(url, options);

  // If unauthorized, try to refresh token and retry once
  if (response.status === 401 && auth.getRefreshToken()) {
    const newToken = await auth.refreshAccessToken();
    if (newToken) {
      // Sync fresh token to WebSocket connection
      updateSocketAuth();
      const newHeaders = await auth.getAuthHeaders();
      const isFormData = options.body instanceof FormData;
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
      
      const apiUrl = url.startsWith('/api') ? url : url.startsWith('/') ? `/api${url}` : `/api/${url}`;
      const retryResponse = await fetch(`${API_BASE}${apiUrl}`, {
        ...options,
        headers: retryHeaders,
      });
      
      return retryResponse;
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
  try {
  const res = await apiFetch(url);
  if (!res.ok) {
      // For 429, return empty result immediately to prevent UI issues
      // The request manager already retried, so we gracefully degrade
      if (res.status === 429) {
        console.warn('Rate limited, returning empty result:', url);
        // Determine if this should return array or object based on endpoint
        const isArrayEndpoint = url.includes('/announcements') || 
                                url.includes('/teams') || 
                                url.includes('/tasks') || 
                                url.includes('/users') ||
                                url.includes('/channels') ||
                                url.includes('/meetings') ||
                                url.includes('/wiki') ||
                                url.includes('/reports');
        return (isArrayEndpoint ? [] : {}) as T;
      }
      
      // For 404 errors, gracefully return empty result (resource not found)
      // This prevents console errors from browser prefetch or missing resources
      if (res.status === 404) {
        // Silently handle 404s - don't log to reduce console noise
        // Determine if this should return array or object based on endpoint
        const isArrayEndpoint = url.includes('/announcements') || 
                                url.includes('/teams') || 
                                url.includes('/tasks') || 
                                url.includes('/users') ||
                                url.includes('/channels') ||
                                url.includes('/meetings') ||
                                url.includes('/wiki') ||
                                url.includes('/reports');
        return (isArrayEndpoint ? [] : null) as T;
      }
      
      // For 500 errors, gracefully return empty result instead of crashing
      // This allows the UI to continue working even if backend has issues
      if (res.status === 500) {
        // Only log in development mode to reduce console noise
        if (import.meta.env.DEV) {
          console.warn('Server error (500), returning empty result:', url);
        }
        // Try to get error message from response body for debugging
        try {
          const errorText = await res.text();
          if (errorText && import.meta.env.DEV) {
            try {
              const errorJson = JSON.parse(errorText);
              // Only log meaningful error messages, not path-to-regexp errors
              if (errorJson.message && !errorJson.message.includes('pathToRegexpError')) {
                console.error('Server error details:', errorJson.message);
              }
            } catch (e) {
              // Not JSON, ignore
            }
          }
        } catch (e) {
          // Ignore if we can't read the error body
        }
        // Determine if this should return array or object based on endpoint
        const isArrayEndpoint = url.includes('/announcements') || 
                                url.includes('/teams') || 
                                url.includes('/tasks') || 
                                url.includes('/users') ||
                                url.includes('/channels') ||
                                url.includes('/meetings') ||
                                url.includes('/wiki') ||
                                url.includes('/reports');
        return (isArrayEndpoint ? [] : {}) as T;
      }
      
      // For other errors (400, 401, 403, 404, etc.), still throw to allow components to handle
      // But for 401, we might want to handle it specially
      if (res.status === 401) {
        // 401 is already handled in apiFetch with token refresh, so this shouldn't happen
        // But if it does, return empty result
        console.warn('Unauthorized (401), returning empty result:', url);
        const isArrayEndpoint = url.includes('/announcements') || 
                                url.includes('/teams') || 
                                url.includes('/tasks') || 
                                url.includes('/users') ||
                                url.includes('/channels') ||
                                url.includes('/meetings') ||
                                url.includes('/wiki') ||
                                url.includes('/reports');
        return (isArrayEndpoint ? [] : {}) as T;
      }
      
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  
  // Check if response has content
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    // Return empty array for non-JSON responses (like empty responses)
    return [] as T;
  }
  
  const text = await res.text();
  if (!text || text.trim() === '') {
    // Return empty array for empty responses
    return [] as T;
  }
  
    try {
      const parsed = JSON.parse(text);
      
      // Handle new API response format: {success: true, data: [...], timestamp: '...'}
      // If response has 'data' property, extract it
      let data = parsed;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        if ('data' in parsed) {
          // Extract data from response object
          data = parsed.data;
        } else if ('success' in parsed && 'data' in parsed) {
          // Handle {success: true, data: [...]} format
          data = parsed.data;
        }
      }
      
      // If data is null/undefined, handle based on expected type
      // For array types, return empty array; for object types, return empty object or null
      if (data === null || data === undefined) {
        // Check if URL suggests array response (common endpoints)
        const isArrayEndpoint = url.includes('/announcements') || 
                                url.includes('/teams') || 
                                url.includes('/tasks') || 
                                url.includes('/users') ||
                                url.includes('/channels') ||
                                url.includes('/meetings');
        return (isArrayEndpoint ? [] : {}) as T;
      }
      
      // Cache successful GET responses (cache the original parsed response)
      const cacheKey = requestManager.getCacheKey(url, {});
      requestManager.setCache(cacheKey, parsed);
      
      return data as T;
    } catch (e) {
      console.error('Failed to parse JSON:', text);
      // Return appropriate default based on endpoint
      const isArrayEndpoint = url.includes('/announcements') || 
                              url.includes('/teams') || 
                              url.includes('/tasks') || 
                              url.includes('/users') ||
                              url.includes('/channels') ||
                              url.includes('/meetings');
      return (isArrayEndpoint ? [] : {}) as T;
    }
  } catch (error: any) {
    // If it's a 429 error that we've already retried, return empty array to prevent UI crash
    if (error.message?.includes('429')) {
      console.warn('Rate limited, returning empty result:', url);
      return [] as T;
    }
    throw error;
  }
}

function unwrapResponse<T>(parsed: any): T {
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'data' in parsed) {
    return parsed.data as T;
  }
  return parsed as T;
}

export async function apiPost<T = any>(url: string, data?: any): Promise<T> {
  const res = await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  clearApiCache();
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: `API Error: ${res.status}` }));
    throw new Error(error.message || `API Error: ${res.status}`);
  }
  const parsed = await res.json();
  return unwrapResponse<T>(parsed);
}

export async function apiPut<T = any>(url: string, data?: any): Promise<T> {
  const res = await apiFetch(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  clearApiCache();
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: `API Error: ${res.status}` }));
    throw new Error(error.message || `API Error: ${res.status}`);
  }
  const parsed = await res.json();
  return unwrapResponse<T>(parsed);
}

export async function apiPatch<T = any>(url: string, data?: any): Promise<T> {
  const res = await apiFetch(url, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  clearApiCache();
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: `API Error: ${res.status}` }));
    throw new Error(error.message || `API Error: ${res.status}`);
  }
  const parsed = await res.json();
  return unwrapResponse<T>(parsed);
}

export async function apiDelete<T = any>(url: string, options?: { body?: any }): Promise<T> {
  const res = await apiFetch(url, {
    method: 'DELETE',
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  clearApiCache();
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: `API Error: ${res.status}` }));
    throw new Error(error.message || `API Error: ${res.status}`);
  }
  const parsed = await res.json();
  return unwrapResponse<T>(parsed);
}

