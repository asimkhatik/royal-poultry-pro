
-- =========================================
-- ROYAL BROILER — initial schema
-- =========================================

-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'customer');

-- Payment mode enum
CREATE TYPE public.payment_mode AS ENUM ('cash', 'upi', 'bank_transfer');

-- =========================================
-- profiles
-- =========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  customer_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================================
-- user_roles
-- =========================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =========================================
-- has_role security definer
-- =========================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =========================================
-- customers
-- =========================================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  current_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Now FK for profiles.customer_id
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_customer_fk
  FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;

-- =========================================
-- sales
-- =========================================
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC(10,2) NOT NULL CHECK (weight_kg > 0),
  rate_per_kg NUMERIC(10,2) NOT NULL CHECK (rate_per_kg >= 0),
  total_amount NUMERIC(12,2) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- =========================================
-- payments
-- =========================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_mode public.payment_mode NOT NULL DEFAULT 'cash',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- =========================================
-- POLICIES
-- =========================================
-- profiles: user reads own; admins read all; user updates own
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- user_roles: read own; admins read all
CREATE POLICY "user_roles_select_own" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- customers: admin full; customer reads own linked record
CREATE POLICY "customers_admin_all" ON public.customers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "customers_select_own" ON public.customers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- sales: admin full; customer reads own
CREATE POLICY "sales_admin_all" ON public.sales
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sales_select_own" ON public.sales
  FOR SELECT TO authenticated
  USING (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

-- payments: admin full; customer reads own
CREATE POLICY "payments_admin_all" ON public.payments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "payments_select_own" ON public.payments
  FOR SELECT TO authenticated
  USING (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

-- =========================================
-- TRIGGERS
-- =========================================
-- updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-calc total_amount and balance update on sales
CREATE OR REPLACE FUNCTION public.handle_sale_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.total_amount := ROUND(NEW.weight_kg * NEW.rate_per_kg, 2);
  UPDATE public.customers
    SET current_balance = current_balance + NEW.total_amount
    WHERE id = NEW.customer_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_sale_insert BEFORE INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.handle_sale_insert();

CREATE OR REPLACE FUNCTION public.handle_sale_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.customers
    SET current_balance = current_balance - OLD.total_amount
    WHERE id = OLD.customer_id;
  RETURN OLD;
END; $$;
CREATE TRIGGER trg_sale_delete AFTER DELETE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.handle_sale_delete();

-- Balance update on payments
CREATE OR REPLACE FUNCTION public.handle_payment_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.customers
    SET current_balance = current_balance - NEW.amount
    WHERE id = NEW.customer_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_payment_insert AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_payment_insert();

CREATE OR REPLACE FUNCTION public.handle_payment_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.customers
    SET current_balance = current_balance + OLD.amount
    WHERE id = OLD.customer_id;
  RETURN OLD;
END; $$;
CREATE TRIGGER trg_payment_delete AFTER DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_payment_delete();

-- =========================================
-- New user trigger — auto profile + role
-- Admin email asimkhatik1116@gmail.com → admin
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  -- Auto-create a customer record for non-admin users and link it
  IF v_role = 'customer' THEN
    INSERT INTO public.customers (name, phone, user_id)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, ''),
      NEW.id
    )
    RETURNING id INTO v_customer_id;

    UPDATE public.profiles SET customer_id = v_customer_id WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helpful indexes
CREATE INDEX idx_sales_customer_date ON public.sales(customer_id, sale_date DESC);
CREATE INDEX idx_payments_customer_date ON public.payments(customer_id, payment_date DESC);
CREATE INDEX idx_customers_user ON public.customers(user_id);
