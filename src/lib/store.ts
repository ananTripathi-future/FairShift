import { useSyncExternalStore } from "react";
import { savedState } from "./validate";

export type Role = "worker" | "manager";
export type Attendance = { id: string; workerId: string; checkIn: number; checkOut?: number };
export type Dispute = {
  id: string;
  workerId: string;
  text: string;
  status: "Open" | "Resolved" | "Rejected";
  reply?: string;
  at: number;
};
export type SafetyStatus = "Submitted" | "Under Review" | "In Progress" | "Resolved";
export type Safety = {
  id: string;
  workerId: string | null;
  category: string;
  severity: "Low" | "Medium" | "High";
  location: string;
  text: string;
  status: SafetyStatus;
  note?: string | undefined;
  at: number;
};
export type Audit = { at: number; who: string; what: string };
export type Worker = {
  id: string;
  name: string;
  site: string;
  ratePaise: number;
  deductionsPaise: number;
  skills: string[];
};

type State = {
  workers: Worker[];
  attendance: Attendance[];
  disputes: Dispute[];
  safety: Safety[];
  audit: Audit[];
  payApproved: Record<string, boolean>;
};

const KEY = "fairshift-demo-v1";
const day = 86400000;
const today = new Date();
today.setHours(0, 0, 0, 0);
const t0 = today.getTime();

function seed(): State {
  const workers: Worker[] = [
    {
      id: "w1",
      name: "Ravi Kumar",
      site: "Block C, Riverside Campus",
      ratePaise: 12500,
      deductionsPaise: 20000,
      skills: ["Masonry", "Scaffold safety (2025)"],
    },
    {
      id: "w2",
      name: "Lakshmi Devi",
      site: "Library Annex",
      ratePaise: 11000,
      deductionsPaise: 15000,
      skills: ["Housekeeping", "First aid"],
    },
    {
      id: "w3",
      name: "Arjun Patel",
      site: "Block C, Riverside Campus",
      ratePaise: 14000,
      deductionsPaise: 20000,
      skills: ["Electrical", "Lock-out/tag-out"],
    },
  ];
  const attendance: Attendance[] = [];
  workers.forEach((w, i) => {
    for (let d = 5; d >= 1; d--) {
      const start = t0 - d * day + 8 * 3600000;
      const len = 8 * 60 + ((d + i) % 3) * 50;
      attendance.push({
        id: `a-${w.id}-${d}`,
        workerId: w.id,
        checkIn: start,
        checkOut: start + len * 60000,
      });
    }
  });
  return {
    workers,
    attendance,
    disputes: [
      {
        id: "D-1001",
        workerId: "w2",
        text: "Overtime on Tuesday is missing, I stayed till 6:30pm.",
        status: "Open",
        at: t0 - day,
      },
    ],
    safety: [
      {
        id: "S-2041",
        workerId: "w1",
        category: "Missing protective equipment",
        severity: "High",
        location: "Block C, 3rd floor",
        text: "Harness hooks are broken near the east stairwell.",
        status: "Under Review",
        at: t0 - 2 * day,
      },
      {
        id: "S-2042",
        workerId: null,
        category: "Electrical hazard",
        severity: "Medium",
        location: "Library Annex basement",
        text: "Exposed wiring by the pump room.",
        status: "Submitted",
        at: t0 - day,
      },
    ],
    audit: [{ at: t0 - 2 * day, who: "System", what: "Demo data loaded" }],
    payApproved: {},
  };
}

let state: State = seed();
let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = savedState.safeParse(JSON.parse(raw));
      if (parsed.success) state = parsed.data as State;
      else localStorage.removeItem(KEY); // corrupt or tampered: fall back to demo data
    }
  } catch {
    /* storage unavailable: keep in-memory demo data */
  }
}

export function update(fn: (s: State) => State) {
  load();
  state = fn(state);
  localStorage.setItem(KEY, JSON.stringify(state));
  subs.forEach((f) => f());
}

export function log(s: State, who: string, what: string): State {
  return { ...s, audit: [{ at: Date.now(), who, what }, ...s.audit] };
}

export function resetDemo() {
  update(() => seed());
}

const serverState = seed();
export function useStore() {
  return useSyncExternalStore(
    (f) => {
      load();
      subs.add(f);
      queueMicrotask(f);
      return () => subs.delete(f);
    },
    () => {
      load();
      return state;
    },
    () => serverState,
  );
}

export const uid = (p: string) => `${p}-${Math.floor(1000 + Math.random() * 9000)}`;
