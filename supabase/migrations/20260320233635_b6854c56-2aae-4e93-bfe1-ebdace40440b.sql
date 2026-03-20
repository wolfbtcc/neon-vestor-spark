
DROP POLICY "System can insert commissions" ON public.commissions;
CREATE POLICY "System can insert commissions" ON public.commissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
