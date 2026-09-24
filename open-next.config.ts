import { defineCloudflareConfig } from '@opennextjs/cloudflare'

// Phase 0: Standard-Konfiguration. Incremental-Cache/KV kommt später, wenn wir echte
// Routen deployen. Für's Erste reicht die Default-Konfiguration.
export default defineCloudflareConfig({})
