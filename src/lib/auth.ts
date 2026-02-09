import { useState, useEffect } from "react";

const AUTH_KEY = "collabhub_auth";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
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

  setUser: (user: AuthUser) => {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  },

  clear: () => {
    localStorage.removeItem(AUTH_KEY);
  },

  isAuthenticated: (): boolean => {
    return auth.getUser() !== null;
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

