CREATE TABLE public.admin_private_settings (
  key text PRIMARY KEY,
  body text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.admin_private_settings TO authenticated;
GRANT ALL ON public.admin_private_settings TO service_role;
ALTER TABLE public.admin_private_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read private settings" ON public.admin_private_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert private settings" ON public.admin_private_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update private settings" ON public.admin_private_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER admin_private_settings_updated_at BEFORE UPDATE ON public.admin_private_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.admin_private_settings (key, body)
SELECT key, body FROM public.site_content WHERE key = 'order_admin_email';