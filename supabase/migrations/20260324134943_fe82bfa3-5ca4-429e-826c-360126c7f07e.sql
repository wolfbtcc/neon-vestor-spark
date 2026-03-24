-- Fix process_deposit: only add to balance, not invested
CREATE OR REPLACE FUNCTION public.process_deposit(
  p_user_id uuid,
  p_amount numeric,
  p_method text,
  p_pix_code text DEFAULT NULL,
  p_wallet_address text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  UPDATE public.profiles SET balance = balance + p_amount WHERE user_id = p_user_id;
  
  SELECT name INTO depositor_name FROM public.profiles WHERE user_id = p_user_id;
  SELECT referred_by INTO current_referrer_id FROM public.profiles WHERE user_id = p_user_id;
  
  FOR lvl IN 1..5 LOOP
    EXIT WHEN current_referrer_id IS NULL;
    SELECT * INTO referrer_profile FROM public.profiles WHERE user_id = current_referrer_id;
    EXIT WHEN referrer_profile IS NULL;
    EXIT WHEN current_referrer_id = p_user_id;
    
    comm_amount := p_amount * commission_rates[lvl];
    
    INSERT INTO public.commissions (user_id, from_user_id, from_user_name, level, amount, percentage, deposit_id)
    VALUES (current_referrer_id, p_user_id, depositor_name, lvl, comm_amount, commission_rates[lvl] * 100, dep_id::text);
    
    UPDATE public.profiles SET balance = balance + comm_amount WHERE user_id = current_referrer_id;
    current_referrer_id := referrer_profile.referred_by;
  END LOOP;
  
  RETURN dep_id;
END;
$$;

-- Process invest
CREATE OR REPLACE FUNCTION public.process_invest(
  p_user_id uuid,
  p_amount numeric,
  p_duration_days integer,
  p_return_percent numeric
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv_id uuid;
  user_balance numeric;
  cycle_num integer;
BEGIN
  SELECT balance INTO user_balance FROM public.profiles WHERE user_id = p_user_id;
  IF user_balance IS NULL OR user_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  SELECT COALESCE(MAX(cycle_number), 0) + 1 INTO cycle_num FROM public.investments WHERE user_id = p_user_id;
  
  INSERT INTO public.investments (user_id, amount, cycle_number, duration_days, return_percent, start_date, end_date, profit, status)
  VALUES (
    p_user_id, p_amount, cycle_num, p_duration_days, p_return_percent,
    now(), now() + (p_duration_days || ' days')::interval,
    p_amount * (p_return_percent / 100.0), 'active'
  )
  RETURNING id INTO inv_id;
  
  UPDATE public.profiles SET balance = balance - p_amount, invested = invested + p_amount WHERE user_id = p_user_id;
  
  RETURN inv_id;
END;
$$;

-- Process withdraw
CREATE OR REPLACE FUNCTION public.process_withdraw(
  p_user_id uuid,
  p_amount numeric,
  p_pix_name text DEFAULT '',
  p_pix_key text DEFAULT '',
  p_type text DEFAULT 'profits'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w_id uuid;
  user_profits numeric;
BEGIN
  SELECT profits INTO user_profits FROM public.profiles WHERE user_id = p_user_id;
  IF user_profits IS NULL OR user_profits < p_amount THEN
    RAISE EXCEPTION 'Insufficient profits';
  END IF;
  
  INSERT INTO public.withdrawals (user_id, amount, pix_name, pix_key, type, status)
  VALUES (p_user_id, p_amount, p_pix_name, p_pix_key, p_type, 'pending')
  RETURNING id INTO w_id;
  
  UPDATE public.profiles SET profits = profits - p_amount WHERE user_id = p_user_id;
  
  RETURN w_id;
END;
$$;

-- Process redeem completed cycle
CREATE OR REPLACE FUNCTION public.process_redeem(
  p_user_id uuid,
  p_investment_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
BEGIN
  SELECT * INTO inv FROM public.investments WHERE id = p_investment_id AND user_id = p_user_id AND status = 'completed';
  IF inv IS NULL THEN
    RAISE EXCEPTION 'Investment not found or not completed';
  END IF;
  
  UPDATE public.investments SET status = 'withdrawn' WHERE id = p_investment_id;
  
  UPDATE public.profiles SET
    balance = balance + inv.amount + inv.profit,
    invested = GREATEST(0, invested - inv.amount),
    profits = profits + inv.profit
  WHERE user_id = p_user_id;
END;
$$;

-- Get team members (referral tree up to 5 levels)
CREATE OR REPLACE FUNCTION public.get_team_members()
RETURNS TABLE(member_user_id uuid, member_name text, member_email text, member_phone text, member_level integer, member_referral_code text, member_created_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_user_id uuid;
  current_level_ids uuid[];
  next_level_ids uuid[];
  lvl integer;
BEGIN
  my_user_id := auth.uid();
  
  current_level_ids := ARRAY(
    SELECT p.user_id FROM public.profiles p WHERE p.referred_by = my_user_id
  );
  
  FOR lvl IN 1..5 LOOP
    EXIT WHEN current_level_ids IS NULL OR array_length(current_level_ids, 1) IS NULL;
    
    RETURN QUERY
    SELECT p.user_id, p.name, p.email, COALESCE(p.phone, ''), lvl, p.referral_code, p.created_at
    FROM public.profiles p
    WHERE p.user_id = ANY(current_level_ids);
    
    next_level_ids := ARRAY(
      SELECT p.user_id FROM public.profiles p WHERE p.referred_by = ANY(current_level_ids)
    );
    
    current_level_ids := next_level_ids;
  END LOOP;
END;
$$;

-- Admin: get all profiles
CREATE OR REPLACE FUNCTION public.get_all_profiles_admin()
RETURNS SETOF public.profiles
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY SELECT * FROM public.profiles;
END;
$$;

-- Admin: adjust user balance
CREATE OR REPLACE FUNCTION public.admin_update_balance(
  p_target_user_id uuid,
  p_amount numeric
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.profiles SET balance = balance + p_amount WHERE user_id = p_target_user_id;
END;
$$;