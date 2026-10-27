DO $mig$
DECLARE d text := pg_get_functiondef('public.fs_command(text,jsonb)'::regprocedure);
BEGIN
  d := replace(d,
    $a$IF sh.id IS NULL OR sh.check_in IS NOT NULL OR sh.scheduled_start<=now() OR (p_data->>'start')::timestamptz<=now() THEN RAISE EXCEPTION 'Only future unstarted shifts can be rescheduled'; END IF;$a$,
    $b$IF sh.id IS NULL OR sh.check_in IS NOT NULL OR (p_data->>'start')::timestamptz<=now() OR (p_data->>'end')::timestamptz<=(p_data->>'start')::timestamptz THEN RAISE EXCEPTION 'Only shifts the worker has not checked into can be rescheduled, to a future time'; END IF;$b$);
  d := replace(d,
    $c$IF sh.id IS NULL OR sh.check_in IS NOT NULL OR sh.scheduled_start<=now() THEN RAISE EXCEPTION 'Only future unstarted shifts can be cancelled'; END IF;$c$,
    $e$IF sh.id IS NULL OR sh.check_in IS NOT NULL THEN RAISE EXCEPTION 'Only shifts the worker has not checked into can be cancelled'; END IF;$e$);
  IF position('has not checked into can be cancelled' in d)=0 OR position('has not checked into can be rescheduled' in d)=0 THEN
    RAISE EXCEPTION 'fs_command patch did not apply';
  END IF;
  EXECUTE d;
END $mig$;