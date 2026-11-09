# ADVANCED THUMBNAIL STUDIO & COMPOSITION SPECIFICATION

**Company:** LODHI TECHX  
**System:** NovaVid AI Studio 2.1  
**Module:** `src/lib/dynamicThumbnailEngine.ts`  
**UI Interface:** `src/components/ThumbnailStudioPage.tsx`  

---

## 1. Zero Hardcoded Demo Content Mandate

In compliance with NovaVid 2.1 Master PRD Section 2, all legacy demo placeholders ("Taleemi Dunya Pro", "School ERP", "LODHI TECHX OFFICIAL", fixed presenter "Umar Hayat") have been permanently excised from default state initialization.

Every generated thumbnail concept is dynamically extracted from:
- Active video topic and script outline.
- Selected visual theme.
- User-provided presenter headshot or avatar portrait.
- Creator custom brand palette (Primary, Accent, Background).

---

## 2. Multi-Variation Thumbnail Generation

Every generation cycle produces 3 distinct conceptual approaches:
- **Version A (Face-Focused):** Emphasizes presenter facial reactions with high-contrast text to maximize viewer empathy and CTR.
- **Version B (Subject-Focused):** Highlights the subject matter, devices, software code, or diagrams with full-canvas high-visibility banners.
- **Version C (Cinematic):** Center-weighted dramatic typography tailored for documentaries, financial investigations, and narrative explainers.

---

## 3. Strict Preflight Validation

All thumbnails are audited prior to rendering or YouTube sync:
- Exact 1280 × 720 pixel resolution.
- 16:9 widescreen aspect ratio (1.78).
- Under 2MB file limit enforced by YouTube Data API specifications.
- Valid image encoding in PNG and high-quality JPEG.

