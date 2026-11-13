const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

class ApiClient {
  private token: string | null = null;
  private onUnauthorizedCallback: (() => void) | null = null;

  constructor() {
    this.token = localStorage.getItem('library_jwt_token');
  }

  public setToken(token: string | null): void {
    this.token = token;
    if (token) {
      localStorage.setItem('library_jwt_token', token);
    } else {
      localStorage.removeItem('library_jwt_token');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public onUnauthorized(cb: () => void): void {
    this.onUnauthorizedCallback = cb;
  }

  public async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const headers = new Headers(options.headers || {});

    if (this.token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        this.setToken(null);
        if (this.onUnauthorizedCallback) {
          this.onUnauthorizedCallback();
        }
        const errorJson = await response.json().catch(() => ({}));
        throw {
          code: errorJson.error?.code || 'UNAUTHORIZED',
          message: errorJson.error?.message || 'Session expired. Please log in again.',
        } as ApiError;
      }

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw {
          code: errorJson.error?.code || 'REQUEST_FAILED',
          message: errorJson.error?.message || `HTTP ${response.status}: ${response.statusText}`,
          details: errorJson.error?.details,
        } as ApiError;
      }

      return await response.json();
    } catch (err: any) {
      if (err.code && err.message) {
        throw err;
      }
      throw {
        code: 'NETWORK_ERROR',
        message: err.message || 'Unable to connect to server. Check your connection.',
      } as ApiError;
    }
  }

  public get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  public post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  public put<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  public delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
