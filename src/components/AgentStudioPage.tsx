import { useState, useEffect } from "react";
import {
  AgentWorkflow,
  AgentLogEntry,
  AgentStepPlan,
  WorkflowMode,
  WorkflowPlanType,
  AutonomousAgentEngine,
  executeQualityControlAudit,
  QualityControlReport,
  COMPLETE_20_STEP_WORKFLOW_PLAN,
} from "../lib/agentEngine";
import { AgentWorkflowRepository } from "../lib/repositories";

interface AgentStudioPageProps {
  currentProjectId: string | null;
  projectTitle?: string;
  onNavigateToView?: (view: string) => void;
}

export function AgentStudioPage({
  currentProjectId,
  projectTitle,
  onNavigateToView,
}: AgentStudioPageProps) {
  const [workflow, setWorkflow] = useState<AgentWorkflow | null>(null);
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [selectedMode, setSelectedMode] = useState<WorkflowMode>("supervised");
  const [selectedPlanType, setSelectedPlanType] = useState<WorkflowPlanType>("full_20_step");
  const [isRunning, setIsRunning] = useState(false);
  const [topicPrompt, setTopicPrompt] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [qcReport, setQcReport] = useState<QualityControlReport | null>(null);
  const [isAuditingQC, setIsAuditingQC] = useState(false);

  // Load existing workflow and logs if present
  useEffect(() => {
    let isMounted = true;

    async function loadWorkflow() {
      if (!currentProjectId) return;
      try {
        const existingWf = await AgentWorkflowRepository.getWorkflow(currentProjectId);
        if (isMounted && existingWf) {
          setWorkflow(existingWf);
          setSelectedMode(existingWf.mode);
          if (existingWf.plan.length > 10) {
            setSelectedPlanType("full_20_step");
          } else {
            setSelectedPlanType("standard");
          }
          const existingLogs = await AgentWorkflowRepository.listLogs(existingWf.id);
          if (isMounted) {
            setLogs(existingLogs);
          }
        }
      } catch (err: any) {
        console.error("Failed to load workflow:", err);
      }
    }

    loadWorkflow();
    return () => {
      isMounted = false;
    };
  }, [currentProjectId]);

  const handleStartWorkflow = async () => {
    if (!currentProjectId) {
      setErrorMessage("Please select or create an active project first.");
      return;
    }

    const topic = topicPrompt.trim() || projectTitle || "AI Revolution in Video Creation";
    const newWf = AutonomousAgentEngine.createWorkflow(
      currentProjectId,
      topic,
      selectedMode,
      selectedPlanType
    );
    setWorkflow(newWf);
    setLogs([]);
    setErrorMessage(null);
    setIsRunning(true);

    try {
      await AgentWorkflowRepository.saveWorkflow(newWf);
      runWorkflowLoop(newWf);
    } catch (err: any) {
      setErrorMessage(`Failed to initialize agent workflow: ${err.message || String(err)}`);
      setIsRunning(false);
    }
  };

  const handleLog = async (log: AgentLogEntry) => {
    setLogs((prev) => [...prev, log]);
    try {
      await AgentWorkflowRepository.saveLog(log);
    } catch {
      // Continue anyway
    }
  };

  const runWorkflowLoop = async (currentWf: AgentWorkflow) => {
    let wf = currentWf;
    setIsRunning(true);

    while (wf.status === "running" || wf.status === "idle") {
      wf = await AutonomousAgentEngine.executeStep(wf, handleLog);
      setWorkflow({ ...wf });
      await AgentWorkflowRepository.saveWorkflow(wf);

      if (wf.status === "waiting_approval" || wf.status === "completed" || wf.status === "failed") {
        break;
      }
    }

    setIsRunning(false);
  };

  const handleApproveCheckpoint = async () => {
    if (!workflow) return;
    workflow.status = "running";
    setWorkflow({ ...workflow });
    await AgentWorkflowRepository.saveWorkflow(workflow);
    runWorkflowLoop(workflow);
  };

  const handlePause = () => {
    if (!workflow) return;
    AutonomousAgentEngine.pauseWorkflow(workflow.id);
    workflow.status = "paused";
    setWorkflow({ ...workflow });
    setIsRunning(false);
  };

  const handleResume = () => {
    if (!workflow) return;
    AutonomousAgentEngine.resumeWorkflow(workflow.id);
    workflow.status = "running";
    setWorkflow({ ...workflow });
    runWorkflowLoop(workflow);
  };

  const handleCancel = () => {
    if (!workflow) return;
    AutonomousAgentEngine.cancelWorkflow(workflow.id);
    workflow.status = "cancelled";
    setWorkflow({ ...workflow });
    setIsRunning(false);
  };

  const handleRunQCAudit = async () => {
    if (!currentProjectId) return;
    setIsAuditingQC(true);
    try {
      const report = await executeQualityControlAudit(currentProjectId);
      setQcReport(report);
    } catch (err: any) {
      setErrorMessage(`Quality Control Audit failed: ${err.message || String(err)}`);
    } finally {
      setIsAuditingQC(false);
    }
  };

  return (
    <div className="agent-studio-container" style={{ padding: "24px", color: "#e2e8f0" }}>
      {/* Studio Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          borderBottom: "1px solid #334155",
          paddingBottom: "16px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, color: "#f8fafc" }}>
              Autonomous YouTube AI Agent
            </h1>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "0.75rem",
                fontWeight: 700,
                background: "#4f46e5",
                color: "#e0e7ff",
              }}
            >
              Stage U (20-Step Engine)
            </span>
          </div>
          <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.9rem" }}>
            End-to-end autonomous video production pipeline: Idea → Fact-Checked Research → 3-Act Script → AI 1080p Visuals → Voice → Ducking → Timeline → QC Audit → Publishing Gate.
          </p>
        </div>

        {/* Configuration Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Plan Type Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Pipeline:</span>
            <select
              value={selectedPlanType}
              onChange={(e) => setSelectedPlanType(e.target.value as WorkflowPlanType)}
              disabled={isRunning}
              style={{
                padding: "6px 10px",
                borderRadius: "4px",
                background: "#0f172a",
                color: "#f8fafc",
                border: "1px solid #475569",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              <option value="full_20_step">Full 20-Step Master Pipeline</option>
              <option value="standard">Standard 9-Step Fast Pipeline</option>
            </select>
          </div>

          {/* Mode Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Mode:</span>
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value as WorkflowMode)}
              disabled={isRunning}
              style={{
                padding: "6px 10px",
                borderRadius: "4px",
                background: "#0f172a",
                color: "#f8fafc",
                border: "1px solid #475569",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              <option value="supervised">Supervised (Checkpoints)</option>
              <option value="autonomous">Autonomous Draft</option>
              <option value="step_by_step">Step-by-Step</option>
            </select>
          </div>

          <button
            onClick={handleRunQCAudit}
            disabled={isAuditingQC}
            style={{
              padding: "6px 12px",
              borderRadius: "4px",
              background: "#0f766e",
              color: "#ffffff",
              border: "none",
              cursor: isAuditingQC ? "wait" : "pointer",
              fontSize: "0.8rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span>🛡️</span> {isAuditingQC ? "Auditing..." : "QC Audit"}
          </button>
        </div>
      </header>

      {/* QC Audit Results Banner */}
      {qcReport && (
        <div
          style={{
            background: qcReport.passed ? "#064e3b" : "#7f1d1d",
            border: `1px solid ${qcReport.passed ? "#059669" : "#dc2626"}`,
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "16px",
            fontSize: "0.85rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <strong style={{ color: qcReport.passed ? "#a7f3d0" : "#fecaca" }}>
              {qcReport.passed ? "✓ Quality Control Gate Passed" : "⚠️ Quality Control Gate Flagged Issues"}
            </strong>
            <span style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>
              Duration: {qcReport.durationSeconds}s | {qcReport.resolution}
            </span>
          </div>
          {qcReport.issues.length > 0 && (
            <div style={{ color: "#fee2e2", fontSize: "0.8rem", marginTop: "4px" }}>
              Issues: {qcReport.issues.join("; ")}
            </div>
          )}
          {qcReport.warnings.length > 0 && (
            <div style={{ color: "#fef08a", fontSize: "0.8rem", marginTop: "2px" }}>
              Warnings: {qcReport.warnings.join("; ")}
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div
          style={{
            background: "#7f1d1d",
            color: "#fecaca",
            padding: "10px 16px",
            borderRadius: "6px",
            marginBottom: "16px",
            fontSize: "0.875rem",
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Top Action & Topic Card */}
      <div
        style={{
          background: "#1e293b",
          borderRadius: "8px",
          padding: "20px",
          border: "1px solid #334155",
          marginBottom: "24px",
          display: "flex",
          gap: "16px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: "280px" }}>
          <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
            Video Topic / Core Premise
          </label>
          <input
            type="text"
            placeholder={projectTitle ? `Using project: ${projectTitle}` : "e.g. How Quantum Computers Will Change Everything"}
            value={topicPrompt}
            onChange={(e) => setTopicPrompt(e.target.value)}
            disabled={isRunning}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "4px",
              background: "#0f172a",
              color: "#f8fafc",
              border: "1px solid #475569",
              fontSize: "0.9rem",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
          {!workflow || workflow.status === "completed" || workflow.status === "failed" || workflow.status === "cancelled" ? (
            <button
              onClick={handleStartWorkflow}
              disabled={isRunning}
              style={{
                padding: "10px 20px",
                borderRadius: "6px",
                background: "#3b82f6",
                color: "#ffffff",
                border: "none",
                fontWeight: 700,
                cursor: isRunning ? "not-allowed" : "pointer",
                fontSize: "0.95rem",
              }}
            >
              {isRunning ? "Orchestrating..." : "🚀 Launch Autonomous Pipeline"}
            </button>
          ) : workflow.status === "running" ? (
            <button
              onClick={handlePause}
              style={{
                padding: "10px 18px",
                borderRadius: "6px",
                background: "#f59e0b",
                color: "#0f172a",
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ⏸ Pause Agent
            </button>
          ) : workflow.status === "paused" ? (
            <button
              onClick={handleResume}
              style={{
                padding: "10px 18px",
                borderRadius: "6px",
                background: "#10b981",
                color: "#ffffff",
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ▶ Resume Agent
            </button>
          ) : null}

          {workflow && (workflow.status === "running" || workflow.status === "paused" || workflow.status === "waiting_approval") && (
            <button
              onClick={handleCancel}
              style={{
                padding: "10px 16px",
                borderRadius: "6px",
                background: "#334155",
                color: "#f8fafc",
                border: "1px solid #64748b",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Checkpoint Approval Banner */}
      {workflow && workflow.status === "waiting_approval" && (
        <div
          style={{
            background: "#1e1b4b",
            border: "1px solid #6366f1",
            borderRadius: "8px",
            padding: "16px 20px",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontWeight: 700, color: "#a5b4fc", fontSize: "1rem" }}>
              Checkpoint Reached: Approval Required
            </div>
            <div style={{ fontSize: "0.85rem", color: "#cbd5e1", marginTop: "2px" }}>
              The agent has paused before executing step:{" "}
              <strong>{workflow.plan.find((p) => p.step === workflow.currentStep)?.title}</strong>.
              Review the generated assets or click approve to continue.
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            {onNavigateToView && (
              <button
                onClick={() => {
                  const targetView =
                    workflow.currentStep === "script" || workflow.currentStep === "script_refinement"
                      ? "script"
                      : workflow.currentStep === "storyboard" || workflow.currentStep === "storyboard_generation"
                      ? "storyboard"
                      : workflow.currentStep === "visuals" || workflow.currentStep === "ai_visual_synthesis"
                      ? "visuals"
                      : workflow.currentStep === "voice" || workflow.currentStep === "voiceover_synthesis"
                      ? "voice"
                      : workflow.currentStep === "timeline" || workflow.currentStep === "timeline_assembly"
                      ? "timeline"
                      : workflow.currentStep === "publishing_preparation"
                      ? "publishing"
                      : "agent";
                  onNavigateToView(targetView);
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: "6px",
                  background: "#312e81",
                  color: "#e0e7ff",
                  border: "1px solid #4338ca",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                }}
              >
                Inspect Assets ↗
              </button>
            )}

            <button
              onClick={handleApproveCheckpoint}
              style={{
                padding: "8px 18px",
                borderRadius: "6px",
                background: "#4f46e5",
                color: "#ffffff",
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              ✓ Approve & Continue
            </button>
          </div>
        </div>
      )}

      {/* Progress & Status Card */}
      {workflow && (
        <div
          style={{
            background: "#1e293b",
            borderRadius: "8px",
            padding: "20px",
            border: "1px solid #334155",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.9rem" }}>
            <span style={{ fontWeight: 600 }}>
              Overall Progress ({workflow.plan.filter((_: AgentStepPlan, idx: number) => workflow.stepHistory[idx]?.status === "completed").length}/{workflow.plan.length} Steps)
            </span>
            <span style={{ fontWeight: 700, color: "#38bdf8" }}>{workflow.progressPercent}%</span>
          </div>

          <div style={{ width: "100%", height: "8px", background: "#0f172a", borderRadius: "4px", overflow: "hidden" }}>
            <div
              style={{
                width: `${workflow.progressPercent}%`,
                height: "100%",
                background: workflow.status === "completed" ? "#10b981" : "#3b82f6",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      )}

      {/* Main Grid: Plan Steps Timeline + Console Logs */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: "24px", alignItems: "start" }}>
        {/* Left: Execution Step Pipeline */}
        <div
          style={{
            background: "#1e293b",
            borderRadius: "8px",
            padding: "20px",
            border: "1px solid #334155",
            maxHeight: "680px",
            overflowY: "auto",
          }}
        >
          <h2 style={{ margin: "0 0 16px", fontSize: "1.1rem", color: "#f8fafc" }}>
            Production Steps Pipeline ({workflow?.plan.length || 20} Steps)
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {(workflow ? workflow.plan : COMPLETE_20_STEP_WORKFLOW_PLAN).map((stepPlan: AgentStepPlan, idx: number) => {
              const exec = workflow ? workflow.stepHistory[idx] : null;
              const isCurrent = workflow ? workflow.currentStep === stepPlan.step : idx === 0;
              const isCompleted = exec?.status === "completed";
              const isFailed = exec?.status === "failed";
              const isRunningStep = exec?.status === "running";

              return (
                <div
                  key={stepPlan.step}
                  style={{
                    background: isCurrent ? "#0f172a" : "#1e293b",
                    padding: "10px 14px",
                    borderRadius: "6px",
                    borderLeft: `4px solid ${
                      isCompleted ? "#10b981" : isFailed ? "#ef4444" : isRunningStep ? "#3b82f6" : "#475569"
                    }`,
                    borderTop: isCurrent ? "1px solid #3b82f6" : "1px solid #334155",
                    borderRight: isCurrent ? "1px solid #3b82f6" : "1px solid #334155",
                    borderBottom: isCurrent ? "1px solid #3b82f6" : "1px solid #334155",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem", color: isCurrent ? "#38bdf8" : "#f8fafc" }}>
                      {stepPlan.title}
                    </div>

                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      {stepPlan.isCheckpoint && (
                        <span
                          style={{
                            fontSize: "0.65rem",
                            background: "#312e81",
                            color: "#c7d2fe",
                            padding: "2px 6px",
                            borderRadius: "3px",
                            fontWeight: 700,
                          }}
                        >
                          CHECKPOINT
                        </span>
                      )}

                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          color: isCompleted ? "#34d399" : isFailed ? "#f87171" : isRunningStep ? "#60a5fa" : "#64748b",
                        }}
                      >
                        {isCompleted ? "✓ DONE" : isFailed ? "✕ FAILED" : isRunningStep ? "RUNNING" : "PENDING"}
                      </span>
                    </div>
                  </div>

                  <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "#94a3b8", lineHeight: "1.4" }}>
                    {stepPlan.description}
                  </p>

                  {exec?.summary && (
                    <div
                      style={{
                        marginTop: "6px",
                        fontSize: "0.75rem",
                        color: "#a7f3d0",
                        background: "#064e3b",
                        padding: "4px 8px",
                        borderRadius: "4px",
                      }}
                    >
                      {exec.summary}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live Execution Console Logs */}
        <div
          style={{
            background: "#1e293b",
            borderRadius: "8px",
            padding: "20px",
            border: "1px solid #334155",
            display: "flex",
            flexDirection: "column",
            height: "680px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem", color: "#f8fafc" }}>
              Live Orchestrator Console
            </h2>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
              {logs.length} events logged
            </span>
          </div>

          <div
            style={{
              flex: 1,
              background: "#0b1120",
              borderRadius: "6px",
              padding: "12px",
              border: "1px solid #1e293b",
              fontFamily: "monospace",
              fontSize: "0.8rem",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            {logs.length === 0 ? (
              <div style={{ color: "#475569", textAlign: "center", marginTop: "40px" }}>
                No active execution. Launch the pipeline to stream live orchestrator logs.
              </div>
            ) : (
              logs.map((log) => {
                const color =
                  log.level === "error"
                    ? "#f87171"
                    : log.level === "warn"
                    ? "#fbbf24"
                    : log.level === "checkpoint"
                    ? "#a5b4fc"
                    : "#38bdf8";

                return (
                  <div key={log.id} style={{ display: "flex", gap: "8px", lineHeight: "1.5" }}>
                    <span style={{ color: "#64748b", flexShrink: 0 }}>
                      [{new Date(log.createdAt).toLocaleTimeString()}]
                    </span>
                    <span style={{ color, fontWeight: 700, flexShrink: 0 }}>
                      [{log.level.toUpperCase()}]
                    </span>
                    <span style={{ color: "#cbd5e1", wordBreak: "break-word" }}>
                      {log.message}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
