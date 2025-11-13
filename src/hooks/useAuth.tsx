import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Định nghĩa kiểu dữ liệu cho Profile
interface Profile {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  role: 'user' | 'admin';
  status: 'active' | 'locked';
  last_active: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      setProfile(data as Profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    }
  }, []);

  const updateLastActive = useCallback(async (userId: string) => {
    if (!userId) return;
    try {
      await supabase
        .from('profiles')
        .update({ last_active: new Date().toISOString() })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error updating last active time:', error);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await fetchProfile(currentUser.id);
        } else {
          setProfile(null);
        }
      } catch (e) {
        console.error('Error in onAuthStateChange handler:', e);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (user?.id) {
      updateLastActive(user.id);
      intervalId = setInterval(() => {
        updateLastActive(user.id);
      }, 60000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user, updateLastActive]);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
  };

  // FIX: Luôn render children. Việc hiển thị gì khi tải sẽ do các component con quyết định.
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};