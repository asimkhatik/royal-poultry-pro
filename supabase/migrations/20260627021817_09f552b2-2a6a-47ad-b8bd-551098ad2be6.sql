
-- Trigger-only functions: revoke EXECUTE from clients entirely
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_sale_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_sale_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_payment_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_payment_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- has_role: used inside RLS USING() so authenticated needs EXECUTE; anon/public revoked
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

-- Reminder generator: only admins may invoke; lock down + enforce role inside
REVOKE EXECUTE ON FUNCTION public.generate_daily_reminders() FROM PUBLIC, anon;
-- authenticated keeps EXECUTE but function now self-checks admin role
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
  -- Allow only admins or the postgres/cron role
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
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
