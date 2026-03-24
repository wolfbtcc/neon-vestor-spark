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

// ── localStorage helpers ──
const STORAGE_KEYS = {
  users: 'vortex_users',
  investments: 'vortex_investments',
  deposits: 'vortex_deposits',
  withdrawals: 'vortex_withdrawals',
  commissions: 'vortex_commissions',
  profitHistory: 'vortex_profitHistory',
  currentUser: 'currentUser',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function saveToStorage(key: string, data: any) {
  localStorage.setItem(key, JSON.stringify(data));
}

function getAllUsers(): User[] { return loadFromStorage<User[]>(STORAGE_KEYS.users, []); }
function saveAllUsers(users: User[]) { saveToStorage(STORAGE_KEYS.users, users); }

function getAllInvestments(): Investment[] { return loadFromStorage<Investment[]>(STORAGE_KEYS.investments, []); }
function saveAllInvestments(inv: Investment[]) { saveToStorage(STORAGE_KEYS.investments, inv); }

function getAllDeposits(): Deposit[] { return loadFromStorage<Deposit[]>(STORAGE_KEYS.deposits, []); }
function saveAllDeposits(d: Deposit[]) { saveToStorage(STORAGE_KEYS.deposits, d); }

function getAllWithdrawals(): Withdrawal[] { return loadFromStorage<Withdrawal[]>(STORAGE_KEYS.withdrawals, []); }
function saveAllWithdrawals(w: Withdrawal[]) { saveToStorage(STORAGE_KEYS.withdrawals, w); }

function getAllCommissions(): Commission[] { return loadFromStorage<Commission[]>(STORAGE_KEYS.commissions, []); }
function saveAllCommissions(c: Commission[]) { saveToStorage(STORAGE_KEYS.commissions, c); }

function getAllProfitHistory(): ProfitEntry[] { return loadFromStorage<ProfitEntry[]>(STORAGE_KEYS.profitHistory, []); }
function saveAllProfitHistory(p: ProfitEntry[]) { saveToStorage(STORAGE_KEYS.profitHistory, p); }

function updateUserInStorage(user: User) {
  const users = getAllUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx >= 0) users[idx] = user; else users.push(user);
  saveAllUsers(users);
}

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

  const yieldIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadUserData = useCallback((userId: string) => {
    const allUsers = getAllUsers();
    const user = allUsers.find(u => u.id === userId) || null;
    if (!user) return;

    setState({
      user,
      investments: getAllInvestments().filter(i => i.userId === userId),
      deposits: getAllDeposits().filter(d => d.userId === userId),
      withdrawals: getAllWithdrawals().filter(w => w.userId === userId),
      commissions: getAllCommissions().filter(c => c.userId === userId),
      profitHistory: getAllProfitHistory().filter(p => p.userId === userId).sort((a, b) => b.createdAt - a.createdAt),
      allUsers,
      loading: false,
    });
  }, []);

  // ── Yield generation (every 30s) ──
  const generateYields = useCallback(() => {
    const currentUserRaw = localStorage.getItem(STORAGE_KEYS.currentUser);
    if (!currentUserRaw) return;
    const { id: userId } = JSON.parse(currentUserRaw);

    const allInvestments = getAllInvestments();
    const activeInvs = allInvestments.filter(i => i.userId === userId && i.status === 'active');
    if (activeInvs.length === 0) return;

    const allUsers = getAllUsers();
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    const profitHistory = getAllProfitHistory();
    const now = Date.now();
    let userProfitsAccum = new Decimal(user.profits.toString());

    for (const inv of activeInvs) {
      // Check if cycle completed
      if (now >= inv.endDate) {
        inv.status = 'completed';
        continue;
      }

      const totalSeconds = (inv.endDate - inv.startDate) / 1000;
      const returnDec = new Decimal(inv.returnPercent.toString()).div(100);
      const amountDec = new Decimal(inv.amount.toString());
      const totalProfit = amountDec.mul(returnDec);
      const profitPerInterval = totalProfit.div(new Decimal(totalSeconds).div(300));

      const gross = profitPerInterval;
      const pool = gross.mul(POOL_FEE);
      const net = gross.minus(pool);

      userProfitsAccum = userProfitsAccum.plus(net);

      profitHistory.push({
        id: generateId(),
        userId,
        amount: Number(gross.toFixed(8)),
        fee: Number(pool.toFixed(8)),
        net: Number(net.toFixed(8)),
        investmentId: inv.id,
        createdAt: now,
      });
    }

    user.profits = Number(userProfitsAccum.toFixed(8));
    updateUserInStorage(user);
    saveAllInvestments(allInvestments);
    saveAllProfitHistory(profitHistory);

    loadUserData(userId);
  }, [loadUserData]);

  // Start/stop yield interval
  useEffect(() => {
    if (state.user) {
      if (yieldIntervalRef.current) clearInterval(yieldIntervalRef.current);
      yieldIntervalRef.current = setInterval(generateYields, 300000);
      // Generate immediately on login
      setTimeout(generateYields, 1000);
    } else {
      if (yieldIntervalRef.current) {
        clearInterval(yieldIntervalRef.current);
        yieldIntervalRef.current = null;
      }
    }
    return () => {
      if (yieldIntervalRef.current) clearInterval(yieldIntervalRef.current);
    };
  }, [state.user?.id, generateYields]);

  // Init: check for saved session
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.currentUser);
    if (raw) {
      try {
        const { id } = JSON.parse(raw);
        loadUserData(id);
      } catch {
        setState(prev => ({ ...prev, loading: false }));
      }
    } else {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [loadUserData]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const users = getAllUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) return false;
    saveToStorage(STORAGE_KEYS.currentUser, { id: user.id, email: user.email });
    loadUserData(user.id);
    return true;
  }, [loadUserData]);

  const register = useCallback(async (name: string, email: string, password: string, referralCode?: string, phone?: string, phoneCountry?: string): Promise<boolean> => {
    const users = getAllUsers();
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
      isAdmin: users.length === 0, // first user is admin
    };

    users.push(newUser);
    saveAllUsers(users);
    saveToStorage(STORAGE_KEYS.currentUser, { id: newUser.id, email: newUser.email });
    loadUserData(newUser.id);
    return true;
  }, [loadUserData]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.currentUser);
    setState(prev => ({ ...prev, user: null, investments: [], deposits: [], withdrawals: [], commissions: [], profitHistory: [] }));
  }, []);

  const depositFn = useCallback(async (amount: number, method: 'pix' | 'usdt'): Promise<Deposit | null> => {
    if (!state.user) return null;

    const dep: Deposit = {
      id: generateId(),
      userId: state.user.id,
      amount,
      method,
      status: 'confirmed',
      pixCode: method === 'pix' ? generatePixCode() : undefined,
      walletAddress: method === 'usdt' ? generateWalletAddress() : undefined,
      createdAt: Date.now(),
    };

    const deposits = getAllDeposits();
    deposits.push(dep);
    saveAllDeposits(deposits);

    // Update user balance
    const user = { ...state.user, balance: state.user.balance + amount };
    updateUserInStorage(user);

    // ── 5-Level Commission Distribution ──
    const allUsers = getAllUsers();
    const allCommissions = getAllCommissions();
    let currentUser = allUsers.find(u => u.id === state.user!.id);
    const visited = new Set<string>([state.user!.id]); // prevent circular loops

    for (let level = 0; level < COMMISSION_LEVELS.length; level++) {
      if (!currentUser?.referredBy) break;

      // Find referrer by referral code
      const referrer = allUsers.find(u => u.referralCode === currentUser!.referredBy);
      if (!referrer || visited.has(referrer.id)) break; // prevent self-referral & loops
      visited.add(referrer.id);

      const pct = COMMISSION_LEVELS[level];
      const commission = Number(new Decimal(amount.toString()).mul(pct).div(100).toFixed(8));

      // Create commission record (with deposit_id for dedup)
      allCommissions.push({
        id: generateId(),
        userId: referrer.id,
        fromUserId: state.user!.id,
        fromUserName: state.user!.name,
        level: level + 1,
        amount: commission,
        createdAt: Date.now(),
      });

      // Credit referrer balance
      referrer.balance = Number(new Decimal(referrer.balance.toString()).plus(commission).toFixed(8));
      updateUserInStorage(referrer);

      currentUser = referrer;
    }

    saveAllCommissions(allCommissions);
    loadUserData(user.id);

    return dep;
  }, [state.user, loadUserData]);

  const invest = useCallback(async (amount: number, durationDays: number, returnPercent: number): Promise<boolean> => {
    if (!state.user || amount <= 0 || state.user.balance < amount - 0.01) return false;

    const userInvestments = getAllInvestments().filter(i => i.userId === state.user!.id);
    const cycleNumber = userInvestments.length + 1;
    const now = Date.now();
    const endDate = now + durationDays * 86400000;

    const inv: Investment = {
      id: generateId(),
      userId: state.user.id,
      amount,
      cycleNumber,
      durationDays,
      returnPercent,
      startDate: now,
      endDate,
      status: 'active',
      profit: amount * (returnPercent / 100),
    };

    const allInv = getAllInvestments();
    allInv.push(inv);
    saveAllInvestments(allInv);

    const user = { ...state.user, balance: state.user.balance - amount, invested: state.user.invested + amount };
    updateUserInStorage(user);
    loadUserData(user.id);
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

    const allW = getAllWithdrawals();
    allW.push(w);
    saveAllWithdrawals(allW);

    const user = { ...state.user, profits: state.user.profits - amount };
    updateUserInStorage(user);
    loadUserData(user.id);
    return true;
  }, [state.user, loadUserData]);

  const redeemCycle = useCallback(async (investmentId: string): Promise<boolean> => {
    const allInv = getAllInvestments();
    const inv = allInv.find(i => i.id === investmentId);
    if (!inv || !state.user || inv.status !== 'completed') return false;

    const total = inv.amount + inv.profit;
    inv.status = 'withdrawn';
    saveAllInvestments(allInv);

    const user = {
      ...state.user,
      balance: state.user.balance + total,
      invested: Math.max(0, state.user.invested - inv.amount),
      profits: state.user.profits + inv.profit,
    };
    updateUserInStorage(user);
    loadUserData(user.id);
    return true;
  }, [state.user, loadUserData]);

  const earlyRedeem = useCallback(async (investmentId: string, pixName?: string, pixKey?: string): Promise<boolean> => {
    if (!state.user) return false;
    const allInv = getAllInvestments();
    const inv = allInv.find(i => i.id === investmentId);
    if (!inv || inv.status !== 'active') return false;

    // Early redeem: return only the principal (no profit)
    inv.status = 'withdrawn';
    saveAllInvestments(allInv);

    const user = {
      ...state.user,
      balance: state.user.balance + inv.amount,
      invested: Math.max(0, state.user.invested - inv.amount),
    };
    updateUserInStorage(user);
    loadUserData(user.id);
    return true;
  }, [state.user, loadUserData]);

  const updateUserBalance = useCallback((userId: string, amount: number) => {
    const users = getAllUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return;
    user.balance = user.balance + amount;
    saveAllUsers(users);
    if (state.user) loadUserData(state.user.id);
  }, [state.user, loadUserData]);

  const updateUserName = useCallback(async (newName: string) => {
    if (!state.user) return;
    const user = { ...state.user, name: newName };
    updateUserInStorage(user);
    loadUserData(user.id);
  }, [state.user, loadUserData]);

  const refreshData = useCallback(async () => {
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
