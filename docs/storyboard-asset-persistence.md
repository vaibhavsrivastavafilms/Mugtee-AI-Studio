# Storyboard asset persistence

**Root cause:** Scene JSON stored ephemeral `imageUrl` / `storyboardImages[].url` values (external provider links or stale signed URLs) without a durable `assetPath`. Export pre-flight HEAD checks failed when those URLs expired, even though blobs still existed in `project-assets` storage.

**Fix:** Persist `assetPath` (Supabase storage object path) on each scene/storyboard frame. Refresh `imageUrl` at load (client) and export (server) via `refreshStoryboardUrl(assetPath)`. Export fails only when `assetPath` is missing or the storage object does not exist.
