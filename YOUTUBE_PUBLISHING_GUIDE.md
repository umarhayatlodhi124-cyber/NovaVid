# NovaVid AI — YouTube Publishing & Pipeline Integration Guide
**Project:** NovaVid AI YouTube Studio  
**Primary Brand:** LODHI TECHX  
**Platform:** Windows 10/11 x64  
**Audience:** Video Editors, Studio Operators, Content Automation Specialists

---

## 1. End-to-End Production Pipeline Architecture

NovaVid's production pipeline connects all 12 creative stages with the YouTube Data API:

```
[Gemini 2.5 AI Idea & Research]
             |
             v
[Script Studio (3-Act Narrative)]
             |
             v
[Storyboard Studio (Visual Breakdown)]
             |
             v
[AI Visual Studio (Imagen 3 / Local CGI)]
             |
             v
[Voice / TTS Studio (Windows SAPI / Cloud TTS)]
             |
             v
[Subtitle Studio (RTL Urdu Nastaliq / ASS / SRT)]
             |
             v
[Audio Studio (Procedural Mixing & -18 dB Ducking)]
             |
             v
[Timeline Studio (Frame-Accurate Multi-Track Assembly)]
             |
             v
[Video Export & Render (FFmpeg NVENC / CPU 1080p/4K)]
             |
             v
[YouTube SEO Studio (High-CTR Titles, Tags, Chapters)]
             |
             v
[Mandatory Human Approval Quality Gate]
             |
             v
[YouTube Publishing Studio (1 MiB Chunked Resumable Upload)]
```

---

## 2. Mandatory Human Approval & Private-First Policy

To protect your channel's reputation and prevent accidental public broadcasts of work-in-progress drafts:

1. **Private-First Default:**
   Every new video upload defaults to **Private (`privacyStatus: "private"`)**.
2. **Explicit Human Confirmation for Public Uploads:**
   If a creator selects **Public**, the publishing engine halts and displays an interactive modal requiring confirmation:
   - "Are you sure you want to publish this video publicly to LODHI TECHX immediately?"
   - The user must check an acknowledgment checkbox before the upload proceeds.
3. **Unlisted Option:**
   Allows client previews or internal team reviews before public launch.

---

## 3. Resumable Upload Protocol Details

- **Chunk Alignment:** Video files are uploaded using Google's resumable upload protocol in **1 MiB (1,048,576 bytes)** chunks (an exact multiple of the mandatory 256 KiB YouTube boundary).
- **Network Resilience:** If network connectivity drops mid-upload, NovaVid queries the upload session URL with `bytes */total_bytes` to retrieve the last received byte offset and resumes without restarting from scratch.
- **Thumbnail Attachment:** Once video processing completes, NovaVid issues a secondary `POST /upload/youtube/v3/thumbnails/set` call to automatically bind your custom high-resolution thumbnail graphic.

---

## 4. YouTube Quota Management

- Standard YouTube Data API default daily quota: **10,000 units / day**.
- Cost of one video upload (`videos.insert`): **1,600 units**.
- This permits **6 full video uploads per day** under the free quota.
- Submitting an audit request in Google Cloud Console allows quota increases up to 100,000+ units per day for active production studios.
