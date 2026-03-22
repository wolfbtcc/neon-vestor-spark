import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Decimal from 'decimal.js';
import {
  User, Investment, Deposit, Withdrawal, Commission, ProfitEntry,
  generatePixCode, generateWalletAddress,
  COMMISSION_LEVELS,
} from '@/lib/platform';
import type { Session } from '@supabase/supabase-js';

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

function profileToUser(p: any): User {
  return {
    id: p.user_id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    phoneCountry: p.phone_country,
    password: '',
    balance: Number(p.balance),
    invested: Number(p.invested),
    profits: Number(p.profits),
    referralCode: p.referral_code,
    referredBy: p.referred_by,
    createdAt: new Date(p.created_at).getTime(),
    isAdmin: p.is_admin,
  };
}

function dbInvestmentToInvestment(i: any): Investment {
  return {
    id: i.id,
    userId: i.user_id,
    amount: Number(i.amount),
    cycleNumber: i.cycle_number,
    durationDays: i.duration_days,
    returnPercent: Number(i.return_percent),
    startDate: new Date(i.start_date).getTime(),
    endDate: new Date(i.end_date).getTime(),
    status: i.status as 'active' | 'completed' | 'withdrawn',
    profit: Number(i.profit),
  };
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

  const loadUserData = useCallback(async (userId: string) => {
    const [profileRes, investRes, depositRes, withdrawRes, commRes, profitRes, allProfilesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).single(),
      supabase.from('investments').select('*').eq('user_id', userId),
      supabase.from('deposits').select('*').eq('user_id', userId),
      supabase.from('withdrawals').select('*').eq('user_id', userId),
      supabase.from('commissions').select('*').eq('user_id', userId),
      supabase.from('profit_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
    ]);

    if (!profileRes.data) return;

    const user = profileToUser(profileRes.data);
    const allUsers = (allProfilesRes.data || []).map(profileToUser);

    setState({
      user,
      investments: (investRes.data || []).map(dbInvestmentToInvestment),
      deposits: (depositRes.data || []).map((d: any) => ({
        id: d.id,
        userId: d.user_id,
        amount: Number(d.amount),
        method: d.method as 'pix' | 'usdt',
        status: d.status as 'pending' | 'confirmed',
        pixCode: d.pix_code || undefined,
        walletAddress: d.wallet_address || undefined,
        createdAt: new Date(d.created_at).getTime(),
      })),
      withdrawals: (withdrawRes.data || []).map((w: any) => ({
        id: w.id,
        userId: w.user_id,
        amount: Number(w.amount),
        pixName: w.pix_name,
        pixKey: w.pix_key,
        type: w.type as 'profits' | 'commission' | 'pool',
        status: w.status as 'pending' | 'completed',
        createdAt: new Date(w.created_at).getTime(),
      })),
      commissions: (commRes.data || []).map((c: any) => ({
        id: c.id,
        userId: c.user_id,
        fromUserId: c.from_user_id,
        fromUserName: c.from_user_name,
        level: c.level,
        amount: Number(c.amount),
        createdAt: new Date(c.created_at).getTime(),
      })),
      profitHistory: (profitRes.data || []).map((p: any) => ({
        id: p.id,
        userId: p.user_id,
        amount: Number(p.amount),
        fee: Number(p.fee),
        net: Number(p.net),
        investmentId: p.investment_id,
        createdAt: new Date(p.created_at).getTime(),
      })),
      allUsers,
      loading: false,
    });
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Use setTimeout to avoid deadlock with Supabase auth
        setTimeout(() => loadUserData(session.user.id), 0);
      } else {
        setState(prev => ({ ...prev, user: null, loading: false }));
      }
    });

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  // 30-second yield generation
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!state.user) return;
      const activeInvs = state.investments.filter(i => i.userId === state.user!.id && i.status === 'active');
      if (activeInvs.length === 0) return;

      const now = Date.now();
      let totalNet = 0;

      for (const inv of activeInvs) {
        const totalProfit = inv.amount * (inv.returnPercent / 100);
        const durationSeconds = inv.durationDays * 86400;
        const profitPer30s = totalProfit / (durationSeconds / 30);
        const fee = profitPer30s * POOL_FEE;
        const net = profitPer30s - fee;
        totalNet += net;

        // Insert profit entry
        await supabase.from('profit_history').insert({
          user_id: state.user!.id,
          amount: profitPer30s,
          fee,
          net,
          investment_id: inv.id,
        });
      }

      if (totalNet > 0) {
        // Update user profits and balance
        await supabase.from('profiles').update({
          profits: state.user!.profits + totalNet,
          balance: state.user!.balance + totalNet,
        }).eq('user_id', state.user!.id);

        // Check completed cycles
        for (const inv of activeInvs) {
          if (now >= inv.endDate) {
            await supabase.from('investments').update({ status: 'completed' }).eq('id', inv.id);
          }
        }

        // Reload data
        await loadUserData(state.user!.id);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [state.user, state.investments, loadUserData]);

  // Auto-confirm withdrawals check every 30s
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!state.user) return;
      await supabase.rpc('auto_confirm_withdrawals');
      // Check completed cycles
      const now = new Date().toISOString();
      await supabase.from('investments')
        .update({ status: 'completed' })
        .eq('user_id', state.user.id)
        .eq('status', 'active')
        .lte('end_date', now);
      await loadUserData(state.user.id);
    }, 30000);
    return () => clearInterval(interval);
  }, [state.user, loadUserData]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, referralCode?: string, phone?: string, phoneCountry?: string): Promise<boolean> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone: phone || '',
          phone_country: phoneCountry || 'BR',
          referred_by_code: referralCode || '',
        },
      },
    });
    return !error;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setState(prev => ({ ...prev, user: null }));
  }, []);

  const depositFn = useCallback(async (amount: number, method: 'pix' | 'usdt'): Promise<Deposit | null> => {
    if (!state.user) return null;
    const pixCode = method === 'pix' ? generatePixCode() : undefined;
    const walletAddress = method === 'usdt' ? generateWalletAddress() : undefined;

    const { data, error } = await supabase.rpc('process_deposit', {
      p_user_id: state.user.id,
      p_amount: amount,
      p_method: method,
      p_pix_code: pixCode || null,
      p_wallet_address: walletAddress || null,
    });

    if (error) { console.error('Deposit error:', error); return null; }

    await loadUserData(state.user.id);

    return {
      id: data,
      userId: state.user.id,
      amount,
      method,
      status: 'confirmed',
      pixCode,
      walletAddress,
      createdAt: Date.now(),
    };
  }, [state.user, loadUserData]);

  const invest = useCallback(async (amount: number, durationDays: number, returnPercent: number): Promise<boolean> => {
    if (!state.user || amount <= 0 || state.user.balance < amount - 0.01) return false;

    const cycleNumber = state.investments.filter(i => i.userId === state.user!.id).length + 1;
    const now = new Date();
    const endDate = new Date(now.getTime() + durationDays * 86400000);

    const { error: invError } = await supabase.from('investments').insert({
      user_id: state.user.id,
      amount,
      cycle_number: cycleNumber,
      duration_days: durationDays,
      return_percent: returnPercent,
      start_date: now.toISOString(),
      end_date: endDate.toISOString(),
      status: 'active',
      profit: amount * (returnPercent / 100),
    });

    if (invError) { console.error('Invest error:', invError); return false; }

    await supabase.from('profiles').update({
      balance: state.user.balance - amount,
    }).eq('user_id', state.user.id);

    await loadUserData(state.user.id);
    return true;
  }, [state.user, state.investments, loadUserData]);

  const withdraw = useCallback(async (amount: number, pixName?: string, pixKey?: string, type?: 'profits' | 'commission' | 'pool'): Promise<boolean> => {
    if (!state.user || state.user.profits < amount || amount <= 0) return false;

    const { error } = await supabase.from('withdrawals').insert({
      user_id: state.user.id,
      amount,
      pix_name: pixName || '',
      pix_key: pixKey || '',
      type: type || 'profits',
      status: 'pending',
    });

    if (error) { console.error('Withdraw error:', error); return false; }

    await supabase.from('profiles').update({
      profits: state.user.profits - amount,
    }).eq('user_id', state.user.id);

    await loadUserData(state.user.id);
    return true;
  }, [state.user, loadUserData]);

  const redeemCycle = useCallback(async (investmentId: string): Promise<boolean> => {
    const inv = state.investments.find(i => i.id === investmentId);
    if (!inv || !state.user || inv.status !== 'completed') return false;

    const total = inv.amount + inv.profit;

    await supabase.from('investments').update({ status: 'withdrawn' }).eq('id', investmentId);
    await supabase.from('profiles').update({
      balance: state.user.balance + total,
      invested: Math.max(0, state.user.invested - inv.amount),
      profits: state.user.profits + inv.profit,
    }).eq('user_id', state.user.id);

    await loadUserData(state.user.id);
    return true;
  }, [state.user, state.investments, loadUserData]);

  const earlyRedeem = useCallback(async (investmentId: string, pixName?: string, pixKey?: string): Promise<boolean> => {
    if (!state.user) return false;

    const { error } = await supabase.rpc('process_early_redeem', {
      p_user_id: state.user.id,
      p_investment_id: investmentId,
      p_pix_name: pixName || '',
      p_pix_key: pixKey || '',
    });

    if (error) { console.error('Early redeem error:', error); return false; }

    await loadUserData(state.user.id);
    return true;
  }, [state.user, loadUserData]);

  const updateUserBalance = useCallback(async (userId: string, amount: number) => {
    const targetUser = state.allUsers.find(u => u.id === userId);
    if (!targetUser) return;
    await supabase.from('profiles').update({
      balance: targetUser.balance + amount,
    }).eq('user_id', userId);
    if (state.user) await loadUserData(state.user.id);
  }, [state.allUsers, state.user, loadUserData]);

  const updateUserName = useCallback(async (newName: string) => {
    if (!state.user) return;
    await supabase.from('profiles').update({ name: newName }).eq('user_id', state.user.id);
    await loadUserData(state.user.id);
  }, [state.user, loadUserData]);

  const refreshData = useCallback(async () => {
    if (state.user) await loadUserData(state.user.id);
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
