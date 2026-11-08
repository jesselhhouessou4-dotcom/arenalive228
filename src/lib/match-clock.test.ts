import { describe, expect, it } from "vitest";
import { currentPauseSeconds, playedSeconds } from "./match-clock";

const start = "2026-01-01T10:00:00Z";
const t = (s: number) => new Date(start).getTime() + s * 1000;

describe("chrono avec pauses", () => {
  it("soustrait la durée cumulée des pauses", () => {
    expect(playedSeconds({ period_started_at: start, total_paused_seconds: 120 }, t(600))).toBe(480);
  });
  it("s'arrête pendant la pause", () => {
    const m = { period_started_at: start, is_paused: true, paused_at: new Date(t(300)).toISOString(), total_paused_seconds: 0 };
    expect(playedSeconds(m, t(900))).toBe(300);
    expect(currentPauseSeconds(m, t(330))).toBe(30);
  });
});
