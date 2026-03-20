import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  User, Investment, Deposit, Withdrawal, Commission,
  generateId, generateReferralCode, generatePixCode, generateWalletAddress,
  COMMISSION_LEVELS,
} from '@/lib/platform';

interface PlatformState {
  user: User | null;
  investments: Investment[];
  deposits: Deposit[];
  withdrawals: Withdrawal[];
  commissions: Commission[];
  allUsers: User[];
}

interface PlatformContextType extends PlatformState {
  login: (email: string, password: string) => boolean;
  register: (name: string, email: string, password: string, referralCode?: string) => boolean;
  logout: () => void;
  deposit: (amount: number, method: 'pix' | 'usdt') => Deposit;
  invest: (amount: number, durationDays: number, returnPercent: number) => boolean;
  withdraw: (amount: number) => boolean;
  redeemCycle: (investmentId: string) => boolean;
  updateUserBalance: (userId: string, amount: number) => void;
  loyaltyDays: number;
}

const PlatformContext = createContext<PlatformContextType | null>(null);

const STORAGE_KEY = 'neon_platform_data';

function loadState(): { users: User[]; investments: Investment[]; deposits: Deposit[]; withdrawals: Withdrawal[]; commissions: Commission[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { users: [], investments: [], deposits: [], withdrawals: [], commissions: [] };
}

function saveState(data: ReturnType<typeof loadState>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlatformState>(() => {
    const stored = loadState();
    // Seed admin if none exists
    if (!stored.users.some(u => u.isAdmin)) {
      stored.users.push({
        id: 'admin001',
        name: 'Admin',
        email: 'admin@platform.com',
        password: 'admin123',
        balance: 0,
        invested: 0,
        profits: 0,
        referralCode: 'ADMIN',
        referredBy: null,
        createdAt: Date.now(),
        isAdmin: true,
      });
      saveState(stored);
    }
    return {
      user: null,
      investments: stored.investments,
      deposits: stored.deposits,
      withdrawals: stored.withdrawals,
      commissions: stored.commissions,
      allUsers: stored.users,
    };
  });

  const persist = useCallback((users: User[], investments: Investment[], deposits: Deposit[], withdrawals: Withdrawal[], commissions: Commission[]) => {
    saveState({ users, investments, deposits, withdrawals, commissions });
  }, []);

  // Check & complete investments periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        const now = Date.now();
        let changed = false;
        const updatedInvestments = prev.investments.map(inv => {
          if (inv.status === 'active' && now >= inv.endDate) {
            changed = true;
            return { ...inv, status: 'completed' as const };
          }
          return inv;
        });
        if (!changed) return prev;
        persist(prev.allUsers, updatedInvestments, prev.deposits, prev.withdrawals, prev.commissions);
        return { ...prev, investments: updatedInvestments };
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [persist]);

  const login = useCallback((email: string, password: string): boolean => {
    const stored = loadState();
    const user = stored.users.find(u => u.email === email && u.password === password);
    if (!user) return false;
    setState(prev => ({ ...prev, user, allUsers: stored.users, investments: stored.investments, deposits: stored.deposits, withdrawals: stored.withdrawals, commissions: stored.commissions }));
    localStorage.setItem('neon_current_user', user.id);
    return true;
  }, []);

  const register = useCallback((name: string, email: string, password: string, referralCode?: string): boolean => {
    const stored = loadState();
    if (stored.users.some(u => u.email === email)) return false;
    const referrer = referralCode ? stored.users.find(u => u.referralCode === referralCode) : null;
    const newUser: User = {
      id: generateId(),
      name,
      email,
      password,
      balance: 0,
      invested: 0,
      profits: 0,
      referralCode: generateReferralCode(),
      referredBy: referrer?.id ?? null,
      createdAt: Date.now(),
    };
    stored.users.push(newUser);
    saveState(stored);
    setState(prev => ({ ...prev, user: newUser, allUsers: stored.users, investments: stored.investments, deposits: stored.deposits, withdrawals: stored.withdrawals, commissions: stored.commissions }));
    localStorage.setItem('neon_current_user', newUser.id);
    return true;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('neon_current_user');
    setState(prev => ({ ...prev, user: null }));
  }, []);

  const depositFn = useCallback((amount: number, method: 'pix' | 'usdt'): Deposit => {
    const dep: Deposit = {
      id: generateId(),
      userId: '',
      amount,
      method,
      status: 'pending',
      pixCode: method === 'pix' ? generatePixCode() : undefined,
      walletAddress: method === 'usdt' ? generateWalletAddress() : undefined,
      createdAt: Date.now(),
    };

    setState(prev => {
      if (!prev.user) return prev;
      dep.userId = prev.user.id;
      const newDeposits = [...prev.deposits, dep];

      // Auto-confirm after 3 seconds
      setTimeout(() => {
        setState(inner => {
          const confirmedDeposits = inner.deposits.map(d => d.id === dep.id ? { ...d, status: 'confirmed' as const } : d);
          const updatedUsers = inner.allUsers.map(u => u.id === inner.user?.id ? { ...u, balance: u.balance + amount } : u);
          const updatedUser = inner.user ? { ...inner.user, balance: inner.user.balance + amount } : null;

          // Process affiliate commissions
          let newCommissions = [...inner.commissions];
          let currentReferrerId = inner.user?.referredBy;
          for (let level = 0; level < COMMISSION_LEVELS.length && currentReferrerId; level++) {
            const referrer = updatedUsers.find(u => u.id === currentReferrerId);
            if (!referrer) break;
            const commAmount = amount * (COMMISSION_LEVELS[level] / 100);
            newCommissions.push({
              id: generateId(),
              userId: referrer.id,
              fromUserId: inner.user!.id,
              fromUserName: inner.user!.name,
              level: level + 1,
              amount: commAmount,
              createdAt: Date.now(),
            });
            const idx = updatedUsers.findIndex(u => u.id === referrer.id);
            if (idx !== -1) {
              updatedUsers[idx] = { ...updatedUsers[idx], balance: updatedUsers[idx].balance + commAmount };
            }
            currentReferrerId = referrer.referredBy;
          }

          persist(updatedUsers, inner.investments, confirmedDeposits, inner.withdrawals, newCommissions);
          return { ...inner, user: updatedUser, allUsers: updatedUsers, deposits: confirmedDeposits, commissions: newCommissions };
        });
      }, 3000);

      persist(prev.allUsers, prev.investments, newDeposits, prev.withdrawals, prev.commissions);
      return { ...prev, deposits: newDeposits };
    });
    return dep;
  }, [persist]);

  const invest = useCallback((amount: number, durationDays: number, returnPercent: number): boolean => {
    return (() => {
      let success = false;
      setState(prev => {
        if (!prev.user || prev.user.balance < amount || amount <= 0) return prev;
        success = true;
        const cycleNumber = prev.investments.filter(i => i.userId === prev.user!.id).length + 1;
        const inv: Investment = {
          id: generateId(),
          userId: prev.user.id,
          amount,
          cycleNumber,
          durationDays,
          returnPercent,
          startDate: Date.now(),
          endDate: Date.now() + durationDays * 86400000,
          status: 'active',
          profit: amount * (returnPercent / 100),
        };
        const updatedUser = { ...prev.user, balance: prev.user.balance - amount, invested: prev.user.invested + amount };
        const updatedUsers = prev.allUsers.map(u => u.id === prev.user!.id ? updatedUser : u);
        const newInvestments = [...prev.investments, inv];
        persist(updatedUsers, newInvestments, prev.deposits, prev.withdrawals, prev.commissions);
        return { ...prev, user: updatedUser, allUsers: updatedUsers, investments: newInvestments };
      });
      return success;
    })();
  }, [persist]);

  const withdraw = useCallback((amount: number): boolean => {
    let success = false;
    setState(prev => {
      if (!prev.user || prev.user.balance < amount || amount <= 0) return prev;
      success = true;
      const w: Withdrawal = { id: generateId(), userId: prev.user.id, amount, status: 'completed', createdAt: Date.now() };
      const updatedUser = { ...prev.user, balance: prev.user.balance - amount };
      const updatedUsers = prev.allUsers.map(u => u.id === prev.user!.id ? updatedUser : u);
      const newWithdrawals = [...prev.withdrawals, w];
      persist(updatedUsers, prev.investments, prev.deposits, newWithdrawals, prev.commissions);
      return { ...prev, user: updatedUser, allUsers: updatedUsers, withdrawals: newWithdrawals };
    });
    return success;
  }, [persist]);

  const redeemCycle = useCallback((investmentId: string): boolean => {
    let success = false;
    setState(prev => {
      const inv = prev.investments.find(i => i.id === investmentId);
      if (!inv || !prev.user || inv.status !== 'completed') return prev;
      success = true;
      const total = inv.amount + inv.profit;
      const updatedInvestments = prev.investments.map(i => i.id === investmentId ? { ...i, status: 'withdrawn' as const } : i);
      const updatedUser = { ...prev.user, balance: prev.user.balance + total, invested: prev.user.invested - inv.amount, profits: prev.user.profits + inv.profit };
      const updatedUsers = prev.allUsers.map(u => u.id === prev.user!.id ? updatedUser : u);
      persist(updatedUsers, updatedInvestments, prev.deposits, prev.withdrawals, prev.commissions);
      return { ...prev, user: updatedUser, allUsers: updatedUsers, investments: updatedInvestments };
    });
    return success;
  }, [persist]);

  const updateUserBalance = useCallback((userId: string, amount: number) => {
    setState(prev => {
      const updatedUsers = prev.allUsers.map(u => u.id === userId ? { ...u, balance: u.balance + amount } : u);
      const updatedUser = prev.user && prev.user.id === userId ? { ...prev.user, balance: prev.user.balance + amount } : prev.user;
      persist(updatedUsers, prev.investments, prev.deposits, prev.withdrawals, prev.commissions);
      return { ...prev, user: updatedUser, allUsers: updatedUsers };
    });
  }, [persist]);

  // Auto-login
  useEffect(() => {
    const uid = localStorage.getItem('neon_current_user');
    if (uid) {
      const stored = loadState();
      const user = stored.users.find(u => u.id === uid);
      if (user) {
        setState(prev => ({ ...prev, user, allUsers: stored.users, investments: stored.investments, deposits: stored.deposits, withdrawals: stored.withdrawals, commissions: stored.commissions }));
      }
    }
  }, []);

  const loyaltyDays = state.user
    ? Math.min(7, Math.floor((Date.now() - state.user.createdAt) / 86400000))
    : 0;

  return (
    <PlatformContext.Provider value={{
      ...state,
      login, register, logout,
      deposit: depositFn, invest, withdraw, redeemCycle,
      updateUserBalance, loyaltyDays,
    }}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('usePlatform must be used within PlatformProvider');
  return ctx;
}
