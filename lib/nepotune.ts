import { API_CONFIG } from "@/lib/config"
import { decodeHtmlEntities } from "@/lib/utils"
import type { JioSaavnSong } from "@/lib/jiosaavn"

interface NepoTuneImage {
  quality?: string
  url?: string
  link?: string
}

interface NepoTuneDownloadUrl {
  quality?: string
  url?: string
  link?: string
}

interface RawNepoTuneSong {
  id?: string | number
  name?: string
  title?: string
  album?: { name?: string; url?: string } | string
  year?: string | number
  duration?: string | number
  primaryArtists?: string
  singers?: string
  subtitle?: string
  artists?: {
    primary?: Array<{ id?: string; name?: string }>
    featured?: Array<{ id?: string; name?: string }>
    all?: Array<{ id?: string; name?: string }>
  }
  image?: NepoTuneImage[] | string
  downloadUrl?: NepoTuneDownloadUrl[] | string
  url?: string
  language?: string
}

export function parseNepoTuneSong(item: RawNepoTuneSong): JioSaavnSong {
  const title = decodeHtmlEntities(item.name || item.title || "")
  const albumName = typeof item.album === "object" ? item.album?.name || "" : item.album || ""
  const album = decodeHtmlEntities(albumName)

  let artists = item.primaryArtists || item.singers || item.subtitle || ""
  if (!artists && item.artists?.primary && Array.isArray(item.artists.primary)) {
    artists = item.artists.primary.map((a) => a.name).filter(Boolean).join(", ")
  }
  const singers = decodeHtmlEntities(artists)

  let image = "/music-1.jpg"
  if (Array.isArray(item.image) && item.image.length > 0) {
    const highest =
      item.image.find((i) => i.quality === "500x500") ||
      item.image.find((i) => i.quality === "350x350") ||
      item.image[item.image.length - 1]
    image = highest?.url || highest?.link || image
  } else if (typeof item.image === "string") {
    image = item.image.replace("150x150", "500x500")
  }

  let streamUrl = ""
  if (Array.isArray(item.downloadUrl) && item.downloadUrl.length > 0) {
    const highestAudio =
      item.downloadUrl.find((d) => d.quality === "320kbps") ||
      item.downloadUrl.find((d) => d.quality === "160kbps") ||
      item.downloadUrl[item.downloadUrl.length - 1]
    streamUrl = highestAudio?.url || highestAudio?.link || ""
  } else if (typeof item.downloadUrl === "string") {
    streamUrl = item.downloadUrl
  }

  return {
    id: String(item.id || ""),
    title,
    album,
    singers,
    image,
    duration: String(item.duration || "0"),
    streamUrl,
    year: String(item.year || ""),
    language: String(item.language || ""),
  }
}

/** Fetch songs using NepoTune API */
export async function fetchNepoTuneSearch(query: string): Promise<JioSaavnSong[]> {
  if (!query.trim()) return []

  const base = API_CONFIG.nepotune.apiUrl.replace(/\/+$/, "")
  const endpoints = [
    `${base}/api/search/songs?query=${encodeURIComponent(query)}`,
    `${base}/api/search?query=${encodeURIComponent(query)}`,
  ]

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(1500),
      })
      if (res.status === 402 || res.status === 404) {
        break // Hosted instance unavailable, fast fallback
      }
      if (!res.ok) continue
      const json = await res.json()
      const rawList: RawNepoTuneSong[] =
        json.data?.results || json.data || (Array.isArray(json) ? json : [])

      if (Array.isArray(rawList) && rawList.length > 0) {
        return rawList.map(parseNepoTuneSong).filter((s) => s.title && (s.streamUrl || s.id))
      }
    } catch {
      break // network or timeout, fast fallback
    }
  }

  return []
}

/** Fetch trending songs using NepoTune API */
export async function fetchNepoTuneTrending(): Promise<JioSaavnSong[]> {
  const base = API_CONFIG.nepotune.apiUrl.replace(/\/+$/, "")
  const endpoints = [
    `${base}/api/modules?language=hindi,english`,
    `${base}/api/playlists?id=${API_CONFIG.jiosaavn.trendingChartId}`,
  ]

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(1500),
      })
      if (res.status === 402 || res.status === 404) {
        break // Hosted instance unavailable, fast fallback
      }
      if (!res.ok) continue
      const json = await res.json()
      const rawList: RawNepoTuneSong[] =
        json.data?.trending?.songs ||
        json.data?.songs ||
        json.data?.results ||
        (Array.isArray(json.data) ? json.data : [])

      if (Array.isArray(rawList) && rawList.length > 0) {
        return rawList.map(parseNepoTuneSong).filter((s) => s.title && (s.streamUrl || s.id))
      }
    } catch {
      break // fast fallback
    }
  }

  return []
}
