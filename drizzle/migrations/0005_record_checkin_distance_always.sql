CREATE OR REPLACE FUNCTION public.fs_command(p_action text, p_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE u uuid:=auth.uid(); m user_roles%ROWTYPE; st fs_sites%ROWTYPE; sh fs_shifts%ROWTYPE; cr fs_corrections%ROWTYPE; rp fs_reports%ROWTYPE; di fs_disputes%ROWTYPE; eid uuid; target uuid; token uuid; txt text; newstatus text; v_period text:=to_char(now() AT TIME ZONE 'Asia/Kolkata','YYYY-MM');
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO m FROM user_roles WHERE user_id=u;
 IF p_action='create_site' THEN
  IF m.user_id IS NOT NULL THEN RAISE EXCEPTION 'Already joined a site'; END IF;
  INSERT INTO fs_sites(name,supervisor_id,manager_id) VALUES(trim(p_data->>'name'),u,u) RETURNING * INTO st;
  INSERT INTO user_roles VALUES(u,st.id,'manager'); INSERT INTO fs_payroll(worker_id,site_id) VALUES(u,st.id);
  PERFORM fs_event(st.id,st.id,'Site created'); RETURN jsonb_build_object('id',st.id);
 ELSIF p_action='join_site' THEN
  IF m.user_id IS NOT NULL THEN RAISE EXCEPTION 'Already joined a site'; END IF;
  SELECT * INTO st FROM fs_sites WHERE join_code=(p_data->>'code')::uuid;
  IF st.id IS NULL THEN RAISE EXCEPTION 'Invalid site invitation'; END IF;
  INSERT INTO user_roles VALUES(u,st.id,'worker'); INSERT INTO fs_payroll(worker_id,site_id) VALUES(u,st.id);
  PERFORM fs_event(st.id,u,'Worker joined'); RETURN '{}';
 ELSIF p_action='skills' THEN UPDATE profiles SET skills=ARRAY(SELECT trim(x) FROM jsonb_array_elements_text(p_data->'skills') x) WHERE id=u; RETURN '{}'; ELSIF p_action='profile' THEN
  UPDATE profiles SET name=trim(p_data->>'name'),language=p_data->>'language' WHERE id=u; RETURN '{}';
 END IF;
 IF m.user_id IS NULL THEN RAISE EXCEPTION 'Join or create a site first'; END IF;
 
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
 
 IF p_action='location_settings' THEN IF m.role<>'manager' THEN RAISE EXCEPTION 'Manager permission required'; END IF; UPDATE fs_sites SET location_required=(p_data->>'required')::boolean, latitude=(p_data->>'latitude')::double precision, longitude=(p_data->>'longitude')::double precision, radius_m=(p_data->>'radius')::integer WHERE id=st.id; PERFORM fs_event(st.id,st.id,'Location verification settings updated',jsonb_build_object('required',p_data->'required','radius',p_data->'radius')); RETURN '{}'; ELSIF p_action='qr' THEN
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
 ELSIF p_action IN ('check_in','check_out') THEN IF st.location_required THEN IF p_data->'location' IS NULL OR coalesce((p_data->'location'->>'latitude')::double precision,999) NOT BETWEEN -90 AND 90 OR coalesce((p_data->'location'->>'longitude')::double precision,999) NOT BETWEEN -180 AND 180 OR coalesce((p_data->'location'->>'accuracy')::double precision,999999) NOT BETWEEN 0 AND st.radius_m OR abs(extract(epoch from now())*1000-coalesce((p_data->'location'->>'timestamp')::double precision,0))>120000 THEN RAISE EXCEPTION 'Allow a fresh, accurate location reading at the worksite'; END IF; IF fs_distance(st.latitude,st.longitude,(p_data->'location'->>'latitude')::double precision,(p_data->'location'->>'longitude')::double precision)>st.radius_m THEN RAISE EXCEPTION 'You are outside the worksite attendance radius'; END IF; END IF;
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
  PERFORM fs_event(st.id,sh.id,CASE WHEN p_action='check_in' THEN 'Checked in' ELSE 'Checked out' END,jsonb_build_object('location_verified',st.location_required,'distance_m',CASE WHEN st.latitude IS NOT NULL AND p_data->'location' IS NOT NULL THEN round(fs_distance(st.latitude,st.longitude,(p_data->'location'->>'latitude')::double precision,(p_data->'location'->>'longitude')::double precision)) ELSE NULL END)); RETURN '{}';
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
  INSERT INTO fs_disputes(site_id,worker_id,period,line,text) VALUES(st.id,u,v_period,p_data->>'line',trim(p_data->>'text')) RETURNING id INTO eid;
  PERFORM fs_event(st.id,eid,'Pay dispute opened',jsonb_build_object('line',p_data->>'line','period',v_period)); RETURN jsonb_build_object('id',eid);
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
   IF m.role<>'manager' OR target=st.manager_id OR p_data->>'role' NOT IN ('worker','supervisor','manager') THEN RAISE EXCEPTION 'Only a manager can assign site roles'; END IF;
   UPDATE user_roles SET role=(p_data->>'role')::fs_role WHERE user_id=target; PERFORM fs_event(st.id,target,'Role changed',jsonb_build_object('role',p_data->>'role')); RETURN '{}';
  ELSIF p_action='pay_terms' THEN
   UPDATE fs_payroll SET rate_paise=(p_data->>'rate')::integer,allowance_paise=(p_data->>'allowance')::integer,deduction_paise=(p_data->>'deduction')::integer,approved_month=NULL,approved_at=NULL,approved_by=NULL WHERE worker_id=target;
   PERFORM fs_event(st.id,target,'Pay terms updated',p_data); RETURN '{}';
  END IF;
  IF EXISTS(SELECT 1 FROM fs_shifts WHERE worker_id=target AND to_char(scheduled_start AT TIME ZONE 'Asia/Kolkata','YYYY-MM')=v_period AND (verified_at IS NULL OR check_out IS NULL)) OR EXISTS(SELECT 1 FROM fs_disputes WHERE worker_id=target AND period=v_period AND status='Open') THEN RAISE EXCEPTION 'Verify all shifts and resolve pay disputes before approval'; END IF;
  UPDATE fs_payroll SET approved_month=v_period,approved_at=now(),approved_by=u WHERE worker_id=target; PERFORM fs_event(st.id,target,'Pay approved',jsonb_build_object('period',v_period)); RETURN '{}';
 ELSIF p_action='report' THEN
  target:=nullif(p_data->>'manager_id','')::uuid;
  IF target IS NULL THEN target:=st.manager_id; END IF;
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
   UPDATE fs_reports SET escalated_at=coalesce(escalated_at,now()),manager_id=st.manager_id WHERE id=rp.id;
   PERFORM fs_event(st.id,rp.id,'Escalated to manager'); INSERT INTO fs_notifications(user_id,entity_id,kind,message) VALUES(st.manager_id,rp.id,'escalation','Escalated safety report '||rp.reference) ON CONFLICT DO NOTHING; RETURN '{}';
  END IF;
  IF m.role<>'manager' AND rp.manager_id<>u THEN RAISE EXCEPTION 'Only responsible manager can update this report'; END IF;
  newstatus:=p_data->>'status'; txt:=trim(p_data->>'note');
  IF newstatus NOT IN ('Under Review','Action Taken','Resolved') OR array_position(ARRAY['Reported','Under Review','Action Taken','Resolved'],newstatus)<>array_position(ARRAY['Reported','Under Review','Action Taken','Resolved'],rp.status)+1 OR length(txt) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'Choose the next progress step and describe the action'; END IF;
  UPDATE fs_reports SET status=newstatus,note=txt WHERE id=rp.id;
  PERFORM fs_event(st.id,rp.id,newstatus,jsonb_build_object('note',txt)); RETURN '{}';
 ELSIF p_action='deadlines' THEN
  IF m.role<>'manager' THEN RAISE EXCEPTION 'Manager permission required'; END IF;
  UPDATE fs_sites SET low_hours=(p_data->>'Low')::integer,medium_hours=(p_data->>'Medium')::integer,high_hours=(p_data->>'High')::integer WHERE id=st.id;
  PERFORM fs_event(st.id,st.id,'Severity deadlines updated',p_data); RETURN '{}';
 END IF;
 RAISE EXCEPTION 'Unknown action';
END $function$