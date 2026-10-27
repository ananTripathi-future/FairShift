REVOKE ALL ON FUNCTION public.fs_signup() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.fs_staff(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.fs_staff(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.fs_member(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.fs_member(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.fs_owns_report(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.fs_owns_report(uuid) TO authenticated;
DO $$ DECLARE definition text; BEGIN SELECT pg_get_functiondef('public.fs_dashboard()'::regprocedure) INTO definition; definition:=replace(definition,'IF m.user_id IS NULL THEN RETURN result; END IF;','IF m.user_id IS NULL THEN RETURN result || jsonb_build_object(''membership'',NULL); END IF;'); EXECUTE definition; END $$;