CREATE OR REPLACE FUNCTION public.ensure_profile_for_current_user(
  p_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_phone_country text DEFAULT NULL,
  p_referred_by_code text DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_existing public.profiles%ROWTYPE;
  v_referrer_id uuid;
  v_ref_code text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_email
  FROM auth.users
  WHERE id = v_user_id;

  SELECT * INTO v_existing
  FROM public.profiles
  WHERE user_id = v_user_id;

  IF v_existing.user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET
      name = CASE
        WHEN COALESCE(public.profiles.name, '') = '' AND COALESCE(p_name, '') <> '' THEN p_name
        ELSE public.profiles.name
      END,
      email = CASE
        WHEN COALESCE(public.profiles.email, '') = '' AND COALESCE(v_email, '') <> '' THEN v_email
        ELSE public.profiles.email
      END,
      phone = CASE
        WHEN COALESCE(public.profiles.phone, '') = '' AND COALESCE(p_phone, '') <> '' THEN p_phone
        ELSE public.profiles.phone
      END,
      phone_country = CASE
        WHEN COALESCE(public.profiles.phone_country, '') = '' AND COALESCE(p_phone_country, '') <> '' THEN p_phone_country
        ELSE public.profiles.phone_country
      END,
      updated_at = now()
    WHERE user_id = v_user_id
    RETURNING * INTO v_existing;

    RETURN v_existing;
  END IF;

  IF COALESCE(p_referred_by_code, '') <> '' THEN
    SELECT user_id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = p_referred_by_code
    LIMIT 1;
  END IF;

  LOOP
    v_ref_code := 'REF_' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE referral_code = v_ref_code
    );
  END LOOP;

  INSERT INTO public.profiles (
    user_id,
    name,
    email,
    phone,
    phone_country,
    referral_code,
    referred_by
  )
  VALUES (
    v_user_id,
    COALESCE(p_name, ''),
    COALESCE(v_email, ''),
    COALESCE(p_phone, ''),
    COALESCE(p_phone_country, 'BR'),
    v_ref_code,
    v_referrer_id
  )
  RETURNING * INTO v_existing;

  RETURN v_existing;
END;
$function$;