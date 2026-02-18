import { useState, useEffect } from "react";

const AUTH_KEY = "collabhub_auth";
const TOKEN_KEY = "collabhub_token";
const REFRESH_TOKEN_KEY = "collabhub_refresh_token";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  // Optional rich presence fields (synced from backend `User`)
  status?: string;   // online, busy, away, offline, dnd, etc.
  activity?: string; // e.g. "Available", "In a meeting", "Focusing"
  role?: string;
}

export const auth = {
  getUser: (): AuthUser | null => {
    const stored = localStorage.getItem(AUTH_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  },

  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },

  getRefreshToken: (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  setUser: (user: AuthUser) => {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  },

  clear: () => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  isAuthenticated: (): boolean => {
    return auth.getUser() !== null && auth.getToken() !== null;
  },

  async refreshAccessToken(): Promise<string | null> {
    const refreshToken = auth.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        auth.clear();
        return null;
      }

      const data = await res.json();
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      return data.accessToken;
    } catch {
      auth.clear();
      return null;
    }
  },

  async getAuthHeaders(): Promise<HeadersInit> {
    let token = auth.getToken();
    if (!token) {
      token = await auth.refreshAccessToken();
    }

    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  },
};

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(auth.getUser());

  useEffect(() => {
    const handleStorageChange = () => {
      setUser(auth.getUser());
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return { user };
};

