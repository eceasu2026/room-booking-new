/**
 * Authentication & Global State Context
 * Assam Skill University Conference Hall Booking System
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setStoredToken, getStoredToken } from '../api/client.ts';
import type { User, InAppNotification } from '../types/index.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isSetupRequired: boolean;
  unreadCount: number;
  notifications: InAppNotification[];
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  completeSetup: (payload: any) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSetupRequired, setIsSetupRequired] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const refreshNotifications = useCallback(async () => {
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unread_count);
    } catch {
      // silently handle background notification polling error
    }
  }, [token]);

  const refreshMe = useCallback(async () => {
    try {
      const setupRes = await api.getSetupStatus();
      setIsSetupRequired(setupRes.is_setup_required);

      if (setupRes.is_setup_required) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const activeToken = getStoredToken();
      if (!activeToken) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const meRes = await api.getMe();
      setUser(meRes.user);
      setToken(activeToken);
      refreshNotifications();
    } catch {
      // Token invalid or expired
      setUser(null);
      setToken(null);
      setStoredToken(null);
    } finally {
      setIsLoading(false);
    }
  }, [refreshNotifications]);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  // Polling for notifications every 20 seconds when user is authenticated
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refreshNotifications, 20000);
    return () => clearInterval(interval);
  }, [user, refreshNotifications]);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(username, password);
      setStoredToken(res.token);
      setToken(res.token);
      setUser(res.user);
      await refreshNotifications();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore network errors during logout
    } finally {
      setStoredToken(null);
      setToken(null);
      setUser(null);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const completeSetup = async (payload: any) => {
    setIsLoading(true);
    try {
      const res = await api.initSetup(payload);
      setStoredToken(res.token);
      setToken(res.token);
      setUser(res.admin_user);
      setIsSetupRequired(false);
      await refreshNotifications();
    } finally {
      setIsLoading(false);
    }
  };

  const markNotificationRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: 1, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllNotificationsRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: 1, read_at: new Date().toISOString() }))
    );
    setUnreadCount(0);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isSetupRequired,
        unreadCount,
        notifications,
        login,
        logout,
        refreshMe,
        refreshNotifications,
        completeSetup,
        markNotificationRead,
        markAllNotificationsRead,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
