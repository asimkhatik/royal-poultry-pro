
-- Settings (singleton)
CREATE TABLE public.reminder_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  enabled boolean NOT NULL DEFAULT true,
  send_hour integer NOT NULL DEFAULT 9 CHECK (send_hour BETWEEN 0 AND 23),
  message_template text NOT NULL DEFAULT 'Namaste {name}, this is a friendly reminder from ROYAL BROILER. Your outstanding balance is ₹{balance}. Please clear it at your earliest convenience. Pay online: {pay_link}. Thank you!',
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.reminder_settings TO authenticated;
GRANT ALL ON public.reminder_settings TO service_role;

ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY reminder_settings_admin_all ON public.reminder_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed singleton
INSERT INTO public.reminder_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

-- Reminder logs
CREATE TABLE public.reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  reminder_date date NOT NULL DEFAULT CURRENT_DATE,
  balance numeric NOT NULL,
  whatsapp_number text,
  message text NOT NULL,
  whatsapp_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, reminder_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminder_logs TO authenticated;
GRANT ALL ON public.reminder_logs TO service_role;

ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY reminder_logs_admin_all ON public.reminder_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_reminder_logs_date ON public.reminder_logs(reminder_date DESC);

-- Generator function
CREATE OR REPLACE FUNCTION public.generate_daily_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tpl text;
  v_count integer := 0;
  r record;
  v_msg text;
  v_phone text;
  v_url text;
  v_pay_link text := 'upi://pay?pa=asimkhatik1116-1@okicici&pn=ROYAL%20BROILER';
BEGIN
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
    -- Default to India country code if 10-digit
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
$$;

-- Hourly cron that fires when the current hour matches the admin's chosen hour
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'royal-broiler-daily-reminders',
  '5 * * * *',
  $$
  DO $do$
  DECLARE
    v_enabled boolean;
    v_hour integer;
  BEGIN
    SELECT enabled, send_hour INTO v_enabled, v_hour FROM public.reminder_settings WHERE id = true;
    IF v_enabled AND v_hour = EXTRACT(HOUR FROM (now() AT TIME ZONE 'Asia/Kolkata'))::int THEN
      PERFORM public.generate_daily_reminders();
    END IF;
  END $do$;
  $$
);
