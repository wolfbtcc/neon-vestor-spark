import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  User, Investment, Deposit, Withdrawal, Commission, ProfitEntry,
  generateId, generateReferralCode, generatePixCode, generateWalletAddress,
  COMMISSION_LEVELS,
} from '@/lib/platform';

interface PlatformState {
  user: User | null;
  investments: Investment[];
  deposits: Deposit[];
  withdrawals: Withdrawal[];
  commissions: Commission[];
  profitHistory: ProfitEntry[];
  allUsers: User[];
}

interface PlatformContextType extends PlatformState {
  login: (email: string, password: string) => boolean;
  register: (name: string, email: string, password: string, referralCode?: string, phone?: string, phoneCountry?: string) => boolean;
  logout: () => void;
  deposit: (amount: number, method: 'pix' | 'usdt') => Deposit;
  invest: (amount: number, durationDays: number, returnPercent: number) => boolean;
  withdraw: (amount: number, pixName?: string, pixKey?: string, type?: 'profits' | 'commission' | 'pool') => boolean;
  redeemCycle: (investmentId: string) => boolean;
  earlyRedeem: (investmentId: string) => boolean;
  updateUserBalance: (userId: string, amount: number) => void;
  updateUserName: (newName: string) => void;
  loyaltyDays: number;
}

const PlatformContext = createContext<PlatformContextType | null>(null);

const STORAGE_KEY = 'neon_platform_data';
const POOL_FEE = 0.15;

interface StoredState {
  users: User[];
  investments: Investment[];
  deposits: Deposit[];
  withdrawals: Withdrawal[];
  commissions: Commission[];
  profitHistory: ProfitEntry[];
}

function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...parsed, profitHistory: parsed.profitHistory || [] };
    }
  } catch {}
  return { users: [], investments: [], deposits: [], withdrawals: [], commissions: [], profitHistory: [] };
}

function saveState(data: StoredState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlatformState>(() => {
    const stored = loadState();
    if (!stored.users.some(u => u.isAdmin)) {
      stored.users.push({
        id: 'admin001',
        name: 'Admin',
        email: 'admin@platform.com',
        phone: '',
        phoneCountry: 'BR',
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
      profitHistory: stored.profitHistory,
      allUsers: stored.users,
    };
  });

  const persist = useCallback((users: User[], investments: Investment[], deposits: Deposit[], withdrawals: Withdrawal[], commissions: Commission[], profitHistory: ProfitEntry[]) => {
    saveState({ users, investments, deposits, withdrawals, commissions, profitHistory });
  }, []);

  // 30-second yield generation
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        if (!prev.user) return prev;
        const now = Date.now();
        const activeInvs = prev.investments.filter(i => i.userId === prev.user!.id && i.status === 'active');
        if (activeInvs.length === 0) return prev;

        let totalNet = 0;
        let totalFee = 0;
        const newProfitEntries: ProfitEntry[] = [];

        for (const inv of activeInvs) {
          // Total profit for full cycle
          const totalProfit = inv.amount * (inv.returnPercent / 100);
          // Duration in seconds
          const durationSeconds = inv.durationDays * 86400;
          // Profit per 30 seconds
          const profitPer30s = totalProfit / (durationSeconds / 30);
          // 15% fee
          const fee = profitPer30s * POOL_FEE;
          const net = profitPer30s - fee;

          totalNet += net;
          totalFee += fee;

          newProfitEntries.push({
            id: generateId(),
            userId: prev.user!.id,
            amount: profitPer30s,
            fee,
            net,
            investmentId: inv.id,
            createdAt: now,
          });
        }

        if (totalNet <= 0) return prev;

        const updatedUser = {
          ...prev.user!,
          profits: prev.user!.profits + totalNet,
          balance: prev.user!.balance + totalNet,
        };
        const updatedUsers = prev.allUsers.map(u => u.id === prev.user!.id ? updatedUser : u);
        const updatedProfitHistory = [...prev.profitHistory, ...newProfitEntries];

        // Check completed cycles
        let updatedInvestments = prev.investments.map(inv => {
          if (inv.status === 'active' && now >= inv.endDate) {
            return { ...inv, status: 'completed' as const };
          }
          return inv;
        });

        persist(updatedUsers, updatedInvestments, prev.deposits, prev.withdrawals, prev.commissions, updatedProfitHistory);
        return { ...prev, user: updatedUser, allUsers: updatedUsers, investments: updatedInvestments, profitHistory: updatedProfitHistory };
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [persist]);

  // Check completed cycles & pending withdrawals every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        const now = Date.now();
        let changed = false;
        const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

        const updatedInvestments = prev.investments.map(inv => {
          if (inv.status === 'active' && now >= inv.endDate) {
            changed = true;
            return { ...inv, status: 'completed' as const };
          }
          return inv;
        });

        // Auto-confirm withdrawals after 48h
        const updatedWithdrawals = prev.withdrawals.map(w => {
          if (w.status === 'pending' && now - w.createdAt >= FORTY_EIGHT_HOURS) {
            changed = true;
            return { ...w, status: 'completed' as const };
          }
          return w;
        });

        if (!changed) return prev;
        persist(prev.allUsers, updatedInvestments, prev.deposits, updatedWithdrawals, prev.commissions, prev.profitHistory);
        return { ...prev, investments: updatedInvestments, withdrawals: updatedWithdrawals };
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [persist]);

  const login = useCallback((email: string, password: string): boolean => {
    const stored = loadState();
    const user = stored.users.find(u => u.email === email && u.password === password);
    if (!user) return false;
    setState(prev => ({ ...prev, user, allUsers: stored.users, investments: stored.investments, deposits: stored.deposits, withdrawals: stored.withdrawals, commissions: stored.commissions, profitHistory: stored.profitHistory }));
    localStorage.setItem('neon_current_user', user.id);
    return true;
  }, []);

  const register = useCallback((name: string, email: string, password: string, referralCode?: string, phone?: string, phoneCountry?: string): boolean => {
    const stored = loadState();
    if (stored.users.some(u => u.email === email)) return false;
    const referrer = referralCode ? stored.users.find(u => u.referralCode === referralCode) : null;
    const newUser: User = {
      id: generateId(),
      name,
      email,
      phone: phone || '',
      phoneCountry: phoneCountry || 'BR',
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
    setState(prev => ({ ...prev, user: newUser, allUsers: stored.users, investments: stored.investments, deposits: stored.deposits, withdrawals: stored.withdrawals, commissions: stored.commissions, profitHistory: stored.profitHistory }));
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
      const confirmedDep = { ...dep, status: 'confirmed' as const };
      const newDeposits = [...prev.deposits, confirmedDep];

      const updatedUser = { ...prev.user, balance: prev.user.balance + amount, invested: prev.user.invested + amount };
      const updatedUsers = prev.allUsers.map(u => u.id === prev.user!.id ? updatedUser : u);

      let newCommissions = [...prev.commissions];
      let currentReferrerId = prev.user.referredBy;
      for (let level = 0; level < COMMISSION_LEVELS.length && currentReferrerId; level++) {
        const referrer = updatedUsers.find(u => u.id === currentReferrerId);
        if (!referrer) break;
        const commAmount = amount * (COMMISSION_LEVELS[level] / 100);
        newCommissions.push({
          id: generateId(),
          userId: referrer.id,
          fromUserId: prev.user.id,
          fromUserName: prev.user.name,
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

      persist(updatedUsers, prev.investments, newDeposits, prev.withdrawals, newCommissions, prev.profitHistory);
      return { ...prev, user: updatedUser, allUsers: updatedUsers, deposits: newDeposits, commissions: newCommissions };
    });
    return dep;
  }, [persist]);

  const invest = useCallback((amount: number, durationDays: number, returnPercent: number): boolean => {
    let success = false;
    setState(prev => {
      if (!prev.user || amount <= 0 || prev.user.balance < amount - 0.01) return prev;
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
      const updatedUser = { ...prev.user, balance: prev.user.balance - amount };
      const updatedUsers = prev.allUsers.map(u => u.id === prev.user!.id ? updatedUser : u);
      const newInvestments = [...prev.investments, inv];
      persist(updatedUsers, newInvestments, prev.deposits, prev.withdrawals, prev.commissions, prev.profitHistory);
      return { ...prev, user: updatedUser, allUsers: updatedUsers, investments: newInvestments };
    });
    return success;
  }, [persist]);

  const withdraw = useCallback((amount: number, pixName?: string, pixKey?: string, type?: 'profits' | 'commission' | 'pool'): boolean => {
    let success = false;
    setState(prev => {
      if (!prev.user || prev.user.profits < amount || amount <= 0) return prev;
      success = true;
      const w: Withdrawal = {
        id: generateId(), userId: prev.user.id, amount,
        pixName: pixName || '', pixKey: pixKey || '', type: type || 'profits',
        status: 'pending', createdAt: Date.now(),
      };
      const updatedUser = { ...prev.user, profits: prev.user.profits - amount };
      const updatedUsers = prev.allUsers.map(u => u.id === prev.user!.id ? updatedUser : u);
      const newWithdrawals = [...prev.withdrawals, w];
      persist(updatedUsers, prev.investments, prev.deposits, newWithdrawals, prev.commissions, prev.profitHistory);
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
      persist(updatedUsers, updatedInvestments, prev.deposits, prev.withdrawals, prev.commissions, prev.profitHistory);
      return { ...prev, user: updatedUser, allUsers: updatedUsers, investments: updatedInvestments };
    });
    return success;
  }, [persist]);

  const earlyRedeem = useCallback((investmentId: string): boolean => {
    let success = false;
    setState(prev => {
      const inv = prev.investments.find(i => i.id === investmentId);
      if (!inv || !prev.user || (inv.status !== 'active' && inv.status !== 'completed')) return prev;
      success = true;
      const daysActive = Math.floor((Date.now() - inv.startDate) / 86400000);
      const feeRate = daysActive < 20 ? 0.40 : 0;
      const returnAmount = inv.amount * (1 - feeRate);
      
      const updatedInvestments = prev.investments.map(i => i.id === investmentId ? { ...i, status: 'withdrawn' as const } : i);
      const updatedUser = {
        ...prev.user,
        balance: prev.user.balance + returnAmount,
        invested: prev.user.invested - inv.amount,
      };
      const updatedUsers = prev.allUsers.map(u => u.id === prev.user!.id ? updatedUser : u);
      persist(updatedUsers, updatedInvestments, prev.deposits, prev.withdrawals, prev.commissions, prev.profitHistory);
      return { ...prev, user: updatedUser, allUsers: updatedUsers, investments: updatedInvestments };
    });
    return success;

  const updateUserBalance = useCallback((userId: string, amount: number) => {
    setState(prev => {
      const updatedUsers = prev.allUsers.map(u => u.id === userId ? { ...u, balance: u.balance + amount } : u);
      const updatedUser = prev.user && prev.user.id === userId ? { ...prev.user, balance: prev.user.balance + amount } : prev.user;
      persist(updatedUsers, prev.investments, prev.deposits, prev.withdrawals, prev.commissions, prev.profitHistory);
      return { ...prev, user: updatedUser, allUsers: updatedUsers };
    });
  }, [persist]);

  const updateUserName = useCallback((newName: string) => {
    setState(prev => {
      if (!prev.user) return prev;
      const updatedUser = { ...prev.user, name: newName };
      const updatedUsers = prev.allUsers.map(u => u.id === prev.user!.id ? updatedUser : u);
      persist(updatedUsers, prev.investments, prev.deposits, prev.withdrawals, prev.commissions, prev.profitHistory);
      return { ...prev, user: updatedUser, allUsers: updatedUsers };
    });
  }, [persist]);

  useEffect(() => {
    const uid = localStorage.getItem('neon_current_user');
    if (uid) {
      const stored = loadState();
      const user = stored.users.find(u => u.id === uid);
      if (user) {
        setState(prev => ({ ...prev, user, allUsers: stored.users, investments: stored.investments, deposits: stored.deposits, withdrawals: stored.withdrawals, commissions: stored.commissions, profitHistory: stored.profitHistory }));
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
      updateUserBalance, updateUserName, loyaltyDays,
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
