# NEURAL AVATAR ARCHITECTURE & VERIFICATION
## NOVAVID AI STUDIO 2.0 — PHASE 12

**Company:** LODHI TECHX  
**Product Version:** 2.0.1  
**Status:** Neural Model: `NOT VERIFIED (Awaiting Hosted/Local Weight Check)` | Procedural Rig: `PASS (Fallback)`

---

## 1. COMPATIBLE NEURAL MODELS & LICENSING AUDIT

NovaVid AI Studio 2.0 is designed to integrate with modern open-source audio-driven neural talking-head models:

| Neural Model | Research Institution | Open-Source License | Hardware Requirements | Model Weights | Output Type |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **LivePortrait** | KwaiVGI | MIT License | NVIDIA GPU (8GB+ VRAM), CUDA 12 | ~2.5 GB checkpoints | 2D/3D portrait animation with eye gaze & head motion |
| **SadTalker** | CVPR 2023 | Apache 2.0 | NVIDIA GPU (6GB+ VRAM), PyTorch | ~1.8 GB checkpoints | Audio-driven 3D facial coefficients |
| **EchoMimic** | Alibaba | Apache 2.0 | NVIDIA GPU (12GB+ VRAM) | ~3.8 GB checkpoints | Lifelike audio-driven portrait diffusion |
| **Wav2Lip** | Interspeech | Commercial / Academic | NVIDIA GPU (4GB+ VRAM) | ~450 MB checkpoints | Lip-sync accuracy |

---

## 2. INFERENCE INTEGRATION & FALLBACK ARCHITECTURE

Implemented in `src/lib/avatarInferenceService.ts`:
- **Local Neural Engine (`dispatchSadTalkerLocal`):** Calls local PyTorch REST endpoint (`http://127.0.0.1:8000/api/render-avatar`).
- **Absence of Weights / Server Offline:** If the local PyTorch server is not running or weights are missing, the system gracefully triggers the **NovaVid 2D Synthetic Viseme Rig** or returns a transparent error notice.
- **Procedural 2D Rig (`dispatchNovaVidNeuralEngine`):** Procedural viseme compositing that maps audio phonemes to facial mouth shapes. Honestly labeled as an offline 2D heuristic fallback rig, never as a neural diffusion model.
- **Third-Party Neural APIs:** D-ID Talks API and HeyGen can be connected via customer API keys in Settings.
