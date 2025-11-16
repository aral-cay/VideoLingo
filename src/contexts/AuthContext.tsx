import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Cohort, Condition } from '../utils/studyCondition';

interface AuthContextType {
  participantId: string | null;
  username: string | null;
  cohort: Cohort | null;
  condition: Condition | null;
  dayNumber: number;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [participantId, setParticipantId] = useState<string | null>(() => {
    return localStorage.getItem('currentParticipantId');
  });
  const [username, setUsername] = useState<string | null>(() => {
    return localStorage.getItem('currentUsername');
  });
  const [cohort, setCohort] = useState<Cohort | null>(() => {
    const stored = localStorage.getItem('currentCohort');
    return stored as Cohort | null;
  });
  const [condition, setCondition] = useState<Condition | null>(() => {
    const stored = localStorage.getItem('currentCondition');
    return stored as Condition | null;
  });
  const [dayNumber, setDayNumber] = useState<number>(() => {
    const stored = localStorage.getItem('currentDayNumber');
    return stored ? parseInt(stored, 10) : 1;
  });

  useEffect(() => {
    if (participantId && username && cohort && condition) {
      localStorage.setItem('currentParticipantId', participantId);
      localStorage.setItem('currentUsername', username);
      localStorage.setItem('currentCohort', cohort);
      localStorage.setItem('currentCondition', condition);
      localStorage.setItem('currentDayNumber', dayNumber.toString());
    } else {
      localStorage.removeItem('currentParticipantId');
      localStorage.removeItem('currentUsername');
      localStorage.removeItem('currentCohort');
      localStorage.removeItem('currentCondition');
      localStorage.removeItem('currentDayNumber');
    }
  }, [participantId, username, cohort, condition, dayNumber]);

  // Re-initialize tracking when session is restored from localStorage (page refresh/new tab)
  useEffect(() => {
    const initializeTrackingOnLoad = async () => {
      // Read directly from localStorage to avoid dependency issues
      const storedParticipantId = localStorage.getItem('currentParticipantId');
      const storedCondition = localStorage.getItem('currentCondition') as Condition | null;
      const storedDayNumber = localStorage.getItem('currentDayNumber');

      if (storedParticipantId && storedCondition) {
        console.log('[AuthContext] Re-initializing tracking for existing session:', {
          participantId: storedParticipantId,
          condition: storedCondition,
          dayNumber: storedDayNumber
        });
        const { initializeTracking } = await import('../utils/tracking');
        await initializeTracking(
          storedParticipantId,
          storedCondition,
          storedDayNumber ? parseInt(storedDayNumber, 10) : 1
        );
      }
    };

    initializeTrackingOnLoad();
  }, []); // Run only on mount - reads from localStorage directly

  const login = async (usernameInput: string, password: string): Promise<boolean> => {
    try {
      // Find participant in Supabase participants table
      const { data: participantData, error: participantError } = await supabase
        .from('participants')
        .select('id, username, password_hash, cohort, condition, day_number')
        .eq('username', usernameInput)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no results gracefully

      if (participantError) {
        console.error('Error fetching participant:', participantError);
        // If Supabase is not configured, fall back to local check
        if (participantError.message?.includes('JWT') || participantError.message?.includes('API')) {
          console.warn('Supabase not configured, falling back to local auth');
          return false;
        }
        return false;
      }

      if (!participantData) {
        console.error('Participant not found:', usernameInput);
        return false;
      }

      // Simple password check (for demo - in production use proper hashing)
      // For demo purposes, password_hash stores plain password
      // In production, use bcrypt: crypt('password', gen_salt('bf'))
      const passwordMatch = participantData.password_hash === password;

      if (!passwordMatch) {
        return false;
      }

      // Set participant session
      setParticipantId(participantData.id);
      setUsername(participantData.username);
      setCohort(participantData.cohort as Cohort);
      setCondition(participantData.condition as Condition);
      setDayNumber(participantData.day_number || 1);

      // Initialize participant progress if it doesn't exist for this condition
      await initializeParticipantProgress(participantData.id, participantData.condition as Condition);

      // Check and update streak for gamified condition on login
      const { isGamifiedCondition } = await import('../utils/studyCondition');
      if (isGamifiedCondition(participantData.condition as Condition)) {
        const { checkStreakOnLogin } = await import('../utils/gamification');
        await checkStreakOnLogin(participantData.id);
      }

      // Start session tracking
      const { initializeTracking } = await import('../utils/tracking');
      await initializeTracking(
        participantData.id, 
        participantData.condition as Condition,
        participantData.day_number || 1
      );

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const initializeParticipantProgress = async (participantId: string, condition: Condition) => {
    try {
      const { error } = await supabase
        .from('user_progress')
        .select('id')
        .eq('participant_id', participantId)
        .eq('condition', condition)
        .single();

      if (error && error.code === 'PGRST116') {
        // No progress exists for this condition, create it
        console.log(`[Auth] Creating new progress row for participant ${participantId} with condition ${condition}`);
        await supabase
          .from('user_progress')
          .insert({
            participant_id: participantId,
            condition: condition,
            completed_videos: [],
            video_scores: {},
          });
      }
    } catch (error) {
      console.error('Error initializing participant progress:', error);
    }
  };

  const logout = async (): Promise<void> => {
    // End session tracking before logging out
    const { cleanupTracking } = await import('../utils/tracking');
    await cleanupTracking();
    
    setParticipantId(null);
    setUsername(null);
    setCohort(null);
    setCondition(null);
    setDayNumber(1);
  };

  return (
    <AuthContext.Provider
      value={{
        participantId,
        username,
        cohort,
        condition,
        dayNumber,
        login,
        logout,
        isAuthenticated: !!participantId,
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
