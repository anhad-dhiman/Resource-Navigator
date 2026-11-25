-- Supabase publishes every table and view in the public schema through its REST API
-- (to anyone with the project's public "anon" key). This backend never uses that
-- API: it connects as the table owner, which row-level security does not restrict.
-- Turning RLS on with no policies closes the REST API to everyone else, including
-- admin_users and its password hashes. On plain PostgreSQL (local) this changes nothing.

ALTER TABLE verified_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;

-- A view normally runs with its owner's rights, which would bypass the RLS above.
-- security_invoker makes it use the caller's rights instead (PostgreSQL 15+).
ALTER VIEW public_resources SET (security_invoker = true);

-- Supabase's API roles get no direct access at all. These roles only exist on Supabase.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON verified_resources, resource_reviews, admin_users, schema_migrations, public_resources
      FROM anon, authenticated;
  END IF;
END
$$;
