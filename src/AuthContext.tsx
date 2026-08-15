import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from './db';
import type { User } from './db';

interface AuthContextType {
  user: User | null;
  login: (email: string) => void;
  logout: () => void;
  signup: (name: string, email: string, companyName: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Load session from localStorage on mount
    const storedUserId = localStorage.getItem('coverageiq_session');
    if (storedUserId) {
      const u = db.users.find(u => u.id === storedUserId);
      if (u) setUser(u);
    }
  }, []);

  const login = (email: string) => {
    const u = db.users.find(u => u.email === email);
    if (u) {
      setUser(u);
      localStorage.setItem('coverageiq_session', u.id);
    } else {
      throw new Error('User not found');
    }
  };

  const signup = (name: string, email: string, companyName: string) => {
    if (db.users.some(u => u.email === email)) {
      throw new Error('Email already in use');
    }

    const companyId = crypto.randomUUID();
    const userId = crypto.randomUUID();

    db.companies = [...db.companies, { id: companyId, name: companyName }];
    const newUser = { id: userId, email, name, companyId };
    db.users = [...db.users, newUser];
    
    setUser(newUser);
    localStorage.setItem('coverageiq_session', userId);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('coverageiq_session');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, signup }}>
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
