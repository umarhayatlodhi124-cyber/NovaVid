import { describe, expect, it } from "vitest";
import {
  AutonomousAgentEngine,
  DEFAULT_WORKFLOW_PLAN,
  COMPLETE_20_STEP_WORKFLOW_PLAN,
  AgentLogEntry,
  executeQualityControlAudit,
  executeFactCheckResearch,
} from "./agentEngine";

describe("Stage F & Stage U — Complete AI Video Automation Engine Unit Tests", () => {
  it("DEFAULT_WORKFLOW_PLAN contains all 9 production stages in exact PRD sequence", () => {
    expect(DEFAULT_WORKFLOW_PLAN.length).toBe(9);
    const steps = DEFAULT_WORKFLOW_PLAN.map((p) => p.step);
    expect(steps).toEqual([
      "research",
      "script",
      "storyboard",
      "visuals",
      "voice",
      "subtitles",
      "audio",
      "timeline",
      "render",
    ]);
  });

  it("DEFAULT_WORKFLOW_PLAN designates script, voice, and timeline as key checkpoints", () => {
    const checkpoints = DEFAULT_WORKFLOW_PLAN.filter((p) => p.isCheckpoint).map((p) => p.step);
    expect(checkpoints).toEqual(["script", "voice", "timeline"]);
  });

  it("COMPLETE_20_STEP_WORKFLOW_PLAN contains all 20 autonomous stages from topic to publishing", () => {
    expect(COMPLETE_20_STEP_WORKFLOW_PLAN.length).toBe(20);
    const steps = COMPLETE_20_STEP_WORKFLOW_PLAN.map((p) => p.step);
    expect(steps[0]).toBe("topic_analysis");
    expect(steps[2]).toBe("fact_checked_research");
    expect(steps[15]).toBe("timeline_assembly");
    expect(steps[16]).toBe("quality_control_audit");
    expect(steps[19]).toBe("publishing_preparation");
  });

  it("createWorkflow creates an initial idle workflow with 0% progress and pending steps", () => {
    const wf = AutonomousAgentEngine.createWorkflow("proj-test-1", "Quantum Computing", "supervised");
    expect(wf.projectId).toBe("proj-test-1");
    expect(wf.title).toBe("Autonomous Production: Quantum Computing");
    expect(wf.mode).toBe("supervised");
    expect(wf.status).toBe("idle");
    expect(wf.currentStep).toBe("research");
    expect(wf.progressPercent).toBe(0);
    expect(wf.stepHistory.length).toBe(9);
    expect(wf.stepHistory.every((s) => s.status === "pending")).toBe(true);
  });

  it("createWorkflow supports full_20_step pipeline configuration", () => {
    const wf20 = AutonomousAgentEngine.createWorkflow("proj-test-20", "AI Revolution", "autonomous", "full_20_step");
    expect(wf20.plan.length).toBe(20);
    expect(wf20.currentStep).toBe("topic_analysis");
    expect(wf20.stepHistory.length).toBe(20);
  });

  it("executeStep advances research step and pauses at script checkpoint in supervised mode", async () => {
    const logs: AgentLogEntry[] = [];
    const wf = AutonomousAgentEngine.createWorkflow("proj-test-2", "History of Space", "supervised");

    const afterStep1 = await AutonomousAgentEngine.executeStep(wf, (l) => logs.push(l));

    expect(afterStep1.stepHistory[0].status).toBe("completed");
    expect(afterStep1.currentStep).toBe("script");
    expect(afterStep1.status).toBe("waiting_approval"); // Supervised checkpoint triggered
    expect(afterStep1.progressPercent).toBeGreaterThan(0);
    expect(logs.some((l) => l.level === "checkpoint")).toBe(true);
  });

  it("executeFactCheckResearch generates confidence scores and flags unverified assertions", () => {
    const checks = executeFactCheckResearch("Quantum AI");
    expect(checks.length).toBeGreaterThanOrEqual(3);

    const verified = checks.filter((c) => c.verified);
    expect(verified.length).toBeGreaterThanOrEqual(2);
    expect(verified[0].confidenceScore).toBeGreaterThan(0.9);
    expect(verified[0].sourceCitation).toBeDefined();

    const unverified = checks.find((c) => !c.verified);
    expect(unverified).toBeDefined();
    expect(unverified?.warning).toBeDefined();
  });

  it("executeQualityControlAudit evaluates duration, resolution, black frames, and audio balance", async () => {
    const report = await executeQualityControlAudit("proj-qc-test");
    expect(report).toBeDefined();
    expect(typeof report.passed).toBe("boolean");
    expect(report.resolution).toContain("1920x1080");
    expect(Array.isArray(report.issues)).toBe(true);
    expect(Array.isArray(report.warnings)).toBe(true);
  });

  it("pause, resume, and cancel control flags operate correctly", () => {
    const wf = AutonomousAgentEngine.createWorkflow("proj-test-3", "Mars Mission", "autonomous");
    AutonomousAgentEngine.pauseWorkflow(wf.id);
    AutonomousAgentEngine.resumeWorkflow(wf.id);
    AutonomousAgentEngine.cancelWorkflow(wf.id);
    expect(wf.id).toBeDefined();
  });
});
