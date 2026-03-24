
-- Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  phone_country text DEFAULT 'BR',
  balance numeric NOT NULL DEFAULT 0,
  invested numeric NOT NULL DEFAULT 0,
  profits numeric NOT NULL DEFAULT 0,
  referral_code text UNIQUE,
  referred_by uuid REFERENCES auth.users(id),
  is_admin boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Deposits table
CREATE TABLE public.deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  method text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  pix_code text,
  wallet_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own deposits" ON public.deposits FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Investments table
CREATE TABLE public.investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  cycle_number integer NOT NULL DEFAULT 1,
  duration_days integer NOT NULL,
  return_percent numeric NOT NULL,
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active',
  profit numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own investments" ON public.investments FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Withdrawals table
CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  pix_name text DEFAULT '',
  pix_key text DEFAULT '',
  type text NOT NULL DEFAULT 'profits',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own withdrawals" ON public.withdrawals FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Commissions table (5-level affiliate)
CREATE TABLE public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  from_user_id uuid REFERENCES auth.users(id) NOT NULL,
  from_user_name text DEFAULT '',
  level integer NOT NULL CHECK (level BETWEEN 1 AND 5),
  amount numeric NOT NULL,
  percentage numeric NOT NULL DEFAULT 0,
  deposit_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own commissions" ON public.commissions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE UNIQUE INDEX idx_commissions_deposit_user ON public.commissions (deposit_id, user_id) WHERE deposit_id IS NOT NULL;

-- Profit history table
CREATE TABLE public.profit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  fee numeric NOT NULL DEFAULT 0,
  net numeric NOT NULL DEFAULT 0,
  investment_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profit_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profit history" ON public.profit_history FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Trigger for handle_new_user (create profile on signup)
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
