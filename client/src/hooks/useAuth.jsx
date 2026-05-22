import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { getRankTier } from '../lib/ranks.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [player, setPlayer]   = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadPlayer(userId) {
    try {
      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('id', userId)
        .single();
      if (data) {
        const tier = getRankTier(data.elo);
        setPlayer({ ...data, rankTier: tier.name, rankEmoji: tier.emoji, rankColor: tier.color });
      }
    } catch {}
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadPlayer(session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadPlayer(session.user.id);
      else setPlayer(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }

  async function signInAsGuest(username) {
    const { data, error } = await supabase.auth.signInAnonymously({
      options: { data: { full_name: username || `Guest_${Math.random().toString(36).slice(2, 8)}` } },
    });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setPlayer(null);
  }

  async function updateProfile(updates) {
    if (!session) return;
    const { data } = await supabase
      .from('players')
      .update(updates)
      .eq('id', session.user.id)
      .select()
      .single();
    if (data) {
      const tier = getRankTier(data.elo);
      setPlayer({ ...data, rankTier: tier.name, rankEmoji: tier.emoji, rankColor: tier.color });
    }
  }

  const value = {
    session,
    player,
    loading,
    isAuthenticated: !!session,
    isGuest: session?.user?.is_anonymous ?? true,
    isPremium: player?.is_premium ?? false,
    token: session?.access_token ?? null,
    signInWithGoogle,
    signInAsGuest,
    signOut,
    updateProfile,
    refreshPlayer: () => session && loadPlayer(session.user.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
