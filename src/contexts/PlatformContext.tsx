import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import Decimal from 'decimal.js';
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
  loading: boolean;
}

interface PlatformContextType extends PlatformState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, referralCode?: string, phone?: string, phoneCountry?: string) => Promise<boolean>;
  logout: () => void;
  deposit: (amount: number, method: 'pix' | 'usdt') => Promise<Deposit | null>;
  invest: (amount: number, durationDays: number, returnPercent: number) => Promise<boolean>;
  withdraw: (amount: number, pixName?: string, pixKey?: string, type?: 'profits' | 'commission' | 'pool') => Promise<boolean>;
  redeemCycle: (investmentId: string) => Promise<boolean>;
  earlyRedeem: (investmentId: string, pixName?: string, pixKey?: string) => Promise<boolean>;
  updateUserBalance: (userId: string, amount: number) => void;
  updateUserName: (newName: string) => Promise<void>;
  loyaltyDays: number;
  refreshData: () => Promise<void>;
}

const PlatformContext = createContext<PlatformContextType | null>(null);

Decimal.set({ precision: 20, rounding: Decimal.ROUND_DOWN });
const POOL_FEE = new Decimal('0.15');

// ── localStorage helpers ──────────────────────────────────────────

const STORAGE_KEYS = {
  users: 'vortex_users',
  investments: 'vortex_investments',
  deposits: 'vortex_deposits',
  withdrawals: 'vortex_withdrawals',
  commissions: 'vortex_commissions',
  profitHistory: 'vortex_profit_history',
  currentUser: 'vortex_current_user',
  lastYieldRun: 'vortex_last_yield_run',
};

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ── Daily yield generation at 12:00 ──────────────────────────────

function generateDailyYields() {
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const lastRun = localStorage.getItem(STORAGE_KEYS.lastYieldRun);

  // Only run if it's 12:00+ and hasn't run today
  if (now.getHours() < 12) return;
  if (lastRun === todayKey) return;

  const investments: Investment[] = loadJSON(STORAGE_KEYS.investments, []);
  const users: User[] = loadJSON(STORAGE_KEYS.users, []);
  let profitHistory: ProfitEntry[] = loadJSON(STORAGE_KEYS.profitHistory, []);

  const nowMs = Date.now();
  const userUpdates: Record<string, { profits: number; balance: number }> = {};

  for (const inv of investments) {
    if (inv.status !== 'active') continue;

    // Check if investment has ended
    if (nowMs >= inv.endDate) {
      inv.status = 'completed';
      continue;
    }

    const amount = new Decimal(inv.amount);
    const returnPct = new Decimal(inv.returnPercent);
    const totalProfit = amount.mul(returnPct).div(100);
    const dailyProfit = totalProfit.div(inv.durationDays);
    const poolFee = dailyProfit.mul(POOL_FEE);
    const netProfit = dailyProfit.minus(poolFee);

    const entry: ProfitEntry = {
      id: generateId(),
      userId: inv.userId,
      amount: dailyProfit.toNumber(),
      fee: poolFee.toNumber(),
      net: netProfit.toNumber(),
      investmentId: inv.id,
      createdAt: nowMs,
    };

    profitHistory.unshift(entry);
    inv.profit += netProfit.toNumber();

    if (!userUpdates[inv.userId]) {
      const user = users.find(u => u.id === inv.userId);
      userUpdates[inv.userId] = {
        profits: user?.profits || 0,
        balance: user?.balance || 0,
      };
    }
    userUpdates[inv.userId].profits += netProfit.toNumber();
    userUpdates[inv.userId].balance += netProfit.toNumber();
  }

  // Apply user updates
  for (const [userId, upd] of Object.entries(userUpdates)) {
    const user = users.find(u => u.id === userId);
    if (user) {
      user.profits = upd.profits;
      user.balance = upd.balance;
    }
  }

  saveJSON(STORAGE_KEYS.investments, investments);
  saveJSON(STORAGE_KEYS.profitHistory, profitHistory);
  saveJSON(STORAGE_KEYS.users, users);
  localStorage.setItem(STORAGE_KEYS.lastYieldRun, todayKey);
}

// ── Provider ─────────────────────────────────────────────────────

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlatformState>({
    user: null,
    investments: [],
    deposits: [],
    withdrawals: [],
    commissions: [],
    profitHistory: [],
    allUsers: [],
    loading: true,
  });

  const loadUserData = useCallback((userId: string) => {
    const users: User[] = loadJSON(STORAGE_KEYS.users, []);
    const user = users.find(u => u.id === userId) || null;
    if (!user) {
      setState(prev => ({ ...prev, user: null, loading: false }));
      return;
    }

    const investments: Investment[] = loadJSON(STORAGE_KEYS.investments, []).filter((i: Investment) => i.userId === userId);
    const deposits: Deposit[] = loadJSON(STORAGE_KEYS.deposits, []).filter((d: Deposit) => d.userId === userId);
    const withdrawals: Withdrawal[] = loadJSON(STORAGE_KEYS.withdrawals, []).filter((w: Withdrawal) => w.userId === userId);
    const commissions: Commission[] = loadJSON(STORAGE_KEYS.commissions, []).filter((c: Commission) => c.userId === userId);
    const allProfitHistory: ProfitEntry[] = loadJSON(STORAGE_KEYS.profitHistory, []);
    const profitHistory = allProfitHistory.filter((p: ProfitEntry) => p.userId === userId).slice(0, 200);

    const allUsers = user.isAdmin ? users : [user];

    setState({
      user,
      investments,
      deposits,
      withdrawals,
      commissions,
      profitHistory,
      allUsers,
      loading: false,
    });
  }, []);

  // On mount: run yield generation, then restore session
  useEffect(() => {
    generateDailyYields();
    const currentUserId = localStorage.getItem(STORAGE_KEYS.currentUser);
    if (currentUserId) {
      loadUserData(currentUserId);
    } else {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [loadUserData]);

  // Check for yield generation periodically (every 5 min)
  useEffect(() => {
    const interval = setInterval(() => {
      generateDailyYields();
      if (state.user) loadUserData(state.user.id);
    }, 300000);
    return () => clearInterval(interval);
  }, [state.user, loadUserData]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const users: User[] = loadJSON(STORAGE_KEYS.users, []);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) return false;

    localStorage.setItem(STORAGE_KEYS.currentUser, user.id);
    loadUserData(user.id);
    return true;
  }, [loadUserData]);

  const register = useCallback(async (name: string, email: string, password: string, referralCode?: string, phone?: string, phoneCountry?: string): Promise<boolean> => {
    const users: User[] = loadJSON(STORAGE_KEYS.users, []);
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) return false;

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
      referredBy: referralCode || null,
      createdAt: Date.now(),
      isAdmin: false,
    };

    users.push(newUser);
    saveJSON(STORAGE_KEYS.users, users);
    localStorage.setItem(STORAGE_KEYS.currentUser, newUser.id);

    // Process referral commissions later on first investment
    loadUserData(newUser.id);
    return true;
  }, [loadUserData]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.currentUser);
    setState(prev => ({ ...prev, user: null, investments: [], deposits: [], withdrawals: [], commissions: [], profitHistory: [], allUsers: [] }));
  }, []);

  const depositFn = useCallback(async (amount: number, method: 'pix' | 'usdt'): Promise<Deposit | null> => {
    if (!state.user) return null;

    const pixCode = method === 'pix' ? generatePixCode() : undefined;
    const walletAddress = method === 'usdt' ? generateWalletAddress() : undefined;

    const dep: Deposit = {
      id: generateId(),
      userId: state.user.id,
      amount,
      method,
      status: 'confirmed',
      pixCode,
      walletAddress,
      createdAt: Date.now(),
    };

    const deposits: Deposit[] = loadJSON(STORAGE_KEYS.deposits, []);
    deposits.push(dep);
    saveJSON(STORAGE_KEYS.deposits, deposits);

    // Update user balance
    const users: User[] = loadJSON(STORAGE_KEYS.users, []);
    const user = users.find(u => u.id === state.user!.id);
    if (user) {
      user.balance += amount;
      saveJSON(STORAGE_KEYS.users, users);
    }

    loadUserData(state.user.id);
    return dep;
  }, [state.user, loadUserData]);

  const invest = useCallback(async (amount: number, durationDays: number, returnPercent: number): Promise<boolean> => {
    if (!state.user || amount <= 0 || state.user.balance < amount) return false;

    const now = Date.now();
    const inv: Investment = {
      id: generateId(),
      userId: state.user.id,
      amount,
      cycleNumber: 1,
      durationDays,
      returnPercent,
      startDate: now,
      endDate: now + durationDays * 86400000,
      status: 'active',
      profit: 0,
    };

    const investments: Investment[] = loadJSON(STORAGE_KEYS.investments, []);
    investments.push(inv);
    saveJSON(STORAGE_KEYS.investments, investments);

    // Deduct balance
    const users: User[] = loadJSON(STORAGE_KEYS.users, []);
    const user = users.find(u => u.id === state.user!.id);
    if (user) {
      user.balance -= amount;
      user.invested += amount;
      saveJSON(STORAGE_KEYS.users, users);
    }

    // Process referral commissions
    if (state.user.referredBy) {
      const allUsers: User[] = loadJSON(STORAGE_KEYS.users, []);
      let referrerCode = state.user.referredBy;
      const commissions: Commission[] = loadJSON(STORAGE_KEYS.commissions, []);

      for (let level = 0; level < COMMISSION_LEVELS.length && referrerCode; level++) {
        const referrer = allUsers.find(u => u.referralCode === referrerCode);
        if (!referrer) break;

        const commAmount = amount * (COMMISSION_LEVELS[level] / 100);
        const comm: Commission = {
          id: generateId(),
          userId: referrer.id,
          fromUserId: state.user.id,
          fromUserName: state.user.name,
          level: level + 1,
          amount: commAmount,
          createdAt: Date.now(),
        };
        commissions.push(comm);
        referrer.balance += commAmount;

        referrerCode = referrer.referredBy;
      }

      saveJSON(STORAGE_KEYS.commissions, commissions);
      saveJSON(STORAGE_KEYS.users, allUsers);
    }

    loadUserData(state.user.id);
    return true;
  }, [state.user, loadUserData]);

  const withdraw = useCallback(async (amount: number, pixName?: string, pixKey?: string, type?: 'profits' | 'commission' | 'pool'): Promise<boolean> => {
    if (!state.user || state.user.profits < amount || amount <= 0) return false;

    const w: Withdrawal = {
      id: generateId(),
      userId: state.user.id,
      amount,
      pixName: pixName || '',
      pixKey: pixKey || '',
      type: type || 'profits',
      status: 'pending',
      createdAt: Date.now(),
    };

    const withdrawals: Withdrawal[] = loadJSON(STORAGE_KEYS.withdrawals, []);
    withdrawals.push(w);
    saveJSON(STORAGE_KEYS.withdrawals, withdrawals);

    const users: User[] = loadJSON(STORAGE_KEYS.users, []);
    const user = users.find(u => u.id === state.user!.id);
    if (user) {
      user.profits -= amount;
      saveJSON(STORAGE_KEYS.users, users);
    }

    loadUserData(state.user.id);
    return true;
  }, [state.user, loadUserData]);

  const redeemCycle = useCallback(async (investmentId: string): Promise<boolean> => {
    const investments: Investment[] = loadJSON(STORAGE_KEYS.investments, []);
    const inv = investments.find(i => i.id === investmentId);
    if (!inv || !state.user || inv.status !== 'completed') return false;

    const total = inv.amount + inv.profit;
    inv.status = 'withdrawn';
    saveJSON(STORAGE_KEYS.investments, investments);

    const users: User[] = loadJSON(STORAGE_KEYS.users, []);
    const user = users.find(u => u.id === state.user!.id);
    if (user) {
      user.balance += total;
      user.invested = Math.max(0, user.invested - inv.amount);
      user.profits += inv.profit;
      saveJSON(STORAGE_KEYS.users, users);
    }

    loadUserData(state.user.id);
    return true;
  }, [state.user, loadUserData]);

  const earlyRedeem = useCallback(async (investmentId: string, pixName?: string, pixKey?: string): Promise<boolean> => {
    if (!state.user) return false;

    const investments: Investment[] = loadJSON(STORAGE_KEYS.investments, []);
    const inv = investments.find(i => i.id === investmentId);
    if (!inv || inv.status !== 'active') return false;

    // Early redeem: return only 50% of invested amount
    const returnAmount = inv.amount * 0.5;
    inv.status = 'withdrawn';
    saveJSON(STORAGE_KEYS.investments, investments);

    const users: User[] = loadJSON(STORAGE_KEYS.users, []);
    const user = users.find(u => u.id === state.user!.id);
    if (user) {
      user.balance += returnAmount;
      user.invested = Math.max(0, user.invested - inv.amount);
      saveJSON(STORAGE_KEYS.users, users);
    }

    // Create withdrawal record
    const w: Withdrawal = {
      id: generateId(),
      userId: state.user.id,
      amount: returnAmount,
      pixName: pixName || '',
      pixKey: pixKey || '',
      type: 'profits',
      status: 'completed',
      createdAt: Date.now(),
    };
    const withdrawals: Withdrawal[] = loadJSON(STORAGE_KEYS.withdrawals, []);
    withdrawals.push(w);
    saveJSON(STORAGE_KEYS.withdrawals, withdrawals);

    loadUserData(state.user.id);
    return true;
  }, [state.user, loadUserData]);

  const updateUserBalance = useCallback((userId: string, amount: number) => {
    const users: User[] = loadJSON(STORAGE_KEYS.users, []);
    const user = users.find(u => u.id === userId);
    if (user) {
      user.balance += amount;
      saveJSON(STORAGE_KEYS.users, users);
    }
    if (state.user) loadUserData(state.user.id);
  }, [state.user, loadUserData]);

  const updateUserName = useCallback(async (newName: string) => {
    if (!state.user) return;
    const users: User[] = loadJSON(STORAGE_KEYS.users, []);
    const user = users.find(u => u.id === state.user!.id);
    if (user) {
      user.name = newName;
      saveJSON(STORAGE_KEYS.users, users);
    }
    loadUserData(state.user.id);
  }, [state.user, loadUserData]);

  const refreshData = useCallback(async () => {
    generateDailyYields();
    if (state.user) loadUserData(state.user.id);
  }, [state.user, loadUserData]);

  const loyaltyDays = state.user
    ? Math.min(7, Math.floor((Date.now() - state.user.createdAt) / 86400000))
    : 0;

  return (
    <PlatformContext.Provider value={{
      ...state,
      login, register, logout,
      deposit: depositFn, invest, withdraw, redeemCycle, earlyRedeem,
      updateUserBalance, updateUserName, loyaltyDays, refreshData,
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
