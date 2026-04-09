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
  withdraw: (amount: number, walletName?: string, walletAddress?: string, type?: 'profits' | 'commission' | 'pool') => Promise<boolean>;
  updateUserBalance: (userId: string, amount: number) => void;
  updateUserName: (newName: string) => Promise<void>;
  loyaltyDays: number;
  refreshData: () => Promise<void>;
}

const PlatformContext = createContext<PlatformContextType | null>(null);

Decimal.set({ precision: 20, rounding: Decimal.ROUND_DOWN });
const DAILY_RATE = new Decimal('0.006'); // 0.6% per day
const POOL_FEE = new Decimal('0.15');
const PLATFORM_FEE = new Decimal('0.15');

// ── localStorage helpers ──────────────────────────────────────────

const STORAGE_KEYS = {
  users: 'vortex_users',
  investments: 'vortex_investments',
  deposits: 'vortex_deposits',
  withdrawals: 'vortex_withdrawals',
  commissions: 'vortex_commissions',
  profitHistory: 'vortex_profit_history',
  currentUser: 'vortex_current_user',
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

// ── Daily yield generation (client-side fallback) ────────────────

function generateDailyYields() {
  const nowMs = Date.now();
  const today = new Date(nowMs).toISOString().split('T')[0];
  const LAST_YIELD_KEY = 'vortex_last_daily_yield';
  const lastYieldDate = localStorage.getItem(LAST_YIELD_KEY);

  // Only generate once per day
  if (lastYieldDate === today) return;

  const users: User[] = loadJSON(STORAGE_KEYS.users, []);
  let profitHistory: ProfitEntry[] = loadJSON(STORAGE_KEYS.profitHistory, []);
  let anyChange = false;

  for (const user of users) {
    if (user.invested <= 0) continue;

    // Check if already generated for this user today
    const alreadyGenerated = profitHistory.some(
      p => p.userId === user.id && new Date(p.createdAt).toISOString().split('T')[0] === today
    );
    if (alreadyGenerated) continue;

    const invested = new Decimal(user.invested);
    const grossProfit = invested.mul(DAILY_RATE);
    const poolFee = grossProfit.mul(POOL_FEE);
    const afterPool = grossProfit.minus(poolFee);
    const platformFee = afterPool.mul(PLATFORM_FEE);
    const netProfit = afterPool.minus(platformFee);

    profitHistory.unshift({
      id: generateId(),
      userId: user.id,
      amount: grossProfit.toNumber(),
      fee: poolFee.toNumber(),
      platformFee: platformFee.toNumber(),
      net: netProfit.toNumber(),
      investmentId: '',
      createdAt: nowMs,
    });

    user.profits += netProfit.toNumber();
    user.balance += netProfit.toNumber();
    anyChange = true;
  }

  if (anyChange) {
    saveJSON(STORAGE_KEYS.users, users);
    saveJSON(STORAGE_KEYS.profitHistory, profitHistory);
  }
  localStorage.setItem(LAST_YIELD_KEY, today);
}

// ── Auto-complete withdrawals after 48h ──────────────────────────

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

function autoCompleteWithdrawals() {
  const nowMs = Date.now();
  const withdrawals: Withdrawal[] = loadJSON(STORAGE_KEYS.withdrawals, []);
  let changed = false;

  for (const w of withdrawals) {
    if (w.status === 'pending' && (nowMs - w.createdAt) >= FORTY_EIGHT_HOURS_MS) {
      w.status = 'completed';
      changed = true;
    }
  }

  if (changed) {
    saveJSON(STORAGE_KEYS.withdrawals, withdrawals);
  }
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

  // On mount: run daily yield generation, auto-complete withdrawals, then restore session
  useEffect(() => {
    generateDailyYields();
    autoCompleteWithdrawals();
    const currentUserId = localStorage.getItem(STORAGE_KEYS.currentUser);
    if (currentUserId) {
      loadUserData(currentUserId);
    } else {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [loadUserData]);

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

    // Update user balance — deposit goes to invested (active balance for daily yield)
    const users: User[] = loadJSON(STORAGE_KEYS.users, []);
    const user = users.find(u => u.id === state.user!.id);
    if (user) {
      user.balance += amount;
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
    return dep;
  }, [state.user, loadUserData]);

  const withdraw = useCallback(async (amount: number, walletName?: string, walletAddress?: string, type?: 'profits' | 'commission' | 'pool'): Promise<boolean> => {
    if (!state.user || state.user.profits < amount || amount <= 0) return false;

    // Withdrawal restriction: only on day 5 of each month
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    if (now.getDate() !== 5) return false;

    // Apply 20% fee
    const fee = amount * 0.20;
    const netAmount = amount - fee;

    const w: Withdrawal = {
      id: generateId(),
      userId: state.user.id,
      amount: netAmount,
      walletName: walletName || '',
      walletAddress: walletAddress || '',
      type: type || 'profits',
      status: 'pending',
      createdAt: Date.now(),
    };

    const withdrawals: Withdrawal[] = loadJSON(STORAGE_KEYS.withdrawals, []);

    // Check for pending withdrawals (prevent multiple simultaneous)
    const hasPending = withdrawals.some(w => w.userId === state.user!.id && w.status === 'pending');
    if (hasPending) return false;

    withdrawals.push(w);
    saveJSON(STORAGE_KEYS.withdrawals, withdrawals);

    const users: User[] = loadJSON(STORAGE_KEYS.users, []);
    const user = users.find(u => u.id === state.user!.id);
    if (user) {
      user.profits -= amount; // Deduct full amount from profits
      user.balance -= amount;
      saveJSON(STORAGE_KEYS.users, users);
    }

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
      deposit: depositFn, withdraw,
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
