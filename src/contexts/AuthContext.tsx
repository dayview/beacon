import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, ApiUser, setToken, getToken, clearToken } from '../lib/api';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket';

interface AuthContextType {
    user: ApiUser | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    /** Clears the local access token. A fresh one is provisioned automatically on next load. */
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

const DASHBOARD_PATH_RE = /^\/dashboard\/([a-f0-9]{48})\/?$/;

/** Routes that manage their own identity and never need an owner session. */
function isStandaloneRoute(pathname: string): boolean {
    return pathname === '/miro-panel' || pathname === '/participate';
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<ApiUser | null>(null);
    const [token, setTokenState] = useState<string | null>(getToken());
    const [isLoading, setIsLoading] = useState(true);

    const isAuthenticated = !!user && !!token;

    const applySession = useCallback((newToken: string, newUser: ApiUser) => {
        setToken(newToken);
        setTokenState(newToken);
        setUser(newUser);
        if (!getSocket().connected) {
            connectSocket();
        }
        if (!isStandaloneRoute(window.location.pathname)) {
            window.history.replaceState({}, '', `/dashboard/${newToken}`);
        }
    }, []);

    const startSession = useCallback(async () => {
        const data = await api.post<{ token: string; user: ApiUser }>('/api/auth/start');
        applySession(data.token, data.user);
    }, [applySession]);

    // Provision or restore an owner session — no login screen, no form.
    // A token can arrive from the URL (a shared/bookmarked dashboard link),
    // localStorage (returning on the same browser), or neither (first-ever
    // visit), in which case one is silently created.
    useEffect(() => {
        const resolveSession = async () => {
            if (isStandaloneRoute(window.location.pathname)) {
                setIsLoading(false);
                return;
            }

            const urlMatch = window.location.pathname.match(DASHBOARD_PATH_RE);
            const candidateToken = urlMatch?.[1] || getToken();

            if (candidateToken) {
                try {
                    setToken(candidateToken);
                    const data = await api.get<{ user: ApiUser }>('/api/auth/me');
                    applySession(candidateToken, data.user);
                    setIsLoading(false);
                    return;
                } catch {
                    // Link is invalid/expired — fall through and provision a fresh one.
                    clearToken();
                }
            }

            try {
                await startSession();
            } catch {
                // Backend unreachable — leave unauthenticated rather than loop.
            } finally {
                setIsLoading(false);
            }
        };
        resolveSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Listen for auth expiration events from the API client — re-provision
    // silently rather than surfacing a login screen that doesn't exist.
    useEffect(() => {
        const handleExpired = () => {
            setUser(null);
            setTokenState(null);
            disconnectSocket();
            startSession().catch(() => { /* leave unauthenticated */ });
        };
        window.addEventListener('beacon:auth-expired', handleExpired);
        return () => window.removeEventListener('beacon:auth-expired', handleExpired);
    }, [startSession]);

    const logout = useCallback(() => {
        clearToken();
        localStorage.removeItem('beacon-tests');
        setTokenState(null);
        setUser(null);
        disconnectSocket();
        startSession().catch(() => { /* leave unauthenticated */ });
    }, [startSession]);

    const refreshUser = useCallback(async () => {
        try {
            const data = await api.get<{ user: ApiUser }>('/api/auth/me');
            setUser(data.user);
        } catch {
            // silently fail
        }
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated,
                isLoading,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
