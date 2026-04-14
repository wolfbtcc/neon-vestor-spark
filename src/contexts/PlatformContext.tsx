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
  invest: (amount: number) => Promise<boolean>;
  withdraw: (amount: number, walletName?: string, walletAddress?: string, type?: 'profits' | 'commission' | 'pool') => Promise<boolean>;
  updateUserBalance: (userId: string, amount: number) => void;
  updateUserName: (newName: string) => Promise<void>;
  loyaltyDays: number;
  refreshData: () => Promise<void>;
  canWithdraw: () => { allowed: boolean; reason: string };
}

const PlatformContext = createContext<PlatformContextType | null>(null);

Decimal.set({ precision: 20, rounding: Decimal.ROUND_DOWN });

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

// ── Daily yield generation (1% on invested, 70% user / 30% platform) ─

function generateDailyYields() {
  const nowMs = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const DAILY_YIELD_KEY = 'vortex_last_daily_yield';
  const lastYieldDate = localStorage.getItem(DAILY_YIELD_KEY);

  // Only generate once per day
  if (lastYieldDate === today) return;

  const users: User[] = loadJSON(STORAGE_KEYS.users, []);
  let profitHistory: ProfitEntry[] = loadJSON(STORAGE_KEYS.profitHistory, []);

  const DAILY_RATE = new Decimal('0.01'); // 1%
  const USER_SHARE = new Decimal('0.70'); // 70%
  const PLATFORM_SHARE = new Decimal('0.30'); // 30%

  let anyChange = false;

  for (const user of users) {
    if (user.invested <= 0) continue;

    const invested = new Decimal(user.invested);
    const grossProfit = invested.mul(DAILY_RATE);
    const platformFee = grossProfit.mul(PLATFORM_SHARE);
    const netProfit = grossProfit.mul(USER_SHARE);

    profitHistory.unshift({
      id: generateId(),
      userId: user.id,
      amount: grossProfit.toNumber(),
      fee: 0,
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
  localStorage.setItem(DAILY_YIELD_KEY, today);
}

// ── Retention bonus calculation ──────────────────────────────────

function getRetentionBonusMultiplier(userId: string): number {
  const withdrawals: Withdrawal[] = loadJSON(STORAGE_KEYS.withdrawals, []);
  const userWithdrawals = withdrawals
    .filter(w => w.userId === userId && (w.type === 'profits' || w.type === 'pool'))
    .sort((a, b) => b.createdAt - a.createdAt);

  let lastWithdrawDate: number;
  if (userWithdrawals.length > 0) {
    lastWithdrawDate = userWithdrawals[0].createdAt;
  } else {
    const investments: Investment[] = loadJSON(STORAGE_KEYS.investments, []);
    const userInvs = investments.filter(i => i.userId === userId).sort((a, b) => a.startDate - b.startDate);
    if (userInvs.length === 0) return 0;
    lastWithdrawDate = userInvs[0].startDate;
  }

  const daysSinceLastWithdraw = Math.floor((Date.now() - lastWithdrawDate) / 86400000);
  const bonusBlocks = Math.floor(daysSinceLastWithdraw / 15);
  const bonusPercent = bonusBlocks * 10;
  return bonusPercent / 100;
}

// Export retention bonus for UI usage
export { getRetentionBonusMultiplier };

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

// ── Withdrawal eligibility check ─────────────────────────────────

function checkWithdrawEligibility(userId: string): { allowed: boolean; reason: string } {
  // Check if today is Friday (5 = Friday in JS)
  const now = new Date();
  const dayOfWeek = now.getDay();
  if (dayOfWeek !== 5) {
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    return {
      allowed: false,
      reason: `Saques são permitidos apenas às sextas-feiras. Faltam ${daysUntilFriday} dia(s).`,
    };
  }

  // Check referral condition: at least 1 referral with active investment in last 7 days
  const users: User[] = loadJSON(STORAGE_KEYS.users, []);
  const currentUser = users.find(u => u.id === userId);
  if (!currentUser) return { allowed: false, reason: 'Usuário não encontrado.' };

  const referrals = users.filter(u => u.referredBy === currentUser.referralCode);
  if (referrals.length === 0) {
    return {
      allowed: false,
      reason: 'Para sacar, você precisa ter indicado pelo menos 1 pessoa com investimento ativo nos últimos 7 dias.',
    };
  }

  const sevenDaysAgo = Date.now() - 7 * 86400000;
  const investments: Investment[] = loadJSON(STORAGE_KEYS.investments, []);

  const hasQualifiedReferral = referrals.some(ref => {
    // Referral must have been created in last 7 days
    if (ref.createdAt < sevenDaysAgo) return false;
    // And must have an active investment
    return investments.some(inv => inv.userId === ref.id && inv.status === 'active');
  });

  if (!hasQualifiedReferral) {
    return {
      allowed: false,
      reason: 'Para sacar, você precisa ter indicado pelo menos 1 pessoa com investimento ativo nos últimos 7 dias.',
    };
  }

  return { allowed: true, reason: '' };
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

  // Check for yield generation every 5 min
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

  // New invest function: simply moves balance to invested (no cycles)
  const invest = useCallback(async (amount: number): Promise<boolean> => {
    if (!state.user || amount <= 0 || state.user.balance < amount) return false;

    const now = Date.now();
    // Still create an investment record for tracking
    const inv: Investment = {
      id: generateId(),
      userId: state.user.id,
      amount,
      cycleNumber: 1,
      durationDays: 0, // No fixed duration
      returnPercent: 1, // 1% daily
      startDate: now,
      endDate: 0, // No end date
      status: 'active',
      profit: 0,
    };

    const investments: Investment[] = loadJSON(STORAGE_KEYS.investments, []);
    investments.push(inv);
    saveJSON(STORAGE_KEYS.investments, investments);

    // Deduct balance, add to invested
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

  const withdraw = useCallback(async (amount: number, walletName?: string, walletAddress?: string, type?: 'profits' | 'commission' | 'pool'): Promise<boolean> => {
    if (!state.user || state.user.profits < amount || amount <= 0) return false;

    const w: Withdrawal = {
      id: generateId(),
      userId: state.user.id,
      amount,
      walletName: walletName || '',
      walletAddress: walletAddress || '',
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

  const canWithdraw = useCallback(() => {
    if (!state.user) return { allowed: false, reason: 'Usuário não autenticado.' };
    return checkWithdrawEligibility(state.user.id);
  }, [state.user]);

  const loyaltyDays = state.user
    ? Math.min(7, Math.floor((Date.now() - state.user.createdAt) / 86400000))
    : 0;

  return (
    <PlatformContext.Provider value={{
      ...state,
      login, register, logout,
      deposit: depositFn, invest, withdraw,
      updateUserBalance, updateUserName, loyaltyDays, refreshData, canWithdraw,
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
