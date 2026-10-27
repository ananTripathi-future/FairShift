import { useEffect, useRef, useState } from "react";
import { Mic, Square, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Panel, Tag, field } from "@/components/Shell";
import { Timeline } from "@/components/Timeline";
import { supabase } from "@/integrations/supabase/client";
import { useCommand } from "@/lib/use-dashboard";
import { dateTime, isOverdue, steps, validateMedia, type Dashboard } from "@/lib/workflows";
import type { Tables } from "@/integrations/supabase/types";
const ta = {
  title: "பாதுகாப்பு புகார்",
  location: "இடம்",
  text: "என்ன நடந்தது?",
  severity: "தீவிரம்",
  submit: "புகாரை அனுப்பு",
  anon: "என் பெயரை மறை",
  category: "வகை",
  voice: "குரல் பதிவு",
  stop: "நிறுத்து",
  photo: "படம் / குரல் கோப்பு",
  manager: "பொறுப்பான மேலாளர்",
};
const en = {
  title: "SafeVoice · report a concern",
  location: "Location",
  text: "What happened?",
  severity: "Severity",
  submit: "Submit safety report",
  anon: "Hide my name from managers",
  category: "Category",
  voice: "Record voice",
  stop: "Stop recording",
  photo: "Photo / voice file",
  manager: "Responsible manager",
};
export function SafeVoice({ d }: { d: Dashboard }) {
  const [lang, setLang] = useState<"en" | "ta">(d.profile.language === "ta" ? "ta" : "en");
  const copy = lang === "ta" ? ta : en;
  const [files, setFiles] = useState<File[]>([]);
  const [recording, setRecording] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const cmd = useCommand();
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState("");
  useEffect(
    () => () => {
      if (rec.current?.state === "recording") rec.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  const add = (incoming: File[]) => {
    try {
      validateMedia([...files, ...incoming]);
      setFiles([...files, ...incoming]);
    } catch (e) {
      if (e instanceof Error) toast.error(e.message);
    }
  };
  const record = async () => {
    if (recording) {
      rec.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const r = new MediaRecorder(s);
      rec.current = r;
      const chunks: BlobPart[] = [];
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onstop = () => {
        s.getTracks().forEach((t) => t.stop());
        const type = r.mimeType.split(";")[0] ?? "audio/webm";
        const extension = type === "audio/mp4" ? "m4a" : type === "audio/ogg" ? "ogg" : "webm";
        add([new File(chunks, `voice.${extension}`, { type })]);
      };
      r.start();
      setRecording(true);
      setTimeout(() => {
        if (r.state === "recording") {
          r.stop();
          setRecording(false);
        }
      }, 120000);
    } catch {
      toast.error("Microphone unavailable. Upload an audio file or type your report.");
    }
  };
  return (
    <Panel title={copy.title}>
      <div className="mb-4 flex gap-2" role="group" aria-label="Report language">
        {(["en", "ta"] as const).map((l) => (
          <Button
            key={l}
            size="sm"
            variant={lang === l ? "default" : "outline"}
            aria-pressed={lang === l}
            onClick={() => {
              setLang(l);
              cmd.mutate({ action: "profile", data: { name: d.profile.name, language: l } });
            }}
          >
            {l === "en" ? "English" : "தமிழ்"}
          </Button>
        ))}
      </div>
      <form
        lang={lang}
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const f = new FormData(form);
          if (recording) {
            toast.error("Stop recording before submitting");
            return;
          }
          setBusy(true);
          try {
            validateMedia(files);
            const payload = {
              language: lang,
              category: String(f.get("category")),
              severity: String(f.get("severity")) as "Low" | "Medium" | "High",
              location: String(f.get("location")),
              text: String(f.get("text")),
              anonymous: f.get("anon") === "on",
              has_media: files.length > 0,
              manager_id: String(f.get("manager")),
            };
            if (payload.text.trim().length < 10 && !files.length)
              throw new Error("Add a description (10 characters) or a photo / voice recording.");
            const result = await cmd.mutateAsync({ action: "report", data: payload });
            if (!result.id) throw new Error("Report could not be saved");
            setSubmitted(result.reference ?? result.id);
            const failed: string[] = [];
            for (const file of files) {
              const ext = file.type.startsWith("image/")
                ? file.type.split("/")[1] === "jpeg"
                  ? "jpg"
                  : file.type.split("/")[1]
                : file.type.includes("mp4")
                  ? "m4a"
                  : file.type.includes("wav")
                    ? "wav"
                    : file.type.includes("ogg")
                      ? "ogg"
                      : "webm";
              const { error } = await supabase.storage
                .from("safety-evidence")
                .upload(`${result.id}/${crypto.randomUUID()}.${ext}`, file, {
                  contentType: file.type,
                  upsert: false,
                });
              if (error) failed.push(file.name);
            }
            if (failed.length)
              toast.error(
                `Report saved, but attachments failed: ${failed.join(", ")}. Keep the files for your manager.`,
              );
            else toast.success(`Saved privately: ${result.reference}`);
            setFiles([]);
            form.reset();
          } catch (error) {
            if (error instanceof Error) toast.error(error.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            {copy.category}
            <select name="category" className={field}>
              {[
                "Unsafe equipment",
                "Missing protective equipment",
                "Electrical hazard",
                "Fall hazard",
                "Fire or emergency risk",
                "Harassment or other concern",
                "Other",
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            {copy.severity}
            <select name="severity" className={field}>
              <option>Low</option>
              <option selected={undefined}>Medium</option>
              <option>High</option>
            </select>
          </label>
        </div>
        <label className="block text-sm">
          {copy.location}
          <input className={field} name="location" minLength={2} maxLength={120} required />
        </label>
        <label className="block text-sm">
          {copy.text}
          <textarea className={field} name="text" rows={3} maxLength={1000} />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={record} disabled={busy}>
            {recording ? <Square /> : <Mic />}
            {recording ? copy.stop : copy.voice}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => input.current?.click()}
            disabled={busy}
          >
            <Paperclip />
            {copy.photo}
          </Button>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,audio/webm,audio/ogg,audio/mp4,audio/wav"
            multiple
            className="hidden"
            onChange={(e) => {
              add(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
            aria-label="Attach safety evidence"
          />
        </div>
        <ul>
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Remove ${f.name}`}
                onClick={() => setFiles(files.filter((_, j) => j !== i))}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
        <label className="block text-sm">
          {copy.manager}
          <select name="manager" className={field}>
            {(d.people ?? [])
              .filter((p) => p.role !== "worker")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.role}
                </option>
              ))}
          </select>
        </label>
        <label className="flex gap-2 text-sm">
          <input type="checkbox" name="anon" />
          {copy.anon}
        </label>
        <p className="text-xs text-muted-foreground">
          {lang === "ta"
            ? "மேலாளர்களிடம் பெயர் மறைக்கப்படும். உங்கள் கணக்கில் புகாரின் நிலையைப் பார்க்கலாம்."
            : "Your name is hidden from managers; you can still track the report in your account. Voice and photos may identify you."}
        </p>
        <p className="text-xs text-destructive">
          {lang === "ta"
            ? "உடனடி ஆபத்து ஏற்பட்டால் பாதுகாப்பான இடத்திற்குச் சென்று தள அவசர உதவியை அணுகவும்."
            : "Immediate danger? Move to safety and contact your site's emergency team."}
        </p>
        <Button disabled={busy || cmd.isPending || recording}>
          {busy ? "Saving…" : copy.submit}
        </Button>
        {submitted && (
          <p role="status" className="font-mono text-sm text-accent">
            Private reference: {submitted}
          </p>
        )}
      </form>
    </Panel>
  );
}
export function Reports({ d, manager = false }: { d: Dashboard; manager?: boolean }) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <Panel title={manager ? "SafeVoice · case queue" : "My confidential reports"}>
      <ul className="space-y-6">
        {(d.reports ?? []).map((r) => (
          <li key={r.id} className="border-b pb-5">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="font-mono text-sm">{r.reference}</strong>
              <Tag>{r.severity}</Tag>
              <Tag>{r.status}</Tag>
              {isOverdue(r, now) && <Tag>Overdue</Tag>}
              {r.escalated_at && <Tag>Escalated</Tag>}
            </div>
            <h3 className="mt-2 font-medium">
              {r.category} · {r.location}
            </h3>
            <p lang={r.language} className="mt-1 break-words text-sm">
              {r.text}
            </p>
            <Timeline stages={steps} current={steps.indexOf(r.status)} />
            <p className="text-xs text-muted-foreground">
              Responsible: {d.people?.find((p) => p.id === r.manager_id)?.name ?? "Site manager"} ·
              Deadline: {dateTime(r.due_at)} · Reporter: {r.reporter_name ?? "Confidential"}
            </p>
            {r.note && <p className="mt-2 text-sm">Corrective action: {r.note}</p>}
            <Evidence id={r.id} />
            <ul className="my-3 space-y-1 text-xs text-muted-foreground">
              {(d.events ?? [])
                .filter((ev) => ev.entity_id === r.id)
                .reverse()
                .map((ev) => (
                  <li key={ev.id}>
                    {dateTime(ev.created_at)} · {ev.actor} · {ev.action}
                    {typeof ev.details === "object" && ev.details && "note" in ev.details
                      ? `: ${ev.details["note"]}`
                      : ""}
                  </li>
                ))}
            </ul>
            {manager && <CaseActions r={r} d={d} />}
          </li>
        ))}
      </ul>
      {!d.reports?.length && <p className="text-sm text-muted-foreground">No reports yet.</p>}
    </Panel>
  );
}
function Evidence({ id }: { id: string }) {
  const [items, setItems] = useState<{ name: string; url: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="mt-2">
      <Button
        size="sm"
        variant="ghost"
        disabled={loaded}
        onClick={async () => {
          const { data, error } = await supabase.storage.from("safety-evidence").list(id);
          if (error) {
            toast.error(error.message);
            return;
          }
          const urls = await Promise.all(
            (data ?? []).map(async (f) => {
              const { data: signed } = await supabase.storage
                .from("safety-evidence")
                .createSignedUrl(`${id}/${f.name}`, 300);
              return { name: f.name, url: signed?.signedUrl ?? "" };
            }),
          );
          setItems(urls);
          setLoaded(true);
        }}
      >
        View private evidence
      </Button>
      {loaded && !items.length && <p className="text-xs">No attachments.</p>}
      <div className="mt-2 grid gap-2">
        {items
          .filter((i) => i.url)
          .map((i) =>
            /\.(jpg|png|webp|jpeg)$/i.test(i.name) ? (
              <img
                key={i.name}
                src={i.url}
                alt="Safety evidence"
                className="max-h-64 max-w-full rounded object-contain"
              />
            ) : (
              <audio key={i.name} controls src={i.url} className="w-full" />
            ),
          )}
      </div>
    </div>
  );
}
function CaseActions({ r, d }: { r: Tables<"fs_reports">; d: Dashboard }) {
  const cmd = useCommand();
  const next = steps[steps.indexOf(r.status) + 1];
  return (
    <div className="space-y-3">
      {next && (d.membership?.role === "manager" || r.manager_id === d.profile.id) && (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            await cmd.mutateAsync({
              action: "report_update",
              data: {
                id: r.id,
                status: next as "Under Review" | "Action Taken" | "Resolved",
                note: String(new FormData(e.currentTarget).get("note")),
              },
            });
          }}
        >
          <label className="min-w-0 flex-1 text-sm">
            Action update
            <input name="note" className={field} minLength={5} maxLength={500} required />
          </label>
          <Button disabled={cmd.isPending} className="self-end">
            {next}
          </Button>
        </form>
      )}
      <label className="block text-sm">
        Assign investigator
        <select
          className={field}
          value={r.manager_id}
          onChange={(e) =>
            cmd.mutate({ action: "assign", data: { id: r.id, manager_id: e.target.value } })
          }
        >
          {d.people
            ?.filter((p) => p.role !== "worker")
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.role}
              </option>
            ))}
        </select>
      </label>
      {r.status !== "Resolved" && (
        <Button
          variant="outline"
          size="sm"
          disabled={cmd.isPending || Boolean(r.escalated_at)}
          onClick={() => cmd.mutate({ action: "escalate", data: { id: r.id } })}
        >
          Escalate to manager
        </Button>
      )}
    </div>
  );
}
