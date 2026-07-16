
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS opening_balance NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opening_balance_date DATE,
  ADD COLUMN IF NOT EXISTS opening_balance_notes TEXT;

CREATE OR REPLACE FUNCTION public.handle_customer_opening_balance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.opening_balance, 0) <> 0 THEN
      NEW.current_balance := COALESCE(NEW.current_balance, 0) + NEW.opening_balance;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.opening_balance,0) <> COALESCE(OLD.opening_balance,0) THEN
      NEW.current_balance := COALESCE(OLD.current_balance,0) + (COALESCE(NEW.opening_balance,0) - COALESCE(OLD.opening_balance,0));
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_customer_opening_balance ON public.customers;
CREATE TRIGGER trg_customer_opening_balance
  BEFORE INSERT OR UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.handle_customer_opening_balance();
