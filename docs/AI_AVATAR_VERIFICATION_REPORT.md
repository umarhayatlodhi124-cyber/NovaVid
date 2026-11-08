# NOVAVID AI STUDIO 2.0 — AI AVATAR VERIFICATION REPORT
**Company:** LODHI TECHX  
**Product:** NovaVid AI Studio 2.0  
**Phase:** Phase D Deliverable  
**Date:** November 2026  

---

## 1. Engine Classification & Truthful Labeling Policy

In compliance with Phase D core specifications, NovaVid strictly prohibits deceptive naming practices. The studio distinguishes three transparent tiers of avatar generation:

| Engine Tier | Label Exposed in UI | Technical Pipeline | Hardware Requirement |
| :--- | :--- | :--- | :--- |
| **Tier 1: Cloud Neural** | `Cloud Neural Presenter API (D-ID / HeyGen)` | Cloud API endpoints generating photorealistic talking-head video. | Any internet-connected device. |
| **Tier 2: Local Neural** | `Neural Talking-Head Diffusion / Latent Warping` | SadTalker / LivePortrait ONNX or PyTorch models running locally. | Dedicated GPU (NVIDIA CUDA or Apple Silicon, >= 6GB VRAM). |
| **Tier 3: Heuristic Fallback** | `2D Synthetic Viseme Rig (Offline Heuristic Fallback)` | 2D image morphing, facial landmark deformation, and phoneme-driven mouth viseme cycling. | CPU-only, low-end systems, offline environments. |

> [!IMPORTANT]
> **Strict Non-Deception Rule:** Under no circumstances is the 2D synthetic viseme rig presented to users as "Neural Video Generation", "AI Diffusion", or "DeepFake". It is clearly labeled as an offline heuristic fallback.

---

## 2. Hardware Compatibility Detection

Implemented in [`src/lib/avatarStudio.ts`](file:///g:/Nova%20Vid/src/lib/avatarStudio.ts):
```typescript
export interface HardwareCompatibility {
  hasDedicatedGPU: boolean;
  gpuRenderer?: string;
  recommendedEngine: "cloud_neural" | "local_neural" | "synthetic_fallback";
  vramEstimateMB?: number;
  supportsLivePortrait: boolean;
  supportsSadTalker: boolean;
  notes: string[];
}
```

### Detection Logic:
1. **WebGL / Canvas Context Query:** Inspects `WEBGL_debug_renderer_info` to detect GPU vendor (NVIDIA, AMD, Apple, Intel Iris vs CPU SwiftShader).
2. **Memory Heuristic:** Evaluates system hardware concurrency and navigator device memory to estimate VRAM capacity.
3. **Engine Recommendation:**
   - If NVIDIA RTX / GTX with >= 6GB VRAM detected: Recommends `local_neural` (LivePortrait/SadTalker).
   - If Integrated GPU / low VRAM detected with internet connection: Recommends `cloud_neural` or `synthetic_fallback`.
   - If offline or on low-spec hardware: Automatically selects `synthetic_fallback` with an explanatory notice.

---

## 3. Avatar Capabilities & Pipeline Validation

### 3.1 Image Upload & Facial Landmark Validation
- Accepts PNG, JPG, WebP formats (up to 4096x4096px).
- Validates facial presence, bounding box, eye alignment, and mouth aspect ratio.
- Rejects images without detectable frontal faces.

### 3.2 Audio-to-Viseme Synchronization
- Analyzes speech audio waveform using Fourier transforms (FFT) or pre-computed phoneme timestamps.
- Maps phoneme envelopes to 12 standard MPEG-4 visemes (`viseme_sil`, `viseme_PP`, `viseme_FF`, `viseme_TH`, `viseme_DD`, `viseme_kk`, `viseme_CH`, `viseme_SS`, `viseme_nn`, `viseme_RR`, `viseme_aa`, `viseme_E`).
- Applies smooth interpolation curves (ease-in-out) between mouth keyframes to eliminate jitter.

### 3.3 Micro-Expressions & Natural Head Movement
- Generates natural procedural head tilt (`yaw`, `pitch`, `roll`) oscillating at biological frequencies (0.2–0.5 Hz).
- Periodic involuntary eye blinks (every 3.5 to 5.5 seconds).
- Idle breathing cycle applied to shoulders and chin level.
