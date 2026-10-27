import { parseQR, type Command } from "./workflows";

export const LOCATION_FAILURE =
  "Location access failed. Allow location at the site or request an attendance correction.";
export type ReadPosition = () => Promise<GeolocationPosition>;

export function readPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    }),
  );
}

export async function attendanceCommand(
  id: string,
  active: boolean,
  token: string,
  required: boolean,
  status: (message: string) => void,
  locate: ReadPosition = readPosition,
): Promise<Command> {
  let location;
  status("Capturing your location…");
  try {
    const position = await locate();
    location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
    };
    status(`Location captured · about ${Math.round(position.coords.accuracy)} m accuracy`);
  } catch {
    if (required) {
      status("");
      throw new Error(LOCATION_FAILURE);
    }
    status("Location not shared — attendance recorded without it.");
  }
  return {
    action: active ? "check_out" : "check_in",
    data: {
      id,
      token: parseQR(token),
      ...(location ? { location } : {}),
    },
  };
}
