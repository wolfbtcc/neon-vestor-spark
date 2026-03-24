import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  User, Investment, Deposit, Withdrawal, Commission, ProfitEntry,
  generatePixCode, generateWalletAddress,
  COMMISSION_LEVELS,
} from '@/lib/platform';

interface TeamMember {
  userId: string;
  name: string;
  email: string;
  phone: string;
  level: number;
  referralCode: string;
  createdAt: number;
}

interface PlatformState {
  user: User | null;
  investments: Investment[];
  deposits: Deposit[];
  withdrawals: Withdrawal[];
  commissions: Commission[];
  profitHistory: ProfitEntry[];
  allUsers: User[];
  teamMembers: TeamMember[];
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

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlatformState>({
    user: null,
    investments: [],
    deposits: [],
    withdrawals: [],
    commissions: [],
    profitHistory: [],
    allUsers: [],
    teamMembers: [],
    loading: true,
  });

  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  const ensureProfile = useCallback(async (fallbackUserId?: string) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || (fallbackUserId && authUser.id !== fallbackUserId)) return;

      await supabase.rpc('ensure_profile_for_current_user', {
        p_name: authUser.user_metadata?.name ?? null,
        p_phone: authUser.user_metadata?.phone ?? null,
        p_phone_country: authUser.user_metadata?.phone_country ?? null,
        p_referred_by_code: authUser.user_metadata?.referred_by_code ?? null,
      });
    } catch (err) {
      console.error('Error ensuring profile:', err);
    }
  }, []);

  const loadUserData = useCallback(async (userId: string, retries = 3) => {
    try {
      let profile = null;
      for (let i = 0; i < retries; i++) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        if (data) { profile = data; break; }
        if (i < retries - 1) await new Promise(r => setTimeout(r, 600));
      }

      if (!profile) {
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      const [invRes, depRes, wdRes, commRes, profRes] = await Promise.all([
        supabase.from('investments').select('*').eq('user_id', userId),
        supabase.from('deposits').select('*').eq('user_id', userId),
        supabase.from('withdrawals').select('*').eq('user_id', userId),
        supabase.from('commissions').select('*').eq('user_id', userId),
        supabase.from('profit_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(200),
      ]);

      const user: User = {
        id: profile.user_id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone || '',
        phoneCountry: profile.phone_country || 'BR',
        password: '',
        balance: Number(profile.balance),
        invested: Number(profile.invested),
        profits: Number(profile.profits),
        referralCode: profile.referral_code || '',
        referredBy: profile.referred_by,
        createdAt: new Date(profile.created_at).getTime(),
        isAdmin: profile.is_admin || false,
      };

      const investments: Investment[] = (invRes.data || []).map(i => ({
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
      }));

      const deposits: Deposit[] = (depRes.data || []).map(d => ({
        id: d.id,
        userId: d.user_id,
        amount: Number(d.amount),
        method: d.method as 'pix' | 'usdt',
        status: d.status as 'pending' | 'confirmed',
        pixCode: d.pix_code || undefined,
        walletAddress: d.wallet_address || undefined,
        createdAt: new Date(d.created_at).getTime(),
      }));

      const withdrawals: Withdrawal[] = (wdRes.data || []).map(w => ({
        id: w.id,
        userId: w.user_id,
        amount: Number(w.amount),
        pixName: w.pix_name || '',
        pixKey: w.pix_key || '',
        type: w.type as 'profits' | 'commission' | 'pool',
        status: w.status as 'pending' | 'completed',
        createdAt: new Date(w.created_at).getTime(),
      }));

      const commissions: Commission[] = (commRes.data || []).map(c => ({
        id: c.id,
        userId: c.user_id,
        fromUserId: c.from_user_id,
        fromUserName: c.from_user_name || '',
        level: c.level,
        amount: Number(c.amount),
        createdAt: new Date(c.created_at).getTime(),
      }));

      const profitHistory: ProfitEntry[] = (profRes.data || []).map(p => ({
        id: p.id,
        userId: p.user_id,
        amount: Number(p.amount),
        fee: Number(p.fee),
        net: Number(p.net),
        investmentId: p.investment_id || '',
        createdAt: new Date(p.created_at).getTime(),
      }));

      let teamMembers: TeamMember[] = [];
      try {
        const { data: teamData } = await supabase.rpc('get_team_members');
        if (teamData) {
          teamMembers = (teamData as any[]).map(t => ({
            userId: t.member_user_id,
            name: t.member_name,
            email: t.member_email,
            phone: t.member_phone || '',
            level: t.member_level,
            referralCode: t.member_referral_code || '',
            createdAt: new Date(t.member_created_at).getTime(),
          }));
        }
      } catch { /* ignore */ }

      let allUsers: User[] = [user];
      if (profile.is_admin) {
        try {
          const { data: allProfiles } = await supabase.rpc('get_all_profiles_admin');
          if (allProfiles) {
            allUsers = (allProfiles as any[]).map(p => ({
              id: p.user_id,
              name: p.name,
              email: p.email,
              phone: p.phone || '',
              phoneCountry: p.phone_country || 'BR',
              password: '',
              balance: Number(p.balance),
              invested: Number(p.invested),
              profits: Number(p.profits),
              referralCode: p.referral_code || '',
              referredBy: p.referred_by,
              createdAt: new Date(p.created_at).getTime(),
              isAdmin: p.is_admin || false,
            }));
          }
        } catch { /* ignore */ }
      }

      setState({
        user,
        investments,
        deposits,
        withdrawals,
        commissions,
        profitHistory,
        allUsers,
        teamMembers,
        loading: false,
      });
    } catch (err) {
      console.error('Error loading user data:', err);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        currentUserIdRef.current = session.user.id;
        setState(prev => ({ ...prev, loading: true }));
        await ensureProfile(session.user.id);
        await loadUserData(session.user.id);
      } else {
        currentUserIdRef.current = null;
        setState(prev => ({
          ...prev,
          user: null,
          investments: [],
          deposits: [],
          withdrawals: [],
          commissions: [],
          profitHistory: [],
          allUsers: [],
          teamMembers: [],
          loading: false,
        }));
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        currentUserIdRef.current = session.user.id;
        setState(prev => ({ ...prev, loading: true }));
        await ensureProfile(session.user.id);
        await loadUserData(session.user.id);
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserData, ensureProfile]);

  useEffect(() => {
    if (state.user) {
      refreshIntervalRef.current = setInterval(() => {
        if (currentUserIdRef.current) {
          loadUserData(currentUserIdRef.current);
        }
      }, 30000);
    } else {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    }
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [state.user?.id, loadUserData]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return false;
    await loadUserData(data.user.id);
    return true;
  }, [loadUserData]);

  const register = useCallback(async (name: string, email: string, password: string, referralCode?: string, phone?: string, phoneCountry?: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone: phone || '',
          phone_country: phoneCountry || 'BR',
          referred_by_code: referralCode || undefined,
        },
      },
    });
    if (error || !data.user) return false;
    await ensureProfile(data.user.id);
    await loadUserData(data.user.id);
    return true;
  }, [ensureProfile, loadUserData]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
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

    if (error) {
      console.error('Deposit error:', error);
      return null;
    }

    const dep: Deposit = {
      id: data as string,
      userId: state.user.id,
      amount,
      method,
      status: 'confirmed',
      pixCode,
      walletAddress,
      createdAt: Date.now(),
    };

    await loadUserData(state.user.id);
    return dep;
  }, [state.user, loadUserData]);

  const invest = useCallback(async (amount: number, durationDays: number, returnPercent: number): Promise<boolean> => {
    if (!state.user || amount <= 0) return false;

    const { error } = await supabase.rpc('process_invest', {
      p_user_id: state.user.id,
      p_amount: amount,
      p_duration_days: durationDays,
      p_return_percent: returnPercent,
    });

    if (error) {
      console.error('Invest error:', error);
      return false;
    }

    await loadUserData(state.user.id);
    return true;
  }, [state.user, loadUserData]);

  const withdraw = useCallback(async (amount: number, pixName?: string, pixKey?: string, type?: 'profits' | 'commission' | 'pool'): Promise<boolean> => {
    if (!state.user || amount <= 0) return false;

    const { error } = await supabase.rpc('process_withdraw', {
      p_user_id: state.user.id,
      p_amount: amount,
      p_pix_name: pixName || '',
      p_pix_key: pixKey || '',
      p_type: type || 'profits',
    });

    if (error) {
      console.error('Withdraw error:', error);
      return false;
    }

    await loadUserData(state.user.id);
    return true;
  }, [state.user, loadUserData]);

  const redeemCycle = useCallback(async (investmentId: string): Promise<boolean> => {
    if (!state.user) return false;

    const { error } = await supabase.rpc('process_redeem', {
      p_user_id: state.user.id,
      p_investment_id: investmentId,
    });

    if (error) {
      console.error('Redeem error:', error);
      return false;
    }

    await loadUserData(state.user.id);
    return true;
  }, [state.user, loadUserData]);

  const earlyRedeem = useCallback(async (investmentId: string, pixName?: string, pixKey?: string): Promise<boolean> => {
    if (!state.user) return false;

    const { error } = await supabase.rpc('process_early_redeem', {
      p_user_id: state.user.id,
      p_investment_id: investmentId,
      p_pix_name: pixName || '',
      p_pix_key: pixKey || '',
    });

    if (error) {
      console.error('Early redeem error:', error);
      return false;
    }

    await loadUserData(state.user.id);
    return true;
  }, [state.user, loadUserData]);

  const updateUserBalance = useCallback(async (userId: string, amount: number) => {
    const { error } = await supabase.rpc('admin_update_balance', {
      p_target_user_id: userId,
      p_amount: amount,
    });

    if (error) {
      console.error('Admin balance update error:', error);
      return;
    }

    if (state.user) await loadUserData(state.user.id);
  }, [state.user, loadUserData]);

  const updateUserName = useCallback(async (newName: string) => {
    if (!state.user) return;
    await supabase
      .from('profiles')
      .update({ name: newName })
      .eq('user_id', state.user.id);
    await loadUserData(state.user.id);
  }, [state.user, loadUserData]);

  const refreshData = useCallback(async () => {
    if (currentUserIdRef.current) {
      await loadUserData(currentUserIdRef.current);
    }
  }, [loadUserData]);

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
