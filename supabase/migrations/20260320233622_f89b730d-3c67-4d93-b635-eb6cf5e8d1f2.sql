
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  phone_country TEXT NOT NULL DEFAULT 'BR',
  balance NUMERIC NOT NULL DEFAULT 0,
  invested NUMERIC NOT NULL DEFAULT 0,
  profits NUMERIC NOT NULL DEFAULT 0,
  referral_code TEXT NOT NULL UNIQUE,
  referred_by UUID REFERENCES auth.users(id),
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create investments table
CREATE TABLE public.investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  cycle_number INT NOT NULL DEFAULT 1,
  duration_days INT NOT NULL,
  return_percent NUMERIC NOT NULL,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'withdrawn')),
  profit NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own investments" ON public.investments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own investments" ON public.investments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own investments" ON public.investments FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Create deposits table
CREATE TABLE public.deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('pix', 'usdt')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed')),
  pix_code TEXT,
  wallet_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deposits" ON public.deposits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own deposits" ON public.deposits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create withdrawals table
CREATE TABLE public.withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  pix_name TEXT NOT NULL DEFAULT '',
  pix_key TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'profits' CHECK (type IN ('profits', 'commission', 'pool')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own withdrawals" ON public.withdrawals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own withdrawals" ON public.withdrawals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create commissions table
CREATE TABLE public.commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id),
  from_user_name TEXT NOT NULL DEFAULT '',
  level INT NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own commissions" ON public.commissions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System can insert commissions" ON public.commissions FOR INSERT TO authenticated WITH CHECK (true);

-- Create profit_history table
CREATE TABLE public.profit_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  fee NUMERIC NOT NULL DEFAULT 0,
  net NUMERIC NOT NULL DEFAULT 0,
  investment_id UUID REFERENCES public.investments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profit history" ON public.profit_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profit history" ON public.profit_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  ref_code TEXT;
  referrer_id UUID;
BEGIN
  ref_code := 'REF_' || upper(substring(md5(random()::text) from 1 for 6));
  
  IF NEW.raw_user_meta_data->>'referred_by_code' IS NOT NULL THEN
    SELECT user_id INTO referrer_id FROM public.profiles WHERE referral_code = NEW.raw_user_meta_data->>'referred_by_code';
  END IF;
  
  INSERT INTO public.profiles (user_id, name, email, phone, phone_country, referral_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_country', 'BR'),
    ref_code,
    referrer_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to process deposit and distribute commissions
CREATE OR REPLACE FUNCTION public.process_deposit(
  p_user_id UUID,
  p_amount NUMERIC,
  p_method TEXT,
  p_pix_code TEXT DEFAULT NULL,
  p_wallet_address TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  dep_id UUID;
  current_referrer_id UUID;
  referrer_profile RECORD;
  comm_amount NUMERIC;
  commission_rates NUMERIC[] := ARRAY[0.15, 0.10, 0.02, 0.01, 0.01];
  lvl INT;
  depositor_name TEXT;
BEGIN
  INSERT INTO public.deposits (user_id, amount, method, status, pix_code, wallet_address)
  VALUES (p_user_id, p_amount, p_method, 'confirmed', p_pix_code, p_wallet_address)
  RETURNING id INTO dep_id;
  
  UPDATE public.profiles SET balance = balance + p_amount, invested = invested + p_amount WHERE user_id = p_user_id;
  
  SELECT name INTO depositor_name FROM public.profiles WHERE user_id = p_user_id;
  SELECT referred_by INTO current_referrer_id FROM public.profiles WHERE user_id = p_user_id;
  
  FOR lvl IN 1..5 LOOP
    EXIT WHEN current_referrer_id IS NULL;
    SELECT * INTO referrer_profile FROM public.profiles WHERE user_id = current_referrer_id;
    EXIT WHEN referrer_profile IS NULL;
    
    comm_amount := p_amount * commission_rates[lvl];
    
    INSERT INTO public.commissions (user_id, from_user_id, from_user_name, level, amount)
    VALUES (current_referrer_id, p_user_id, depositor_name, lvl, comm_amount);
    
    UPDATE public.profiles SET balance = balance + comm_amount WHERE user_id = current_referrer_id;
    current_referrer_id := referrer_profile.referred_by;
  END LOOP;
  
  RETURN dep_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to process early redeem
CREATE OR REPLACE FUNCTION public.process_early_redeem(
  p_user_id UUID,
  p_investment_id UUID,
  p_pix_name TEXT DEFAULT '',
  p_pix_key TEXT DEFAULT ''
)
RETURNS UUID AS $$
DECLARE
  inv RECORD;
  days_active INT;
  fee_rate NUMERIC;
  return_amount NUMERIC;
  w_id UUID;
BEGIN
  SELECT * INTO inv FROM public.investments WHERE id = p_investment_id AND user_id = p_user_id AND status IN ('active', 'completed');
  IF inv IS NULL THEN RAISE EXCEPTION 'Investment not found'; END IF;
  
  days_active := EXTRACT(DAY FROM (now() - inv.start_date));
  fee_rate := CASE WHEN days_active < 20 THEN 0.40 ELSE 0 END;
  return_amount := inv.amount * (1 - fee_rate);
  
  UPDATE public.investments SET status = 'withdrawn' WHERE id = p_investment_id;
  UPDATE public.profiles SET balance = balance + return_amount, invested = GREATEST(0, invested - inv.amount) WHERE user_id = p_user_id;
  
  INSERT INTO public.withdrawals (user_id, amount, pix_name, pix_key, type, status)
  VALUES (p_user_id, return_amount, p_pix_name, p_pix_key, 'pool', 'pending')
  RETURNING id INTO w_id;
  
  RETURN w_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Auto-confirm withdrawals after 24h
CREATE OR REPLACE FUNCTION public.auto_confirm_withdrawals()
RETURNS void AS $$
BEGIN
  UPDATE public.withdrawals SET status = 'completed' WHERE status = 'pending' AND created_at < now() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
