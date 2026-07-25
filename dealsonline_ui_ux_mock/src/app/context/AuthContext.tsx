import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { authApi, type SessionInfo, type ApiError } from '../lib/api';

interface AuthState {
  user: SessionInfo | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  const checkSession = useCallback(async () => {
    try {
      const info = await authApi.verifySession();
      setState({ user: info, loading: false });
    } catch {
      setState({ user: null, loading: false });
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (email: string, password: string) => {
    await authApi.login(email, password);
    await checkSession();
  };

  const signup = async (email: string, password: string) => {
    await authApi.signup(email, password);
    await checkSession();
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore — cookie may already be gone
    }
    setState({ user: null, loading: false });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        signup,
        logout,
        isAuthenticated: !!state.user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
