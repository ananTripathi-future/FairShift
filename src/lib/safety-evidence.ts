import { supabase } from "@/integrations/supabase/client";
import { validateMedia } from "./workflows";
import type { Command } from "./workflows";
import type { CommandResult } from "./dashboard-contract";

export function evidenceExtension(type: string) {
  if (type.startsWith("image/")) return type.split("/")[1] === "jpeg" ? "jpg" : type.split("/")[1];
  if (type.includes("mp4")) return "m4a";
  if (type.includes("wav")) return "wav";
  if (type.includes("ogg")) return "ogg";
  return "webm";
}

export async function uploadEvidence(id: string, file: File) {
  const { error } = await supabase.storage
    .from("safety-evidence")
    .upload(`${id}/${crypto.randomUUID()}.${evidenceExtension(file.type)}`, file, {
      contentType: file.type,
      upsert: false,
    });
  return error;
}

export async function saveSafetyReport(
  command: Extract<Command, { action: "report" }>,
  files: File[],
  run: (command: Command) => Promise<CommandResult>,
  saved: (result: CommandResult) => void,
  upload: (id: string, file: File) => Promise<unknown> = uploadEvidence,
) {
  validateMedia(files);
  if (command.data.text.trim().length < 10 && !files.length)
    throw new Error("Add a description (10 characters) or a photo / voice recording.");
  const result = await run(command);
  if (!result.id) throw new Error("Report could not be saved");
  saved(result);
  const failed: string[] = [];
  for (const file of files) {
    const error = await upload(result.id, file);
    if (error) failed.push(file.name);
  }
  return { result, failed };
}

export async function loadEvidence(id: string) {
  const bucket = supabase.storage.from("safety-evidence");
  const { data, error } = await bucket.list(id);
  if (error) throw new Error(error.message);
  return Promise.all(
    (data ?? []).map(async (f) => {
      const { data: signed } = await bucket.createSignedUrl(`${id}/${f.name}`, 300);
      return { name: f.name, url: signed?.signedUrl ?? "" };
    }),
  );
}
