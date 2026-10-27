import { describe, expect, it, vi } from "vitest";
import { attendanceCommand, LOCATION_FAILURE } from "./attendance-actions";
const id = "123e4567-e89b-12d3-a456-426614174000";
const position: GeolocationPosition = {
  coords: {
    latitude: 13,
    longitude: 80,
    accuracy: 12,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    toJSON: () => ({}),
  },
  timestamp: 1000,
  toJSON: () => ({}),
};
describe("attendance submission", () => {
  it("includes the one-time location for check-in", async () => {
    const cmd = await attendanceCommand(
      id,
      false,
      `fairshift:${id}`,
      true,
      vi.fn(),
      async () => position,
    );
    expect(cmd).toEqual({
      action: "check_in",
      data: {
        id,
        token: id,
        location: {
          latitude: 13,
          longitude: 80,
          accuracy: 12,
          timestamp: 1000,
        },
      },
    });
  });
  it("requires a location when the site requires verification", async () => {
    await expect(
      attendanceCommand(id, false, id, true, vi.fn(), async () => {
        throw new Error("denied");
      }),
    ).rejects.toThrow(LOCATION_FAILURE);
  });
  it("allows checkout without optional location", async () => {
    const cmd = await attendanceCommand(id, true, id, false, vi.fn(), async () => {
      throw new Error("denied");
    });
    expect(cmd).toEqual({ action: "check_out", data: { id, token: id } });
  });
  it("rejects invalid QR codes before sending a command", async () => {
    await expect(
      attendanceCommand(id, false, "bad", false, vi.fn(), async () => position),
    ).rejects.toThrow();
  });
});
