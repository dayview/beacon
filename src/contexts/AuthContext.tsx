import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, ApiUser, setToken, getToken, clearToken, ApiError } from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';

interface AuthContextType {
    user: ApiUser | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<ApiUser | null>(null);
    const [token, setTokenState] = useState<string | null>(getToken());
    const [isLoading, setIsLoading] = useState(true);

    const isAuthenticated = !!user && !!token;

    // Restore session on mount
    useEffect(() => {
        const restore = async () => {
            const savedToken = getToken();
            if (!savedToken) {
                setIsLoading(false);
                return;
            }
            try {
                const data = await api.get<{ user: ApiUser }>('/api/auth/me');
                setUser(data.user);
                setTokenState(savedToken);
                connectSocket();
            } catch {
                // Token invalid or backend unreachable
                clearToken();
                setTokenState(null);
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };
        restore();
    }, []);

    // Listen for auth expiration events from the API client
    useEffect(() => {
        const handleExpired = () => {
            setUser(null);
            setTokenState(null);
            disconnectSocket();
        };
        window.addEventListener('beacon:auth-expired', handleExpired);
        return () => window.removeEventListener('beacon:auth-expired', handleExpired);
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const data = await api.post<{ token: string; user: ApiUser }>('/api/auth/login', {
            email,
            password,
        });
        setToken(data.token);
        setTokenState(data.token);
        setUser(data.user);
        connectSocket();
    }, []);

    const register = useCallback(async (email: string, password: string, name: string) => {
        const data = await api.post<{ token: string; user: ApiUser }>('/api/auth/register', {
            email,
            password,
            name,
        });
        setToken(data.token);
        setTokenState(data.token);
        setUser(data.user);
        connectSocket();
    }, []);

    const logout = useCallback(() => {
        clearToken();
        localStorage.removeItem('beacon-tests');
        setTokenState(null);
        setUser(null);
        disconnectSocket();
    }, []);

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
                login,
                register,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
