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
  organizationId?: string;
  avatar?: string;   // Avatar image URL
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
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("authUpdated"));
    }
  },

  setUser: (user: AuthUser) => {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("authUpdated"));
    }
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

    // Return only Authorization header - let caller set Content-Type based on request type
    // (FormData must NOT have Content-Type, JSON should have "application/json")
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
};

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(auth.getUser());

  useEffect(() => {
    // Fetch fresh user profile from API/database on mount
    const fetchUserProfile = async () => {
      const cachedUser = auth.getUser();
      if (!cachedUser?.id) return;

      try {
        const headers = await auth.getAuthHeaders();
        if (!headers || !('Authorization' in headers)) return;

        const res = await fetch(`${API_BASE}/api/users/${cachedUser.id}`, {
          headers,
        });

        if (!res.ok) return;

        // Check content-type before parsing to avoid HTML error pages
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) return;

        const responseData = await res.json();
        // Handle TransformInterceptor wrapper
        const profileData = responseData?.data || responseData;

        if (profileData && profileData.id) {
          // Resolve relative avatar URL to full URL
          let avatarUrl = profileData.avatar || undefined;
          if (avatarUrl && avatarUrl.startsWith("/")) {
            avatarUrl = `${API_BASE}${avatarUrl}`;
          }

          const updatedUser: AuthUser = {
            ...cachedUser,
            name: profileData.name || cachedUser.name,
            avatar: avatarUrl,
            status: profileData.status || cachedUser.status,
            role: profileData.role || cachedUser.role,
            organizationId: profileData.organizationId || cachedUser.organizationId,
          };

          // Update localStorage cache and state
          auth.setUser(updatedUser);
          setUser(updatedUser);
        }
      } catch {
        // Silently fail — use cached data
      }
    };

    fetchUserProfile();
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      setUser(auth.getUser());
    };

    const handleUserStatusUpdate = () => {
      const updatedUser = auth.getUser();
      setUser(updatedUser);
    };

    const handleCustomStorage = () => {
      const updatedUser = auth.getUser();
      setUser(updatedUser);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("userStatusUpdated", handleUserStatusUpdate);
    window.addEventListener("authUpdated", handleCustomStorage);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("userStatusUpdated", handleUserStatusUpdate);
      window.removeEventListener("authUpdated", handleCustomStorage);
    };
  }, []);

  return { user };
};

