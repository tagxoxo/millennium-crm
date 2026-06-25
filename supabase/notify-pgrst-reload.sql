-- Refresh PostgREST schema cache after new tables
NOTIFY pgrst, 'reload schema';
