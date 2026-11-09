# THUMBNAIL DYNAMIC PROJECT BINDING SPECIFICATION

**Company:** LODHI TECHX  
**System:** NovaVid AI Studio 2.1  
**Architecture:** Project State Reactive Synchronization  

---

## 1. Project Context Ingestion

In NovaVid AI Studio 2.1, the Thumbnail Studio is a first-class node in the production pipeline rather than an isolated canvas.

### Ingestion Interface:
```typescript
interface ThumbnailProject {
  id: string;
  videoTopic: string;
  videoTitle: string;
  scriptSummary?: string;
  channelName?: string;
  channelLogo?: string;
  uploadedPhotoUrl?: string;
  selectedVisualUrl?: string;
  brandColors?: { primary: string; accent: string };
  language?: string;
  category?: string;
}
```

When accessed from an active project in the Creator Workspace or OneClick Creator:
1. Active project ID is bound to all generated variations.
2. Headlines and sub-headlines are extracted directly from the generated script's hook and core thesis.
3. Color themes default to user's saved brand preferences.
4. Exported thumbnails are saved directly into the project's media asset directory (`mediaAssets`).

