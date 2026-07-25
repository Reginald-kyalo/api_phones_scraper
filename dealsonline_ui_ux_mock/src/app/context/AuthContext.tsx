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

/**
 * This build ships as static files with no API behind it (see demoSource.ts).
 * Every server-backed auth call is therefore a guaranteed failure.
 */
const STATIC_DEMO = true;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  const checkSession = useCallback(async () => {
    // Static demo build: there is no auth backend, so probing /api/verify-session
    // only produces a failed request in every visitor's console on every page
    // load. Resolve straight to signed-out; favourites, alerts and comparison all
    // run on localStorage and work unchanged.
    if (STATIC_DEMO) {
      setState({ user: null, loading: false });
      return;
    }
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
