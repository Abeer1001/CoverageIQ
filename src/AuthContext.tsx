import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from './db';
import type { User } from './db';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signup: (name: string, email: string, companyName: string, password: string) => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load session from localStorage on mount, then hydrate the workspace from the server.
    const storedUserId = localStorage.getItem('coverageiq_session');
    if (storedUserId) {
      const u = db.users.find(u => u.id === storedUserId);
      if (u) {
        db.hydrate(u.companyId).then(() => {
          setUser(db.users.find(x => x.id === u.id) || u);
          setLoading(false);
        });
        return;
      }
    }
    setLoading(false);
  }, []);

  const hashPassword = async (password: string) => {
    const data = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const login = async (email: string, password: string) => {
    const u = db.users.find(u => u.email === email);
    const passwordHash = await hashPassword(password);
    if (u && u.passwordHash === passwordHash) {
      await db.hydrate(u.companyId);
      const fresh = db.users.find(x => x.id === u.id) || u;
      setUser(fresh);
      localStorage.setItem('coverageiq_session', fresh.id);
      await db.pushWorkspace();
    } else {
      throw new Error('Incorrect email or password');
    }
  };

  const signup = async (name: string, email: string, companyName: string, password: string) => {
    if (db.users.some(u => u.email === email)) {
      throw new Error('Email already in use');
    }

    const companyId = crypto.randomUUID();
    const userId = crypto.randomUUID();

    db.companies = [...db.companies, { id: companyId, name: companyName }];
    const newUser = { id: userId, email, name, companyId, passwordHash: await hashPassword(password) };
    db.users = [...db.users, newUser];

    db.setCompanyId(companyId);
    setUser(newUser);
    localStorage.setItem('coverageiq_session', userId);
    await db.pushWorkspace();
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('coverageiq_session');
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      db.users = db.users.map(u => u.id === updated.id ? updated : u);
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, signup, updateUser }}>
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
