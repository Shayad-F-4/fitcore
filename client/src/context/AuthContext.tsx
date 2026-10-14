import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Branch } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  activeBranch: Branch | null;
  branches: Branch[];
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  demoLogin: (role: string) => Promise<void>;
  logout: () => void;
  setActiveBranch: (branch: Branch | null) => void;
  refreshBranches: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('fitcore_token'));
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranch, setActiveBranchState] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBranches = async () => {
    try {
      const branchList = await api.getBranches();
      setBranches(branchList);
      if (branchList.length > 0 && !activeBranch) {
        // Default to Downtown flagship branch if none selected
        const savedBranchId = localStorage.getItem('fitcore_branch_id');
        const match = branchList.find((b: Branch) => b._id === savedBranchId);
        setActiveBranchState(match || branchList[0]);
      }
    } catch (err) {
      console.warn('Failed to fetch branches:', err);
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
          // Token expired or invalid
          localStorage.removeItem('fitcore_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const res = await api.login(credentials);
    localStorage.setItem('fitcore_token', res.token);
    setToken(res.token);
    setUser(res.user);
    await fetchBranches();
  };

  const demoLogin = async (role: string) => {
    const res = await api.demoLogin(role);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        activeBranch,
        branches,
        loading,
        login,
        demoLogin,
        logout,
        setActiveBranch,
        refreshBranches: fetchBranches,
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
