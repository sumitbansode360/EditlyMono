// context/UserContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import api, { setAccessToken } from "@/lib/axios";
import { User, AuthContextType } from "@/types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Session restore on app load
  useEffect(() => {
    const restoreSession = async () => {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        setIsLoading(false);
        return;
      }

      try {
        // 1. Get new access token using refresh token
        const refreshResponse = await api.post('/api/token/refresh/', {
          refresh: refreshToken,
        });
        const newAccessToken = refreshResponse.data.access;
        setAccessToken(newAccessToken);

        // 2. Fetch current user
        const meResponse = await api.get('/api/auth/me/');
        setUser(meResponse.data);
      } catch (error) {
        // Invalid or expired refresh token
        localStorage.removeItem('refresh_token');
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await api.post('/api/token/', { username, password });
    const { access, refresh, user } = response.data; // Simple JWT returns access, refresh, and optionally user

    setAccessToken(access);
    localStorage.setItem('refresh_token', refresh);
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await api.post('/api/auth/logout/', { refresh: refreshToken });
      }
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      setAccessToken(null);
      localStorage.removeItem('refresh_token');
      setUser(null);
    }
  }, []);

  // Merges a partial update into the cached user — used after a profile
  // edit succeeds, so the navbar/toolbar avatar and name update immediately
  // instead of waiting for the next full session restore.
  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const value: AuthContextType = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      updateUser,
    }),
    [user, isLoading, login, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useUser = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
