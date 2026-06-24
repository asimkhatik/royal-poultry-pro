ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS quantity_of_broilers integer;

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS whatsapp_number text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_gateway text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS transaction_id text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'completed';