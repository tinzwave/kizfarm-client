-- PostgREST caches role grants; force it to pick up the 0012 revoke.
notify pgrst, 'reload schema';
