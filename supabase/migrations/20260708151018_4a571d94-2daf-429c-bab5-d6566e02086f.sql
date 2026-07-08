
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Update generate_daily_reminders to use private.has_role
CREATE OR REPLACE FUNCTION public.generate_daily_reminders()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tpl text;
  v_count integer := 0;
  r record;
  v_msg text;
  v_phone text;
  v_url text;
  v_pay_link text := 'upi://pay?pa=asimkhatik1116-1@okicici&pn=ROYAL%20BROILER';
BEGIN
  IF auth.uid() IS NOT NULL AND NOT private.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can generate daily reminders';
  END IF;

  SELECT message_template INTO v_tpl FROM public.reminder_settings WHERE id = true;
  IF v_tpl IS NULL THEN
    RETURN 0;
  END IF;

  FOR r IN
    SELECT c.id, c.name, c.whatsapp_number, c.phone, c.current_balance
    FROM public.customers c
    WHERE c.status = 'active'
      AND c.reminder_enabled = true
      AND c.current_balance > 0
      AND COALESCE(NULLIF(c.whatsapp_number,''), NULLIF(c.phone,'')) IS NOT NULL
  LOOP
    v_phone := regexp_replace(COALESCE(NULLIF(r.whatsapp_number,''), r.phone), '[^0-9]', '', 'g');
    IF length(v_phone) < 10 THEN CONTINUE; END IF;
    IF length(v_phone) = 10 THEN v_phone := '91' || v_phone; END IF;

    v_msg := replace(v_tpl, '{name}', r.name);
    v_msg := replace(v_msg, '{balance}', to_char(r.current_balance, 'FM999999990.00'));
    v_msg := replace(v_msg, '{pay_link}', v_pay_link);

    v_url := 'https://wa.me/' || v_phone || '?text=' || replace(replace(replace(replace(v_msg,
      '%','%25'), ' ','%20'), E'\n','%0A'), '&','%26');

    INSERT INTO public.reminder_logs (customer_id, reminder_date, balance, whatsapp_number, message, whatsapp_url)
    VALUES (r.id, CURRENT_DATE, r.current_balance, v_phone, v_msg, v_url)
    ON CONFLICT (customer_id, reminder_date) DO NOTHING;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;

-- Recreate policies to reference private.has_role
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT
  USING ((id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE
  USING ((id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
CREATE POLICY user_roles_select_own ON public.user_roles FOR SELECT
  USING ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS customers_admin_all ON public.customers;
CREATE POLICY customers_admin_all ON public.customers FOR ALL
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS sales_admin_all ON public.sales;
CREATE POLICY sales_admin_all ON public.sales FOR ALL
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS payments_admin_all ON public.payments;
CREATE POLICY payments_admin_all ON public.payments FOR ALL
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS reminder_settings_admin_all ON public.reminder_settings;
CREATE POLICY reminder_settings_admin_all ON public.reminder_settings FOR ALL
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS reminder_logs_admin_all ON public.reminder_logs;
CREATE POLICY reminder_logs_admin_all ON public.reminder_logs FOR ALL
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- Drop the public-schema has_role now that nothing references it
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
