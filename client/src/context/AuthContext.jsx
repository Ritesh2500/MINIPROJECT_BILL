import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { authService } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (sessionUser) => {
    if (!sessionUser) {
      setUser(null);
      return;
    }
    try {
      const res = await authService.getMe();
      if (res.data?.success && res.data.user) {
        setUser(res.data.user);
      } else {
        // Fallback user object
        setUser({
          id: sessionUser.id,
          email: sessionUser.email,
          name: sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0],
          currency: sessionUser.user_metadata?.currency || 'USD'
        });
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setUser({
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0],
        currency: sessionUser.user_metadata?.currency || 'USD'
      });
    }
  };

  useEffect(() => {
    // 1. Initial active session check
    async function initSession() {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting initial session:', error);
        }
        setSession(initialSession);
        if (initialSession?.user) {
          await fetchUserProfile(initialSession.user);
        }
      } catch (err) {
        console.error('Session init error:', err);
      } finally {
        setLoading(false);
      }
    }

    initSession();

    // 2. Listen to Supabase auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        await fetchUserProfile(newSession.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const res = await authService.login({ email, password });
    if (res.data?.success) {
      setUser(res.data.user);
      setSession(res.data.session);
      return res.data;
    }
    throw new Error(res.data?.message || 'Login failed');
  };

  const register = async (name, email, password, currency = 'USD') => {
    const res = await authService.register({ name, email, password, currency });
    if (res.data?.success) {
      setUser(res.data.user);
      setSession(res.data.session);
      return res.data;
    }
    throw new Error(res.data?.message || 'Registration failed');
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setSession(null);
    }
  };

  const resetPassword = async (email) => {
    const res = await authService.resetPassword(email);
    return res.data;
  };

  const updateUser = (updatedFields) => {
    setUser(prev => (prev ? { ...prev, ...updatedFields } : updatedFields));
  };

  const currencySymbol =
    user?.settings?.currency_symbol ||
    (user?.currency === 'EUR' ? '€' : user?.currency === 'GBP' ? '£' : user?.currency === 'INR' ? '₹' : user?.currency === 'CAD' ? 'C$' : user?.currency === 'AUD' ? 'A$' : user?.currency === 'JPY' ? '¥' : '$');

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAuthenticated: Boolean(session?.user || user),
        currencySymbol,
        login,
        register,
        logout,
        resetPassword,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
