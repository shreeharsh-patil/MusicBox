import { API_CONFIG } from "@/lib/config"

export interface JioSaavnSong {
  id: string
  title: string
  album: string
  singers: string
  image: string
  duration: string
  streamUrl: string
  year: string
  language: string
}

export function formatDuration(seconds: string | number): string {
  const totalSeconds = typeof seconds === "string" ? parseInt(seconds, 10) : seconds
  if (isNaN(totalSeconds)) return "0:00"
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

/** Wrap a CDN URL through our local stream proxy if needed */
export function proxyStreamUrl(url: string): string {
  if (!url) return ""
  return `${API_CONFIG.client.streamUrl}?url=${encodeURIComponent(url)}`
}

export async function searchSongs(query: string): Promise<JioSaavnSong[]> {
  if (!query.trim()) return []

  try {
    const res = await fetch(`${API_CONFIG.client.searchUrl}?q=${encodeURIComponent(query)}`)
    if (!res.ok) return []
    const songs: JioSaavnSong[] = await res.json()
    return Array.isArray(songs) ? songs : []
  } catch {
    return []
  }
}

export async function getTrendingSongs(category = "trending"): Promise<JioSaavnSong[]> {
  try {
    const url = `${API_CONFIG.client.trendingUrl}?category=${encodeURIComponent(category)}`
    const res = await fetch(url)
    if (res.ok) {
      const data: JioSaavnSong[] = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        return data
      }
    }
    return await searchSongs("trending hindi songs")
  } catch {
    return await searchSongs("trending hindi songs")
  }
}

