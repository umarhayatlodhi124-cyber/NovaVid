import { describe, it, expect } from "vitest";
import { createAutopilotSchedule, simulateAutonomousRun } from "./autopilotDaemon";

describe("Autonomous Auto-Pilot Daemon Engine", () => {
  it("creates active schedule with default 09:00 PKT daily trigger", () => {
    const sched = createAutopilotSchedule({ niche: "technology" });
    expect(sched.id).toBeTruthy();
    expect(sched.active).toBe(true);
    expect(sched.scheduledTimePKT).toBe("09:00");
    expect(sched.nextRunAt).toContain("09:00");
  });

  it("simulates full end-to-end autonomous publishing pipeline", () => {
    const sched = createAutopilotSchedule({ niche: "technology" });
    const events = simulateAutonomousRun(sched);
    expect(events.length).toBe(5);

    const stages = events.map((e) => e.stage);
    expect(stages).toContain("discovery");
    expect(stages).toContain("scripting");
    expect(stages).toContain("rendering");
    expect(stages).toContain("thumbnail");
    expect(stages).toContain("completed");

    const finalEvent = events[events.length - 1];
    expect(finalEvent.progressPercent).toBe(100);
    expect(finalEvent.youtubeVideoId).toBeTruthy();
  });
});

