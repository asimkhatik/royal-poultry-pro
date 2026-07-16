
-- Approval status column
DO $$ BEGIN
  CREATE TYPE public.customer_approval AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS approval_status public.customer_approval NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Update handle_new_user to mark self-signups pending and capture address
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.app_role;
  v_customer_id UUID;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, '')
  )
  ON CONFLICT (id) DO NOTHING;

  IF LOWER(NEW.email) = 'asimkhatik1116@gmail.com' THEN
    v_role := 'admin';
  ELSE
    v_role := 'customer';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT DO NOTHING;

  IF v_role = 'customer' THEN
    INSERT INTO public.customers (name, phone, address, user_id, status, approval_status)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, ''),
      NULLIF(NEW.raw_user_meta_data->>'address', ''),
      NEW.id,
      'inactive',
      'pending'
    )
    RETURNING id INTO v_customer_id;

    UPDATE public.profiles SET customer_id = v_customer_id WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END; $function$;
