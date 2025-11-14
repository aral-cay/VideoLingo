import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  userId: string | null;
  username: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(() => {
    return localStorage.getItem('currentUserId');
  });
  const [username, setUsername] = useState<string | null>(() => {
    return localStorage.getItem('currentUsername');
  });

  useEffect(() => {
    if (userId && username) {
      localStorage.setItem('currentUserId', userId);
      localStorage.setItem('currentUsername', username);
    } else {
      localStorage.removeItem('currentUserId');
      localStorage.removeItem('currentUsername');
    }
  }, [userId, username]);

  const login = async (usernameInput: string, password: string): Promise<boolean> => {
    try {
      // Find user in Supabase users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, username, password_hash')
        .eq('username', usernameInput)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no results gracefully

      if (userError) {
        console.error('Error fetching user:', userError);
        // If Supabase is not configured, fall back to local check
        if (userError.message?.includes('JWT') || userError.message?.includes('API')) {
          console.warn('Supabase not configured, falling back to local auth');
          return false;
        }
        return false;
      }

      if (!userData) {
        console.error('User not found:', usernameInput);
        return false;
      }

      // Simple password check (for demo - in production use proper hashing)
      // For demo purposes, password_hash stores plain password
      // In production, use bcrypt: crypt('password', gen_salt('bf'))
      const passwordMatch = userData.password_hash === password;

      if (!passwordMatch) {
        return false;
      }

      // Set user session
      setUserId(userData.id);
      setUsername(userData.username);

      // Initialize user progress if it doesn't exist
      await initializeUserProgress(userData.id);

      // Check and update streak for gamified users on login
      const { isGamifiedUser } = await import('../utils/userVersion');
      if (isGamifiedUser(userData.username)) {
        const { checkStreakOnLogin } = await import('../utils/gamification');
        await checkStreakOnLogin(userData.id);
      }

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const initializeUserProgress = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // No progress exists, create it
        await supabase
          .from('user_progress')
          .insert({
            user_id: userId,
            completed_videos: [],
            video_scores: {},
          });
      }
    } catch (error) {
      console.error('Error initializing user progress:', error);
    }
  };

  const logout = async (): Promise<void> => {
    setUserId(null);
    setUsername(null);
  };

  return (
    <AuthContext.Provider
      value={{
        userId,
        username,
        login,
        logout,
        isAuthenticated: !!userId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
