ALTER TABLE public.fs_sites ADD COLUMN manager_id uuid;
ALTER TABLE public.fs_sites ADD COLUMN daily_regular_minutes integer NOT NULL DEFAULT 480 CHECK (daily_regular_minutes BETWEEN 60 AND 1440);
ALTER TABLE public.fs_sites ADD COLUMN overtime_multiplier_pct integer NOT NULL DEFAULT 150 CHECK (overtime_multiplier_pct BETWEEN 100 AND 300);
UPDATE public.fs_sites s SET manager_id=coalesce((SELECT user_id FROM public.user_roles r WHERE r.site_id=s.id AND r.role='manager' ORDER BY user_id LIMIT 1),s.supervisor_id);
UPDATE public.user_roles r SET role='manager' FROM public.fs_sites s WHERE r.site_id=s.id AND r.user_id=s.manager_id AND NOT EXISTS (SELECT 1 FROM public.user_roles x WHERE x.site_id=s.id AND x.role='manager');
COMMENT ON COLUMN public.fs_sites.supervisor_id IS 'DEPRECATED: legacy site creator; manager_id is the escalation authority.';
CREATE OR REPLACE FUNCTION public.fs_manager(s uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND site_id=s AND role='manager') $$;
REVOKE ALL ON FUNCTION public.fs_manager(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.fs_manager(uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.fs_event_visible(s uuid,e uuid,a text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.fs_manager(s) OR (public.fs_staff(s) AND (EXISTS(SELECT 1 FROM public.fs_shifts WHERE id=e AND site_id=s) OR EXISTS(SELECT 1 FROM public.fs_reports WHERE id=e AND site_id=s) OR (e=s AND a IN ('Site observation','Severity deadlines updated','Location verification settings updated')))) OR public.fs_owns_report(e) OR EXISTS(SELECT 1 FROM public.fs_shifts WHERE id=e AND worker_id=auth.uid()) OR EXISTS(SELECT 1 FROM public.fs_disputes WHERE id=e AND worker_id=auth.uid()) OR e=auth.uid() $$;
REVOKE ALL ON FUNCTION public.fs_event_visible(uuid,uuid,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.fs_event_visible(uuid,uuid,text) TO authenticated,service_role;
ALTER POLICY payroll_read ON public.fs_payroll USING (worker_id=auth.uid() OR public.fs_manager(site_id));
ALTER POLICY dispute_read ON public.fs_disputes USING (worker_id=auth.uid() OR public.fs_manager(site_id));
ALTER POLICY events_read ON public.fs_events USING (public.fs_event_visible(site_id,entity_id,action));
DO $migration$
DECLARE body text;
BEGIN
 SELECT pg_get_functiondef('public.fs_command(text,jsonb)'::regprocedure) INTO body;
 body:=replace(body,'INSERT INTO fs_sites(name,supervisor_id) VALUES(trim(p_data->>''name''),u)','INSERT INTO fs_sites(name,supervisor_id,manager_id) VALUES(trim(p_data->>''name''),u,u)');
 body:=replace(body,'INSERT INTO user_roles VALUES(u,st.id,''supervisor'')','INSERT INTO user_roles VALUES(u,st.id,''manager'')');
 body:=replace(body,'IF m.role<>''supervisor''','IF m.role<>''manager''');
 body:=replace(body,'Supervisor permission required','Manager permission required');
 body:=replace(body,'st.supervisor_id','st.manager_id');
 body:=replace(body,'p_data->>''role'' NOT IN (''worker'',''manager'')','p_data->>''role'' NOT IN (''worker'',''supervisor'',''manager'')');
 body:=replace(body,'Only site supervisor can assign manager roles','Only a manager can assign site roles');
 body:=replace(body,'Escalated to supervisor','Escalated to manager');
 body:=replace(body,'SELECT * INTO st FROM fs_sites WHERE id=m.site_id;', $inject$
 SELECT * INTO st FROM fs_sites WHERE id=m.site_id;
 IF p_action IN ('pay_terms','approve_pay','role','dispute_decision','correction_decision','deadlines','location_settings','pay_rules') AND m.role<>'manager' THEN RAISE EXCEPTION 'Manager permission required'; END IF;
 IF p_action IN ('pay_terms','approve_pay','role') AND (p_data->>'worker_id')::uuid=u THEN RAISE EXCEPTION 'Cannot change your own role or pay, or approve your own payroll'; END IF;
 IF p_action='dispute_decision' AND EXISTS(SELECT 1 FROM fs_disputes WHERE id=(p_data->>'id')::uuid AND worker_id=u) THEN RAISE EXCEPTION 'Cannot decide your own pay dispute'; END IF;
 IF p_action='correction_decision' AND EXISTS(SELECT 1 FROM fs_corrections WHERE id=(p_data->>'id')::uuid AND worker_id=u) THEN RAISE EXCEPTION 'Cannot decide your own attendance correction'; END IF;
 IF p_action='verify' AND EXISTS(SELECT 1 FROM fs_shifts WHERE id=(p_data->>'id')::uuid AND worker_id=u) THEN RAISE EXCEPTION 'Cannot verify your own attendance'; END IF;
 IF p_action='feedback' THEN
  txt:=trim(p_data->>'text'); IF txt IS NULL OR length(txt) NOT BETWEEN 10 AND 500 THEN RAISE EXCEPTION 'Feedback must be 10 to 500 characters'; END IF;
  PERFORM fs_event(st.id,u,'Worker feedback',jsonb_build_object('text',txt)); RETURN '{}';
 ELSIF p_action='observation' THEN
  IF NOT fs_staff(st.id) THEN RAISE EXCEPTION 'Site staff permission required'; END IF;
  txt:=trim(p_data->>'text'); IF txt IS NULL OR length(txt) NOT BETWEEN 10 AND 500 THEN RAISE EXCEPTION 'Observation must be 10 to 500 characters'; END IF;
  PERFORM fs_event(st.id,st.id,'Site observation',jsonb_build_object('text',txt)); RETURN '{}';
 ELSIF p_action='flag_attendance' THEN
  IF NOT fs_staff(st.id) THEN RAISE EXCEPTION 'Site staff permission required'; END IF;
  SELECT * INTO sh FROM fs_shifts WHERE id=(p_data->>'id')::uuid AND site_id=st.id;
  txt:=trim(p_data->>'reason'); IF sh.id IS NULL OR sh.scheduled_start>now() OR txt IS NULL OR length(txt) NOT BETWEEN 10 AND 500 THEN RAISE EXCEPTION 'Past shift and explanation required'; END IF;
  PERFORM fs_event(st.id,sh.id,'Missing attendance flagged',jsonb_build_object('reason',txt));
  INSERT INTO fs_notifications(user_id,entity_id,kind,message) VALUES(sh.worker_id,sh.id,'attendance-flag','Please review your attendance: '||txt) ON CONFLICT DO NOTHING; RETURN '{}';
 ELSIF p_action='update_shift' THEN
  IF NOT fs_staff(st.id) THEN RAISE EXCEPTION 'Site staff permission required'; END IF;
  SELECT * INTO sh FROM fs_shifts WHERE id=(p_data->>'id')::uuid AND site_id=st.id FOR UPDATE;
  IF sh.id IS NULL OR sh.check_in IS NOT NULL OR sh.scheduled_start<=now() OR (p_data->>'start')::timestamptz<=now() THEN RAISE EXCEPTION 'Only future unstarted shifts can be rescheduled'; END IF;
  IF EXISTS(SELECT 1 FROM fs_shifts WHERE worker_id=sh.worker_id AND id<>sh.id AND scheduled_start<(p_data->>'end')::timestamptz AND scheduled_end>(p_data->>'start')::timestamptz) THEN RAISE EXCEPTION 'Shift overlaps another scheduled shift'; END IF;
  UPDATE fs_shifts SET scheduled_start=(p_data->>'start')::timestamptz,scheduled_end=(p_data->>'end')::timestamptz WHERE id=sh.id;
  PERFORM fs_event(st.id,sh.id,'Shift rescheduled',jsonb_build_object('before_start',sh.scheduled_start,'before_end',sh.scheduled_end,'after_start',p_data->>'start','after_end',p_data->>'end')); RETURN '{}';
 ELSIF p_action='pay_rules' THEN
  IF (p_data->>'minutes')::integer NOT BETWEEN 60 AND 1440 OR (p_data->>'multiplier')::integer NOT BETWEEN 100 AND 300 THEN RAISE EXCEPTION 'Invalid overtime rules'; END IF;
  UPDATE fs_sites SET daily_regular_minutes=(p_data->>'minutes')::integer,overtime_multiplier_pct=(p_data->>'multiplier')::integer WHERE id=st.id;
  UPDATE fs_payroll SET approved_month=NULL,approved_at=NULL,approved_by=NULL WHERE site_id=st.id;
  PERFORM fs_event(st.id,st.id,'Overtime rules updated',p_data); RETURN '{}';
 END IF;
 $inject$);
 EXECUTE body;
 SELECT pg_get_functiondef('public.fs_dashboard()'::regprocedure) INTO body;
 body:=replace(body,'FROM fs_payroll p WHERE site_id=m.site_id AND (m.role<>''worker'' OR worker_id=u)','FROM fs_payroll p WHERE site_id=m.site_id AND (m.role=''manager'' OR worker_id=u)');
 body:=replace(body,'FROM fs_disputes WHERE site_id=m.site_id AND (m.role<>''worker'' OR worker_id=u)','FROM fs_disputes WHERE site_id=m.site_id AND (m.role=''manager'' OR worker_id=u)');
 body:=replace(body,'FROM fs_events WHERE site_id=m.site_id AND (m.role<>''worker'' OR fs_owns_report(entity_id) OR EXISTS(SELECT 1 FROM fs_shifts WHERE id=entity_id AND worker_id=u) OR EXISTS(SELECT 1 FROM fs_disputes WHERE id=entity_id AND worker_id=u) OR entity_id=u)','FROM fs_events WHERE site_id=m.site_id AND fs_event_visible(site_id,entity_id,action)');
 EXECUTE body;
 SELECT pg_get_functiondef('public.fs_time_actions()'::regprocedure) INTO body;
 body:=replace(body,'s.supervisor_id','s.manager_id');
 body:=replace(body,'Automatically escalated to supervisor','Automatically escalated to manager');
 EXECUTE body;
END $migration$;