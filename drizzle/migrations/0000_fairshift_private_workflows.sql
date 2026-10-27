CREATE TYPE public.fs_role AS ENUM ('worker','manager','supervisor');
CREATE TABLE public.profiles (id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, name text NOT NULL DEFAULT 'Worker' CHECK(length(name) BETWEEN 1 AND 100), language text NOT NULL DEFAULT 'en' CHECK(language IN ('en','ta')));
GRANT SELECT ON public.profiles TO authenticated; GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.fs_sites (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL CHECK(length(name) BETWEEN 2 AND 100), join_code uuid NOT NULL DEFAULT gen_random_uuid(), supervisor_id uuid NOT NULL, low_hours integer NOT NULL DEFAULT 72 CHECK(low_hours BETWEEN 1 AND 720), medium_hours integer NOT NULL DEFAULT 24 CHECK(medium_hours BETWEEN 1 AND 720), high_hours integer NOT NULL DEFAULT 4 CHECK(high_hours BETWEEN 1 AND 720));
GRANT SELECT ON public.fs_sites TO authenticated; GRANT ALL ON public.fs_sites TO service_role;
ALTER TABLE public.fs_sites ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.user_roles (user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, site_id uuid NOT NULL REFERENCES public.fs_sites(id), role public.fs_role NOT NULL DEFAULT 'worker');
GRANT SELECT ON public.user_roles TO authenticated; GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.fs_staff(s uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id=auth.uid() AND site_id=s AND role IN ('manager','supervisor')) $$;
CREATE FUNCTION public.fs_member(s uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id=auth.uid() AND site_id=s) $$;
CREATE POLICY own_role ON public.user_roles FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY own_profile ON public.profiles FOR SELECT TO authenticated USING(id=auth.uid());
CREATE POLICY site_read ON public.fs_sites FOR SELECT TO authenticated USING(public.fs_staff(id));
CREATE FUNCTION public.fs_signup() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN INSERT INTO profiles(id,name) VALUES(NEW.id, left(coalesce(nullif(NEW.raw_user_meta_data->>'name',''),nullif(NEW.raw_user_meta_data->>'full_name',''),'Worker'),100)); RETURN NEW; END $$;
CREATE TRIGGER fs_profile_on_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.fs_signup();
CREATE TABLE public.fs_payroll (worker_id uuid PRIMARY KEY, site_id uuid NOT NULL REFERENCES public.fs_sites(id), rate_paise integer NOT NULL DEFAULT 0 CHECK(rate_paise BETWEEN 0 AND 10000000), allowance_paise integer NOT NULL DEFAULT 0 CHECK(allowance_paise BETWEEN 0 AND 100000000), deduction_paise integer NOT NULL DEFAULT 0 CHECK(deduction_paise BETWEEN 0 AND 100000000), approved_month text, approved_at timestamptz, approved_by uuid);
GRANT SELECT ON public.fs_payroll TO authenticated; GRANT ALL ON public.fs_payroll TO service_role;
ALTER TABLE public.fs_payroll ENABLE ROW LEVEL SECURITY;
CREATE POLICY payroll_read ON public.fs_payroll FOR SELECT TO authenticated USING(worker_id=auth.uid() OR public.fs_staff(site_id));
CREATE TABLE public.fs_shifts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), site_id uuid NOT NULL REFERENCES public.fs_sites(id), worker_id uuid NOT NULL, scheduled_start timestamptz NOT NULL, scheduled_end timestamptz NOT NULL, check_in timestamptz, check_out timestamptz, verified_at timestamptz, verified_by uuid, CHECK(scheduled_end>scheduled_start AND scheduled_end<=scheduled_start+interval '24 hours'), CHECK(check_out IS NULL OR (check_in IS NOT NULL AND check_out>check_in AND check_out<=check_in+interval '24 hours')));
GRANT SELECT ON public.fs_shifts TO authenticated; GRANT ALL ON public.fs_shifts TO service_role;
ALTER TABLE public.fs_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY shift_read ON public.fs_shifts FOR SELECT TO authenticated USING(worker_id=auth.uid() OR public.fs_staff(site_id));
CREATE UNIQUE INDEX fs_one_open_shift ON public.fs_shifts(worker_id) WHERE check_in IS NOT NULL AND check_out IS NULL;
CREATE INDEX fs_shifts_site_date ON public.fs_shifts(site_id,scheduled_start);
CREATE TABLE public.fs_qr (token uuid PRIMARY KEY DEFAULT gen_random_uuid(), site_id uuid NOT NULL REFERENCES public.fs_sites(id), expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes');
GRANT ALL ON public.fs_qr TO service_role;
ALTER TABLE public.fs_qr ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.fs_corrections (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), shift_id uuid NOT NULL REFERENCES public.fs_shifts(id), site_id uuid NOT NULL, worker_id uuid NOT NULL, proposed_in timestamptz NOT NULL, proposed_out timestamptz NOT NULL, reason text NOT NULL CHECK(length(reason) BETWEEN 10 AND 500), status text NOT NULL DEFAULT 'Open' CHECK(status IN ('Open','Approved','Rejected')), reply text, created_at timestamptz NOT NULL DEFAULT now(), CHECK(proposed_out>proposed_in AND proposed_out<=proposed_in+interval '24 hours'));
GRANT SELECT ON public.fs_corrections TO authenticated; GRANT ALL ON public.fs_corrections TO service_role;
ALTER TABLE public.fs_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY correction_read ON public.fs_corrections FOR SELECT TO authenticated USING(worker_id=auth.uid() OR public.fs_staff(site_id));
CREATE UNIQUE INDEX fs_one_pending_correction ON public.fs_corrections(shift_id) WHERE status='Open';
CREATE TABLE public.fs_disputes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), site_id uuid NOT NULL, worker_id uuid NOT NULL, period text NOT NULL, line text NOT NULL CHECK(line IN ('Base pay','Overtime','Allowances','Deductions','Net payable')), text text NOT NULL CHECK(length(text) BETWEEN 10 AND 500), status text NOT NULL DEFAULT 'Open' CHECK(status IN ('Open','Resolved','Rejected')), reply text, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.fs_disputes TO authenticated; GRANT ALL ON public.fs_disputes TO service_role;
ALTER TABLE public.fs_disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY dispute_read ON public.fs_disputes FOR SELECT TO authenticated USING(worker_id=auth.uid() OR public.fs_staff(site_id));
CREATE TABLE public.fs_reports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reference text NOT NULL UNIQUE DEFAULT 'SV-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)), site_id uuid NOT NULL, reporter_name text, language text NOT NULL CHECK(language IN ('en','ta')), category text NOT NULL CHECK(length(category) BETWEEN 1 AND 60), severity text NOT NULL CHECK(severity IN ('Low','Medium','High')), location text NOT NULL CHECK(length(location) BETWEEN 2 AND 120), text text NOT NULL DEFAULT '' CHECK(length(text)<=1000), status text NOT NULL DEFAULT 'Reported' CHECK(status IN ('Reported','Under Review','Action Taken','Resolved')), manager_id uuid NOT NULL, due_at timestamptz NOT NULL, escalated_at timestamptz, note text, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.fs_reports TO authenticated; GRANT ALL ON public.fs_reports TO service_role;
ALTER TABLE public.fs_reports ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.fs_report_owners (report_id uuid PRIMARY KEY REFERENCES public.fs_reports(id), user_id uuid NOT NULL);
GRANT SELECT ON public.fs_report_owners TO authenticated; GRANT ALL ON public.fs_report_owners TO service_role;
ALTER TABLE public.fs_report_owners ENABLE ROW LEVEL SECURITY;
CREATE POLICY report_owner ON public.fs_report_owners FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE FUNCTION public.fs_owns_report(r uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM fs_report_owners WHERE report_id=r AND user_id=auth.uid()) $$;
CREATE POLICY reports_read ON public.fs_reports FOR SELECT TO authenticated USING(public.fs_owns_report(id) OR public.fs_staff(site_id));
CREATE INDEX fs_reports_site_date ON public.fs_reports(site_id,created_at);
CREATE TABLE public.fs_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), site_id uuid NOT NULL, entity_id uuid NOT NULL, actor text NOT NULL, action text NOT NULL, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.fs_events TO authenticated; GRANT ALL ON public.fs_events TO service_role;
ALTER TABLE public.fs_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY events_read ON public.fs_events FOR SELECT TO authenticated USING(public.fs_staff(site_id) OR public.fs_owns_report(entity_id) OR EXISTS(SELECT 1 FROM fs_shifts WHERE id=entity_id AND worker_id=auth.uid()) OR EXISTS(SELECT 1 FROM fs_disputes WHERE id=entity_id AND worker_id=auth.uid()));
CREATE INDEX fs_events_entity_date ON public.fs_events(entity_id,created_at);
CREATE TABLE public.fs_notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, entity_id uuid NOT NULL, kind text NOT NULL, message text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,entity_id,kind));
GRANT SELECT ON public.fs_notifications TO authenticated; GRANT ALL ON public.fs_notifications TO service_role;
ALTER TABLE public.fs_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_read ON public.fs_notifications FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY evidence_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='safety-evidence' AND public.fs_owns_report((storage.foldername(name))[1]::uuid) AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp','webm','ogg','mp4','m4a','wav'));
CREATE POLICY evidence_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='safety-evidence' AND EXISTS(SELECT 1 FROM public.fs_reports r WHERE r.id=(storage.foldername(name))[1]::uuid AND (public.fs_owns_report(r.id) OR public.fs_staff(r.site_id))));
CREATE FUNCTION public.fs_event(s uuid,e uuid,a text,d jsonb DEFAULT '{}',who text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN INSERT INTO fs_events(site_id,entity_id,actor,action,details) VALUES(s,e,coalesce(who,(SELECT name FROM profiles WHERE id=auth.uid()),'System'),a,d); END $$;
REVOKE ALL ON FUNCTION public.fs_event(uuid,uuid,text,jsonb,text) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.fs_command(p_action text,p_data jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); m user_roles%ROWTYPE; st fs_sites%ROWTYPE; sh fs_shifts%ROWTYPE; cr fs_corrections%ROWTYPE; rp fs_reports%ROWTYPE; di fs_disputes%ROWTYPE; eid uuid; target uuid; token uuid; txt text; newstatus text; period text:=to_char(now() AT TIME ZONE 'Asia/Kolkata','YYYY-MM');
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO m FROM user_roles WHERE user_id=u;
 IF p_action='create_site' THEN
  IF m.user_id IS NOT NULL THEN RAISE EXCEPTION 'Already joined a site'; END IF;
  INSERT INTO fs_sites(name,supervisor_id) VALUES(trim(p_data->>'name'),u) RETURNING * INTO st;
  INSERT INTO user_roles VALUES(u,st.id,'supervisor'); INSERT INTO fs_payroll(worker_id,site_id) VALUES(u,st.id);
  PERFORM fs_event(st.id,st.id,'Site created'); RETURN jsonb_build_object('id',st.id);
 ELSIF p_action='join_site' THEN
  IF m.user_id IS NOT NULL THEN RAISE EXCEPTION 'Already joined a site'; END IF;
  SELECT * INTO st FROM fs_sites WHERE join_code=(p_data->>'code')::uuid;
  IF st.id IS NULL THEN RAISE EXCEPTION 'Invalid site invitation'; END IF;
  INSERT INTO user_roles VALUES(u,st.id,'worker'); INSERT INTO fs_payroll(worker_id,site_id) VALUES(u,st.id);
  PERFORM fs_event(st.id,u,'Worker joined'); RETURN '{}';
 ELSIF p_action='profile' THEN
  UPDATE profiles SET name=trim(p_data->>'name'),language=p_data->>'language' WHERE id=u; RETURN '{}';
 END IF;
 IF m.user_id IS NULL THEN RAISE EXCEPTION 'Join or create a site first'; END IF;
 SELECT * INTO st FROM fs_sites WHERE id=m.site_id;
 IF p_action='qr' THEN
  IF NOT fs_staff(st.id) THEN RAISE EXCEPTION 'Manager permission required'; END IF;
  INSERT INTO fs_qr(site_id) VALUES(st.id) RETURNING fs_qr.token INTO token;
  RETURN jsonb_build_object('token',token,'expires_at',now()+interval '5 minutes');
 ELSIF p_action='schedule' THEN
  IF NOT fs_staff(st.id) THEN RAISE EXCEPTION 'Manager permission required'; END IF;
  target:=(p_data->>'worker_id')::uuid;
  IF NOT EXISTS(SELECT 1 FROM user_roles WHERE user_id=target AND site_id=st.id) THEN RAISE EXCEPTION 'Worker not on this site'; END IF;
  IF EXISTS(SELECT 1 FROM fs_shifts WHERE worker_id=target AND scheduled_start<(p_data->>'end')::timestamptz AND scheduled_end>(p_data->>'start')::timestamptz) THEN RAISE EXCEPTION 'Shift overlaps another scheduled shift'; END IF;
  INSERT INTO fs_shifts(site_id,worker_id,scheduled_start,scheduled_end) VALUES(st.id,target,(p_data->>'start')::timestamptz,(p_data->>'end')::timestamptz) RETURNING id INTO eid;
  PERFORM fs_event(st.id,eid,'Scheduled'); RETURN jsonb_build_object('id',eid);
 ELSIF p_action IN ('check_in','check_out') THEN
  IF NOT EXISTS(SELECT 1 FROM fs_qr WHERE fs_qr.token=(p_data->>'token')::uuid AND site_id=st.id AND expires_at>now()) THEN RAISE EXCEPTION 'QR expired or belongs to another site'; END IF;
  SELECT * INTO sh FROM fs_shifts WHERE id=(p_data->>'id')::uuid AND worker_id=u AND site_id=st.id FOR UPDATE;
  IF sh.id IS NULL THEN RAISE EXCEPTION 'Shift not found'; END IF;
  IF p_action='check_in' THEN
   IF sh.check_in IS NOT NULL OR now()<sh.scheduled_start-interval '1 hour' OR now()>sh.scheduled_end THEN RAISE EXCEPTION 'Check-in unavailable for this shift'; END IF;
   UPDATE fs_shifts SET check_in=now() WHERE id=sh.id;
  ELSE
   IF sh.check_in IS NULL OR sh.check_out IS NOT NULL THEN RAISE EXCEPTION 'No active shift'; END IF;
   UPDATE fs_shifts SET check_out=now() WHERE id=sh.id;
  END IF;
  UPDATE fs_payroll SET approved_month=NULL,approved_at=NULL,approved_by=NULL WHERE worker_id=u;
  PERFORM fs_event(st.id,sh.id,CASE WHEN p_action='check_in' THEN 'Checked in' ELSE 'Checked out' END); RETURN '{}';
 ELSIF p_action='correction' THEN
  SELECT * INTO sh FROM fs_shifts WHERE id=(p_data->>'id')::uuid AND worker_id=u AND site_id=st.id;
  IF sh.id IS NULL OR sh.scheduled_start>now() THEN RAISE EXCEPTION 'Past shift required'; END IF;
  IF (p_data->>'in')::timestamptz<sh.scheduled_start-interval '12 hours' OR (p_data->>'out')::timestamptz>sh.scheduled_end+interval '12 hours' THEN RAISE EXCEPTION 'Correction must match the scheduled date'; END IF;
  INSERT INTO fs_corrections(shift_id,site_id,worker_id,proposed_in,proposed_out,reason) VALUES(sh.id,st.id,u,(p_data->>'in')::timestamptz,(p_data->>'out')::timestamptz,trim(p_data->>'reason'));
  PERFORM fs_event(st.id,sh.id,'Correction requested',jsonb_build_object('reason',p_data->>'reason')); RETURN '{}';
 ELSIF p_action IN ('correction_decision','verify') THEN
  IF NOT fs_staff(st.id) THEN RAISE EXCEPTION 'Manager permission required'; END IF;
  IF p_action='verify' THEN
   SELECT * INTO sh FROM fs_shifts WHERE id=(p_data->>'id')::uuid AND site_id=st.id FOR UPDATE;
   IF sh.id IS NULL OR sh.check_out IS NULL THEN RAISE EXCEPTION 'Completed shift required'; END IF;
   IF EXISTS(SELECT 1 FROM fs_corrections WHERE shift_id=sh.id AND status='Open') THEN RAISE EXCEPTION 'Resolve the pending correction first'; END IF;
   UPDATE fs_shifts SET verified_at=now(),verified_by=u WHERE id=sh.id;
   PERFORM fs_event(st.id,sh.id,'Verified'); RETURN '{}';
  END IF;
  SELECT * INTO cr FROM fs_corrections WHERE id=(p_data->>'id')::uuid AND site_id=st.id FOR UPDATE;
  newstatus:=p_data->>'status'; txt:=trim(p_data->>'reply');
  IF cr.id IS NULL OR cr.status<>'Open' OR newstatus NOT IN ('Approved','Rejected') OR length(txt) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'Open request and explanation required'; END IF;
  SELECT * INTO sh FROM fs_shifts WHERE id=cr.shift_id FOR UPDATE;
  UPDATE fs_corrections SET status=newstatus,reply=txt WHERE id=cr.id;
  IF newstatus='Approved' THEN
   IF EXISTS(SELECT 1 FROM fs_shifts WHERE worker_id=cr.worker_id AND id<>sh.id AND coalesce(check_in,scheduled_start)<cr.proposed_out AND coalesce(check_out,scheduled_end)>cr.proposed_in) THEN RAISE EXCEPTION 'Correction overlaps another shift'; END IF;
   UPDATE fs_shifts SET check_in=cr.proposed_in,check_out=cr.proposed_out,verified_at=NULL,verified_by=NULL WHERE id=sh.id;
   UPDATE fs_payroll SET approved_month=NULL,approved_at=NULL,approved_by=NULL WHERE worker_id=cr.worker_id;
  END IF;
  PERFORM fs_event(st.id,sh.id,'Correction '||newstatus,jsonb_build_object('before_in',sh.check_in,'before_out',sh.check_out,'after_in',cr.proposed_in,'after_out',cr.proposed_out,'reply',txt)); RETURN '{}';
 ELSIF p_action='dispute' THEN
  INSERT INTO fs_disputes(site_id,worker_id,period,line,text) VALUES(st.id,u,period,p_data->>'line',trim(p_data->>'text')) RETURNING id INTO eid;
  PERFORM fs_event(st.id,eid,'Pay dispute opened',jsonb_build_object('line',p_data->>'line','period',period)); RETURN jsonb_build_object('id',eid);
 ELSIF p_action='dispute_decision' THEN
  IF NOT fs_staff(st.id) THEN RAISE EXCEPTION 'Manager permission required'; END IF;
  SELECT * INTO di FROM fs_disputes WHERE id=(p_data->>'id')::uuid AND site_id=st.id FOR UPDATE;
  newstatus:=p_data->>'status'; txt:=trim(p_data->>'reply');
  IF di.id IS NULL OR di.status<>'Open' OR newstatus NOT IN ('Resolved','Rejected') OR length(txt) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'Open dispute and explanation required'; END IF;
  UPDATE fs_disputes SET status=newstatus,reply=txt WHERE id=di.id; PERFORM fs_event(st.id,di.id,'Pay dispute '||newstatus,jsonb_build_object('reply',txt)); RETURN '{}';
 ELSIF p_action IN ('pay_terms','approve_pay','role') THEN
  IF NOT fs_staff(st.id) THEN RAISE EXCEPTION 'Manager permission required'; END IF;
  target:=(p_data->>'worker_id')::uuid;
  IF NOT EXISTS(SELECT 1 FROM user_roles WHERE user_id=target AND site_id=st.id) THEN RAISE EXCEPTION 'Worker not found'; END IF;
  IF p_action='role' THEN
   IF m.role<>'supervisor' OR target=st.supervisor_id OR p_data->>'role' NOT IN ('worker','manager') THEN RAISE EXCEPTION 'Only site supervisor can assign manager roles'; END IF;
   UPDATE user_roles SET role=(p_data->>'role')::fs_role WHERE user_id=target; PERFORM fs_event(st.id,target,'Role changed',jsonb_build_object('role',p_data->>'role')); RETURN '{}';
  ELSIF p_action='pay_terms' THEN
   UPDATE fs_payroll SET rate_paise=(p_data->>'rate')::integer,allowance_paise=(p_data->>'allowance')::integer,deduction_paise=(p_data->>'deduction')::integer,approved_month=NULL,approved_at=NULL,approved_by=NULL WHERE worker_id=target;
   PERFORM fs_event(st.id,target,'Pay terms updated',p_data); RETURN '{}';
  END IF;
  IF EXISTS(SELECT 1 FROM fs_shifts WHERE worker_id=target AND to_char(scheduled_start AT TIME ZONE 'Asia/Kolkata','YYYY-MM')=period AND (verified_at IS NULL OR check_out IS NULL)) OR EXISTS(SELECT 1 FROM fs_disputes WHERE worker_id=target AND period=fs_command.period AND status='Open') THEN RAISE EXCEPTION 'Verify all shifts and resolve pay disputes before approval'; END IF;
  UPDATE fs_payroll SET approved_month=period,approved_at=now(),approved_by=u WHERE worker_id=target; PERFORM fs_event(st.id,target,'Pay approved',jsonb_build_object('period',period)); RETURN '{}';
 ELSIF p_action='report' THEN
  target:=nullif(p_data->>'manager_id','')::uuid;
  IF target IS NULL THEN target:=st.supervisor_id; END IF;
  IF NOT EXISTS(SELECT 1 FROM user_roles WHERE user_id=target AND site_id=st.id AND role IN ('manager','supervisor')) THEN RAISE EXCEPTION 'Responsible manager required'; END IF;
  IF length(trim(coalesce(p_data->>'text','')))<10 AND NOT coalesce((p_data->>'has_media')::boolean,false) THEN RAISE EXCEPTION 'Add a description or attachment'; END IF;
  INSERT INTO fs_reports(site_id,reporter_name,language,category,severity,location,text,manager_id,due_at) VALUES(st.id,CASE WHEN coalesce((p_data->>'anonymous')::boolean,false) THEN NULL ELSE (SELECT name FROM profiles WHERE id=u) END,p_data->>'language',p_data->>'category',p_data->>'severity',trim(p_data->>'location'),trim(coalesce(p_data->>'text','')),target,now()+make_interval(hours=>CASE p_data->>'severity' WHEN 'High' THEN st.high_hours WHEN 'Medium' THEN st.medium_hours ELSE st.low_hours END)) RETURNING * INTO rp;
  INSERT INTO fs_report_owners VALUES(rp.id,u);
  PERFORM fs_event(st.id,rp.id,'Reported','{}',CASE WHEN rp.reporter_name IS NULL THEN 'Confidential worker' ELSE rp.reporter_name END);
  INSERT INTO fs_notifications(user_id,entity_id,kind,message) VALUES(target,rp.id,'report','New safety report '||rp.reference);
  RETURN jsonb_build_object('id',rp.id,'reference',rp.reference);
 ELSIF p_action IN ('report_update','assign','escalate') THEN
  IF NOT fs_staff(st.id) THEN RAISE EXCEPTION 'Manager permission required'; END IF;
  SELECT * INTO rp FROM fs_reports WHERE id=(p_data->>'id')::uuid AND site_id=st.id FOR UPDATE;
  IF rp.id IS NULL THEN RAISE EXCEPTION 'Report not found'; END IF;
  IF p_action='assign' THEN
   target:=(p_data->>'manager_id')::uuid;
   IF NOT EXISTS(SELECT 1 FROM user_roles WHERE user_id=target AND site_id=st.id AND role IN ('manager','supervisor')) THEN RAISE EXCEPTION 'Authorised manager required'; END IF;
   UPDATE fs_reports SET manager_id=target WHERE id=rp.id; PERFORM fs_event(st.id,rp.id,'Manager assigned',jsonb_build_object('manager',(SELECT name FROM profiles WHERE id=target))); RETURN '{}';
  ELSIF p_action='escalate' THEN
   IF rp.status='Resolved' THEN RAISE EXCEPTION 'Report already resolved'; END IF;
   UPDATE fs_reports SET escalated_at=coalesce(escalated_at,now()),manager_id=st.supervisor_id WHERE id=rp.id;
   PERFORM fs_event(st.id,rp.id,'Escalated to supervisor'); INSERT INTO fs_notifications(user_id,entity_id,kind,message) VALUES(st.supervisor_id,rp.id,'escalation','Escalated safety report '||rp.reference) ON CONFLICT DO NOTHING; RETURN '{}';
  END IF;
  IF m.role<>'supervisor' AND rp.manager_id<>u THEN RAISE EXCEPTION 'Only responsible manager can update this report'; END IF;
  newstatus:=p_data->>'status'; txt:=trim(p_data->>'note');
  IF newstatus NOT IN ('Under Review','Action Taken','Resolved') OR array_position(ARRAY['Reported','Under Review','Action Taken','Resolved'],newstatus)<>array_position(ARRAY['Reported','Under Review','Action Taken','Resolved'],rp.status)+1 OR length(txt) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'Choose the next progress step and describe the action'; END IF;
  UPDATE fs_reports SET status=newstatus,note=txt WHERE id=rp.id;
  PERFORM fs_event(st.id,rp.id,newstatus,jsonb_build_object('note',txt)); RETURN '{}';
 ELSIF p_action='deadlines' THEN
  IF m.role<>'supervisor' THEN RAISE EXCEPTION 'Supervisor permission required'; END IF;
  UPDATE fs_sites SET low_hours=(p_data->>'Low')::integer,medium_hours=(p_data->>'Medium')::integer,high_hours=(p_data->>'High')::integer WHERE id=st.id;
  PERFORM fs_event(st.id,st.id,'Severity deadlines updated',p_data); RETURN '{}';
 END IF;
 RAISE EXCEPTION 'Unknown action';
END $$;
REVOKE ALL ON FUNCTION public.fs_command(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fs_command(text,jsonb) TO authenticated;
CREATE FUNCTION public.fs_dashboard() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); m user_roles%ROWTYPE; result jsonb; month_start timestamptz:=date_trunc('month',now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata';
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO m FROM user_roles WHERE user_id=u;
 result:=jsonb_build_object('profile',(SELECT to_jsonb(p) FROM profiles p WHERE id=u),'membership',to_jsonb(m),'period',to_char(now() AT TIME ZONE 'Asia/Kolkata','YYYY-MM'));
 IF m.user_id IS NULL THEN RETURN result; END IF;
 RETURN result||jsonb_build_object(
 'site',(SELECT to_jsonb(s)-CASE WHEN m.role='worker' THEN 'join_code' ELSE 'unused' END FROM fs_sites s WHERE id=m.site_id),
 'people',coalesce((SELECT jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'role',r.role)) FROM user_roles r JOIN profiles p ON p.id=r.user_id WHERE r.site_id=m.site_id AND (m.role<>'worker' OR r.user_id=u OR r.role IN ('manager','supervisor'))),'[]'),
 'payroll',coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM fs_payroll p WHERE site_id=m.site_id AND (m.role<>'worker' OR worker_id=u)),'[]'),
 'shifts',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT * FROM fs_shifts WHERE site_id=m.site_id AND scheduled_start>=month_start AND scheduled_start<month_start+interval '2 months' AND (m.role<>'worker' OR worker_id=u) ORDER BY scheduled_start DESC LIMIT 500) t),'[]'),
 'corrections',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT * FROM fs_corrections WHERE site_id=m.site_id AND (m.role<>'worker' OR worker_id=u) ORDER BY created_at DESC LIMIT 200)t),'[]'),
 'disputes',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT * FROM fs_disputes WHERE site_id=m.site_id AND (m.role<>'worker' OR worker_id=u) ORDER BY created_at DESC LIMIT 200)t),'[]'),
 'reports',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT * FROM fs_reports WHERE site_id=m.site_id AND (m.role<>'worker' OR fs_owns_report(id)) ORDER BY created_at DESC LIMIT 200)t),'[]'),
 'events',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT * FROM fs_events WHERE site_id=m.site_id AND (m.role<>'worker' OR fs_owns_report(entity_id) OR EXISTS(SELECT 1 FROM fs_shifts WHERE id=entity_id AND worker_id=u) OR EXISTS(SELECT 1 FROM fs_disputes WHERE id=entity_id AND worker_id=u) OR entity_id=u) ORDER BY created_at DESC LIMIT 500)t),'[]'),
 'notifications',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT * FROM fs_notifications WHERE user_id=u ORDER BY created_at DESC LIMIT 30)t),'[]'));
END $$;
REVOKE ALL ON FUNCTION public.fs_dashboard() FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.fs_dashboard() TO authenticated;
CREATE FUNCTION public.fs_time_actions() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record;
BEGIN
 FOR r IN UPDATE fs_reports rp SET escalated_at=now(),manager_id=s.supervisor_id FROM fs_sites s WHERE rp.site_id=s.id AND rp.status<>'Resolved' AND rp.due_at<now() AND rp.escalated_at IS NULL RETURNING rp.* LOOP
  PERFORM fs_event(r.site_id,r.id,'Automatically escalated to supervisor',jsonb_build_object('deadline',r.due_at),'System');
  INSERT INTO fs_notifications(user_id,entity_id,kind,message) VALUES(r.manager_id,r.id,'escalation','Overdue safety report '||r.reference) ON CONFLICT DO NOTHING;
 END LOOP;
 INSERT INTO fs_notifications(user_id,entity_id,kind,message) SELECT worker_id,id,'check-in','Shift starting: remember to check in' FROM fs_shifts WHERE check_in IS NULL AND scheduled_start BETWEEN now() AND now()+interval '1 hour' ON CONFLICT DO NOTHING;
 INSERT INTO fs_notifications(user_id,entity_id,kind,message) SELECT worker_id,id,'check-out','Scheduled shift has ended: remember to check out' FROM fs_shifts WHERE check_in IS NOT NULL AND check_out IS NULL AND scheduled_end<=now() ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.fs_time_actions() FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.fs_time_actions() TO service_role;