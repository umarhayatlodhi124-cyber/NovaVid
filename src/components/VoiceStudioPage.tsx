import { useEffect, useState, useRef } from "react";
import type { StoryboardDocument, StoryboardScene } from "../lib/storyboard";
import {
  fetchAvailableVoices,
  estimateCostForText,
  generateVoiceAudio,
  generateSceneVoiceAudio,
  deleteGeneratedAudioFile,
  getVoiceAudioDataUrl,
  type GeneratedAudioClip,
  type VoiceOption,
  type VoiceCostEstimate,
} from "../lib/voice";

export interface VoiceStudioPageProps {
  projectId: string;
  storyboard: StoryboardDocument | null;
  audioClips: GeneratedAudioClip[];
  onAudioGenerated: (clip: GeneratedAudioClip) => void;
  onAudioDeleted: (clipId: string, relativePath: string) => void;
  onAudioApproved: (clipId: string) => void;
  onError: (msg: string) => void;
}

export function VoiceStudioPage({
  projectId,
  storyboard,
  audioClips,
  onAudioGenerated,
  onAudioDeleted,
  onAudioApproved,
  onError,
}: VoiceStudioPageProps) {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<"gemini" | "native">("native");
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("Microsoft David Desktop");
  const [pace, setPace] = useState<number>(1.0);
  const [stylePrompt, setStylePrompt] = useState<string>("");
  const [billingConfirmed, setBillingConfirmed] = useState<boolean>(false);
  const [manualText, setManualText] = useState<string>("");

  const [activeGeneratingSceneId, setActiveGeneratingSceneId] = useState<string | null>(null);
  const [generatingFull, setGeneratingFull] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<string>("");
  const [previewingVoice, setPreviewingVoice] = useState<boolean>(false);

  // Playback state
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Cost estimate
  const [costEstimate, setCostEstimate] = useState<VoiceCostEstimate | null>(null);

  useEffect(() => {
    fetchAvailableVoices()
      .then((loaded) => {
        setVoices(loaded);
        if (loaded.length > 0) {
          const defaultVoice = loaded.find((v) => v.provider === selectedProvider) || loaded[0];
          setSelectedVoiceId(defaultVoice.id);
        }
      })
      .catch((err) => onError(err instanceof Error ? err.message : String(err)));
  }, [selectedProvider, onError]);

  // Recalculate cost estimate when text or provider changes
  useEffect(() => {
    const textToEstimate = manualText.trim() || storyboard?.scenes.map((s) => s.narration).join(" ") || "";
    if (!textToEstimate) {
      setCostEstimate(null);
      return;
    }
    estimateCostForText(textToEstimate, selectedProvider)
      .then((est) => setCostEstimate(est))
      .catch(() => setCostEstimate(null));
  }, [manualText, storyboard, selectedProvider]);

  const filteredVoices = voices.filter((v) => v.provider === selectedProvider);
  const selectedVoice = voices.find((v) => v.id === selectedVoiceId) || filteredVoices[0];

  const audioClipsByScene = audioClips.reduce<Record<string, GeneratedAudioClip>>((acc, clip) => {
    if (clip.sceneId) acc[clip.sceneId] = clip;
    return acc;
  }, {});

  // Handle single scene generation
  async function handleGenerateScene(scene: StoryboardScene) {
    if (!projectId) {
      onError("Please select or create a project first.");
      return;
    }
    if (selectedProvider === "gemini" && !billingConfirmed) {
      onError("Explicit billing confirmation is required before using Gemini TTS.");
      return;
    }

    setActiveGeneratingSceneId(scene.id);
    setGenerationProgress(`Synthesizing Scene #${scene.number}…`);

    try {
      const clip = await generateSceneVoiceAudio(projectId, scene, {
        provider: selectedProvider,
        voiceName: selectedVoice?.id || "Microsoft David Desktop",
        pace,
        stylePrompt: stylePrompt.trim() || undefined,
        billingConfirmed,
      });
      onAudioGenerated(clip);
      setGenerationProgress(`Scene #${scene.number} audio generated successfully.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setActiveGeneratingSceneId(null);
    }
  }

  // Handle manual or full script audio generation
  async function handleGenerateFullNarration() {
    if (!projectId) {
      onError("Please select or create a project first.");
      return;
    }
    if (selectedProvider === "gemini" && !billingConfirmed) {
      onError("Explicit billing confirmation is required before using Gemini TTS.");
      return;
    }

    setGeneratingFull(true);
    try {
      if (storyboard && storyboard.scenes.length > 0) {
        // Generate each scene sequentially
        for (let i = 0; i < storyboard.scenes.length; i++) {
          const sc = storyboard.scenes[i];
          setGenerationProgress(`Generating audio for Scene #${sc.number} (${i + 1}/${storyboard.scenes.length})…`);
          const clip = await generateSceneVoiceAudio(projectId, sc, {
            provider: selectedProvider,
            voiceName: selectedVoice?.id || "Microsoft David Desktop",
            pace,
            stylePrompt: stylePrompt.trim() || undefined,
            billingConfirmed,
          });
          onAudioGenerated(clip);
        }
        setGenerationProgress("All scenes generated successfully.");
      } else {
        const text = manualText.trim();
        if (!text) {
          onError("Enter narration text or generate a storyboard first.");
          return;
        }
        setGenerationProgress("Synthesizing full narration…");
        const clip = await generateVoiceAudio({
          projectId,
          text,
          provider: selectedProvider,
          voiceName: selectedVoice?.id || "Microsoft David Desktop",
          pace,
          stylePrompt: stylePrompt.trim() || undefined,
          billingConfirmed,
        });
        onAudioGenerated(clip);
        setGenerationProgress("Full narration generated successfully.");
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setGeneratingFull(false);
    }
  }

  // Voice preview sample
  async function handlePreviewVoice() {
    if (!projectId) {
      onError("Select a project first to test voice preview.");
      return;
    }
    if (selectedProvider === "gemini" && !billingConfirmed) {
      onError("Gemini preview requires billing confirmation.");
      return;
    }

    setPreviewingVoice(true);
    try {
      const sampleText = "Welcome to AI YouTube Studio. This is a voice preview test.";
      const clip = await generateVoiceAudio({
        projectId,
        text: sampleText,
        provider: selectedProvider,
        voiceName: selectedVoice?.id || "Microsoft David Desktop",
        pace,
        stylePrompt: stylePrompt.trim() || undefined,
        billingConfirmed,
      });
      await playAudioClip(clip);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setPreviewingVoice(false);
    }
  }

  // Play audio clip
  async function playAudioClip(clip: GeneratedAudioClip) {
    if (playingClipId === clip.id && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingClipId(null);
      return;
    }

    try {
      const dataUrl = await getVoiceAudioDataUrl(clip.relativePath);
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new Audio();
      }
      const player = audioPlayerRef.current;
      player.src = dataUrl;
      player.onended = () => setPlayingClipId(null);
      player.onerror = () => {
        setPlayingClipId(null);
        onError("Playback error reading audio file.");
      };
      await player.play();
      setPlayingClipId(clip.id);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="voice-studio-container">
      <section className="page-title-row">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> STAGE B AUDIO PRODUCTION</div>
          <h1>Voice / TTS Studio</h1>
          <p>Generate clean, scene-synchronized voiceovers with native Windows SAPI or Google Gemini TTS.</p>
        </div>
        <div className="button-row">
          <button
            className="button button-primary"
            disabled={generatingFull || Boolean(activeGeneratingSceneId)}
            onClick={handleGenerateFullNarration}
            type="button"
          >
            {generatingFull ? "Synthesizing All…" : "Generate Full Voiceover"}
          </button>
        </div>
      </section>

      {/* Voice configuration panel */}
      <section className="panel voice-config-card">
        <h3>Voice & Synthesis Settings</h3>
        <div className="settings-grid">
          <label className="settings-field">
            <span>Voice Provider</span>
            <select
              value={selectedProvider}
              onChange={(e) => {
                const next = e.currentTarget.value as "gemini" | "native";
                setSelectedProvider(next);
                setBillingConfirmed(false);
              }}
            >
              <option value="native">Windows Native SAPI (Offline, Free, Zero Cost)</option>
              <option value="gemini">Google Gemini TTS (Cloud Multilingual, High Fidelity)</option>
            </select>
          </label>

          <label className="settings-field">
            <span>Voice Talent</span>
            <select
              value={selectedVoiceId}
              onChange={(e) => setSelectedVoiceId(e.currentTarget.value)}
            >
              {filteredVoices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.gender} · {v.language})
                </option>
              ))}
            </select>
          </label>

          <label className="settings-field">
            <span>Pace ({pace.toFixed(1)}x)</span>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={pace}
              onChange={(e) => setPace(parseFloat(e.currentTarget.value))}
            />
          </label>

          <label className="settings-field">
            <span>Tone / Style Prompt</span>
            <input
              type="text"
              placeholder="e.g. Enthusiastic, calm documentary, professional tutorial"
              value={stylePrompt}
              onChange={(e) => setStylePrompt(e.currentTarget.value)}
            />
          </label>
        </div>

        {selectedVoice && (
          <div className="provider-meta" style={{ marginTop: "4px" }}>
            <small><strong>{selectedVoice.name}</strong>: {selectedVoice.description}</small>
          </div>
        )}

        {/* Cost estimate & billing banner */}
        {costEstimate && (
          <div className="voice-cost-banner">
            <div>
              <strong>Estimated Characters:</strong> {costEstimate.characterCount} chars (~{costEstimate.estimatedSeconds}s audio duration)
            </div>
            <div>
              <strong>Estimated Cost:</strong> {costEstimate.estimatedCost}
            </div>
            {selectedProvider === "gemini" && (
              <label style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={billingConfirmed}
                  onChange={(e) => setBillingConfirmed(e.currentTarget.checked)}
                />
                <span style={{ fontSize: "12px", color: "var(--color-text-primary, #fff)" }}>
                  I explicitly authorize this potentially billable Google Gemini TTS request. (Google Cloud / AI Studio developer API billing applies).
                </span>
              </label>
            )}
          </div>
        )}

        <div className="button-row" style={{ marginTop: "8px" }}>
          <button
            className="button button-secondary"
            disabled={previewingVoice}
            onClick={handlePreviewVoice}
            type="button"
          >
            {previewingVoice ? "Previewing…" : "Preview Voice Sample"}
          </button>
        </div>
      </section>

      {/* Progress banner */}
      {generationProgress && (
        <div className="status-banner" style={{ margin: "16px 0", padding: "10px 16px", background: "rgba(99,102,241,0.1)", borderRadius: "8px" }}>
          <span>{generationProgress}</span>
        </div>
      )}

      {/* Scene-wise audio list */}
      <section style={{ marginTop: "24px" }}>
        <h3>Scene Voice Clips</h3>
        <p style={{ fontSize: "13px", opacity: 0.8, marginBottom: "16px" }}>
          Regenerate individual scene voiceovers without losing other approved scenes. Approved audio survives restart.
        </p>

        {storyboard && storyboard.scenes.length > 0 ? (
          <div className="voice-scenes-list">
            {storyboard.scenes.map((scene) => {
              const clip = audioClipsByScene[scene.id];
              const isGenerating = activeGeneratingSceneId === scene.id;
              const isPlaying = clip && playingClipId === clip.id;

              return (
                <div key={scene.id} className="scene-audio-card">
                  <div className="scene-audio-header">
                    <div>
                      <strong>Scene #{scene.number}: {scene.title || `Scene ${scene.number}`}</strong>
                      <span style={{ marginLeft: "10px" }}>
                        {clip ? (
                          clip.status === "approved" ? (
                            <span className="badge-approved">Approved</span>
                          ) : (
                            <span className="badge-draft">Draft</span>
                          )
                        ) : (
                          <span className="status-pill">Needs Audio</span>
                        )}
                      </span>
                    </div>
                    {clip && (
                      <span style={{ fontSize: "12px", opacity: 0.7 }}>
                        {clip.durationSeconds.toFixed(1)}s · {clip.voiceName} ({clip.provider})
                      </span>
                    )}
                  </div>

                  <p style={{ margin: "4px 0", fontSize: "14px", fontStyle: "italic", opacity: 0.9 }}>
                    "{scene.narration || "No narration text specified."}"
                  </p>

                  {/* Waveform display if clip exists */}
                  {clip && clip.waveform && clip.waveform.length > 0 && (
                    <div className="waveform-container">
                      {clip.waveform.map((bar, bIdx) => (
                        <div
                          key={bIdx}
                          className="waveform-bar"
                          style={{
                            height: `${Math.max(12, Math.round(bar * 100))}%`,
                            background: isPlaying ? "#10b981" : "var(--color-primary, #6366f1)",
                          }}
                        />
                      ))}
                    </div>
                  )}

                  <div className="audio-player-row">
                    {clip && (
                      <button
                        className="button button-secondary"
                        onClick={() => playAudioClip(clip)}
                        type="button"
                      >
                        {isPlaying ? "Pause" : "Play Clip"}
                      </button>
                    )}

                    <button
                      className="button button-primary"
                      disabled={isGenerating || Boolean(activeGeneratingSceneId) || generatingFull}
                      onClick={() => handleGenerateScene(scene)}
                      type="button"
                    >
                      {isGenerating ? "Synthesizing…" : clip ? "Regenerate Audio" : "Generate Audio"}
                    </button>

                    {clip && clip.status !== "approved" && (
                      <button
                        className="button button-secondary"
                        onClick={() => onAudioApproved(clip.id)}
                        type="button"
                      >
                        Approve Clip
                      </button>
                    )}

                    {clip && (
                      <button
                        className="button button-danger"
                        onClick={async () => {
                          if (window.confirm(`Delete audio for Scene #${scene.number}?`)) {
                            await deleteGeneratedAudioFile(clip.relativePath);
                            onAudioDeleted(clip.id, clip.relativePath);
                          }
                        }}
                        type="button"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="panel" style={{ padding: "24px" }}>
            <p>No storyboard scenes found. You can enter custom text below or generate a storyboard from Script Studio.</p>
            <textarea
              className="text-input"
              rows={4}
              placeholder="Enter narration text to generate voiceover…"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              style={{ width: "100%", marginTop: "12px" }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
