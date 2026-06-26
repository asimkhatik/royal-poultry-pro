
REVOKE EXECUTE ON FUNCTION public.generate_daily_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_daily_reminders() TO service_role;
