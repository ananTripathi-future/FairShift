ALTER TABLE public.profiles ADD COLUMN skills text[] NOT NULL DEFAULT '{}';
CREATE FUNCTION public.fs_skill_input(v text[]) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT cardinality(v)<=20 AND NOT EXISTS(SELECT 1 FROM unnest(v) x WHERE length(trim(x)) NOT BETWEEN 1 AND 100) $$;
ALTER TABLE public.profiles ADD CONSTRAINT fs_skills_valid CHECK(public.fs_skill_input(skills));
REVOKE ALL ON FUNCTION public.fs_skill_input(text[]) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.fs_skill_input(text[]) TO authenticated,service_role;
DO $$ DECLARE definition text; BEGIN
 SELECT pg_get_functiondef('public.fs_command(text,jsonb)'::regprocedure) INTO definition;
 definition:=replace(definition,'period text:=','v_period text:=');
 definition:=replace(definition,'VALUES(st.id,u,period,','VALUES(st.id,u,v_period,');
 definition:=replace(definition,'''period'',period)','''period'',v_period)');
 definition:=replace(definition,'=period AND','=v_period AND');
 definition:=replace(definition,'period=fs_command.period','period=v_period');
 definition:=replace(definition,'approved_month=period,','approved_month=v_period,');
 definition:=replace(definition,'ELSIF p_action=''profile'' THEN','ELSIF p_action=''skills'' THEN UPDATE profiles SET skills=ARRAY(SELECT trim(x) FROM jsonb_array_elements_text(p_data->''skills'') x) WHERE id=u; RETURN ''{}''; ELSIF p_action=''profile'' THEN');
 EXECUTE definition;
END $$;
GRANT SELECT ON public.profiles, public.user_roles, public.fs_sites, public.fs_payroll, public.fs_shifts, public.fs_corrections, public.fs_disputes, public.fs_reports, public.fs_report_owners, public.fs_events, public.fs_notifications TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.profiles, public.user_roles, public.fs_sites, public.fs_payroll, public.fs_shifts, public.fs_corrections, public.fs_disputes, public.fs_reports, public.fs_report_owners, public.fs_events, public.fs_notifications FROM authenticated,anon;
GRANT ALL ON public.profiles, public.user_roles, public.fs_sites, public.fs_payroll, public.fs_shifts, public.fs_qr, public.fs_corrections, public.fs_disputes, public.fs_reports, public.fs_report_owners, public.fs_events, public.fs_notifications TO service_role;