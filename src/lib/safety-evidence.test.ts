import { describe, expect, it, vi } from "vitest";
const storage = vi.hoisted(() => ({ list: vi.fn(), createSignedUrl: vi.fn(), upload: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: () => storage } },
}));
import { saveSafetyReport, loadEvidence, evidenceExtension } from "./safety-evidence";
import type { Command } from "./workflows";
const id = "123e4567-e89b-12d3-a456-426614174000";
const command: Extract<Command, { action: "report" }> = {
  action: "report",
  data: {
    language: "en",
    category: "Other",
    severity: "Low",
    location: "Test",
    text: "Synthetic test report",
    anonymous: true,
    has_media: true,
  },
};
describe("safety evidence coordination", () => {
  it("saves the reference before uploads and reports partial failures", async () => {
    const saved = vi.fn();
    const files = [
      new File(["a"], "a.png", { type: "image/png" }),
      new File(["b"], "b.png", { type: "image/png" }),
    ];
    const upload = vi.fn().mockImplementation(async (_id, file) => {
      expect(saved).toHaveBeenCalledWith({ id, reference: "SV-TEST" });
      return file.name === "b.png" ? new Error("failed") : null;
    });
    const result = await saveSafetyReport(
      command,
      files,
      async () => ({ id, reference: "SV-TEST" }),
      saved,
      upload,
    );
    expect(result.failed).toEqual(["b.png"]);
    expect(upload).toHaveBeenCalledTimes(2);
  });
  it("never uploads or announces a reference when report creation fails", async () => {
    const upload = vi.fn();
    const saved = vi.fn();
    await expect(
      saveSafetyReport(
        command,
        [],
        async () => {
          throw new Error("offline");
        },
        saved,
        upload,
      ),
    ).rejects.toThrow("offline");
    expect(upload).not.toHaveBeenCalled();
    expect(saved).not.toHaveBeenCalled();
  });
  it("rejects missing report IDs and empty descriptions without evidence", async () => {
    await expect(saveSafetyReport(command, [], async () => ({}), vi.fn())).rejects.toThrow(
      "could not be saved",
    );
    await expect(
      saveSafetyReport({ ...command, data: { ...command.data, text: "" } }, [], vi.fn(), vi.fn()),
    ).rejects.toThrow("description");
  });
  it("surfaces listing failures and retains existing empty-URL signing behavior", async () => {
    storage.list.mockResolvedValueOnce({ error: { message: "denied" } });
    await expect(loadEvidence(id)).rejects.toThrow("denied");
    storage.list.mockResolvedValueOnce({ data: [{ name: "a.png" }], error: null });
    storage.createSignedUrl.mockResolvedValueOnce({ data: null, error: { message: "expired" } });
    expect(await loadEvidence(id)).toEqual([{ name: "a.png", url: "" }]);
    expect(storage.createSignedUrl).toHaveBeenCalledWith(`${id}/a.png`, 300);
  });
  it("retains filename extensions for supported evidence", () => {
    expect(
      ["image/jpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/webm"].map(evidenceExtension),
    ).toEqual(["jpg", "m4a", "wav", "ogg", "webm"]);
  });
});
