import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Branch } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  activeBranch: Branch | null;
  branches: Branch[];
  loading: boolean;
  login: (credentials: { email?: string; identifier?: string; password: string }) => Promise<void>;
  logout: () => void;
  setActiveBranch: (branch: Branch | null) => void;
  refreshBranches: () => Promise<void>;
  updateCurrentUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('fitcore_token'));
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranch, setActiveBranchState] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);

  const defaultBranch: Branch = {
    _id: 'default-branch-1',
    name: 'Sagar Fitness Gym',
    code: 'SAGAR-01',
    address: 'Sagar Fitness Gym, Pathardi, Maharashtra, India',
    city: 'Pathardi',
    phone: '+91 98220 10001',
    email: 'info@sagarfitness.com',
    openingHours: '06:00 - 22:00',
    capacity: 250,
    status: 'ACTIVE',
  };

  const fetchBranches = async () => {
    try {
      const branchList = await api.getBranches();
      if (branchList && branchList.length > 0) {
        setBranches(branchList);
        const savedBranchId = localStorage.getItem('fitcore_branch_id');
        const match = branchList.find((b: Branch) => b._id === savedBranchId);
        setActiveBranchState(match || branchList[0]);
      } else {
        setBranches([defaultBranch]);
        setActiveBranchState(defaultBranch);
      }
    } catch {
      setBranches([defaultBranch]);
      setActiveBranchState(defaultBranch);
    }
  };

  const setActiveBranch = (branch: Branch | null) => {
    setActiveBranchState(branch);
    if (branch) {
      localStorage.setItem('fitcore_branch_id', branch._id);
    } else {
      localStorage.removeItem('fitcore_branch_id');
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      await fetchBranches();
      const savedToken = localStorage.getItem('fitcore_token');
      if (savedToken) {
        try {
          const res = await api.getMe();
          setUser(res.user);
        } catch {
          localStorage.removeItem('fitcore_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: { email?: string; identifier?: string; password: string }) => {
    const res = await api.login(credentials);
    localStorage.setItem('fitcore_token', res.token);
    setToken(res.token);
    setUser(res.user);
    await fetchBranches();
  };

  const logout = () => {
    localStorage.removeItem('fitcore_token');
    setToken(null);
    setUser(null);
  };

  const updateCurrentUser = (userData: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...userData } : null));
  };

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      if (res?.user) {
        setUser(res.user);
      }
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        activeBranch,
        branches,
        loading,
        login,
        logout,
        setActiveBranch,
        refreshBranches: fetchBranches,
        updateCurrentUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
