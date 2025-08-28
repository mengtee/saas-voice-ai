'use client';

import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/store';
import { apiClient } from '@/services/api';
import { User } from '@/types';

export const useAuth = () => {
  const { user, isAuthenticated, setUser } = useAppStore();

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password);
      
      if (response.success && response.data) {
        localStorage.setItem('auth_token', response.data.token);
        setUser(response.data.user as User);
        return { success: true };
      }
      
      return { success: false, error: response.error || 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      setUser(null);
    }
  };

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return false;

    try {
      const response = await apiClient.getCurrentUser();
      if (response.success && response.data) {
        setUser(response.data as User);
        return true;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      localStorage.removeItem('auth_token');
    }
    
    return false;
  }, [setUser]);

  // Auto-check auth on mount
  useEffect(() => {
    if (!isAuthenticated) {
      checkAuth();
    }
  }, [isAuthenticated, checkAuth]);

  return {
    user,
    isAuthenticated,
    login,
    logout,
    checkAuth,
  };
};