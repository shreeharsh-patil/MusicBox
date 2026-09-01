import { NextResponse } from "next/server"
import { decryptMediaUrl } from "@/lib/des"
import { decodeHtmlEntities } from "@/lib/utils"
import { API_CONFIG } from "@/lib/config"
import { fetchNepoTuneTrending } from "@/lib/nepotune"

interface SongResult {
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

async function fetchSaavn(params: URLSearchParams): Promise<unknown> {
  const res = await fetch(`${API_CONFIG.jiosaavn.apiUrl}?${params.toString()}`, {
    headers: { "User-Agent": API_CONFIG.jiosaavn.userAgent, Accept: "application/json" },
    next: { revalidate: 3600 }, // Cache trending list for 1 hour
  })
  if (!res.ok) throw new Error(`Saavn API ${res.status}`)
  return res.json()
}

function parsePlaylistSongs(data: unknown): SongResult[] {
  const d = data as { list?: Array<Record<string, unknown>> }
  const list = Array.isArray(d?.list) ? d.list : []

  return list
    .filter((s) => {
      const mi = s.more_info as Record<string, unknown> | undefined
      return mi?.encrypted_media_url || mi?.vlink
    })
    .map((s) => {
      const mi = (s.more_info || {}) as Record<string, unknown>
      const subtitle = (s.subtitle as string) || ""
      const artists = subtitle.split(" - ")[0]?.trim() || (mi.music as string) || ""

      let streamUrl = ""
      if (mi.encrypted_media_url) {
        streamUrl = decryptMediaUrl(mi.encrypted_media_url as string)
      }
      if (!streamUrl && mi.vlink) {
        streamUrl = mi.vlink as string
      }

      return {
        id: (s.id as string) || "",
        title: decodeHtmlEntities((s.title as string) || ""),
        album: decodeHtmlEntities((mi.album as string) || ""),
        singers: decodeHtmlEntities(artists),
        image: ((s.image as string) || "").replace("150x150", "500x500"),
        duration: (mi.duration as string) || "0",
        streamUrl,
        year: (s.year as string) || "",
        language: (s.language as string) || "",
      }
    })
}

// GET /api/trending - returns official live Trending Today playlist
export async function GET() {
  // 1. Try NepoTune API
  try {
    const nepotuneSongs = await fetchNepoTuneTrending()
    if (nepotuneSongs.length > 0 && nepotuneSongs.some((s) => s.streamUrl)) {
      return NextResponse.json(nepotuneSongs)
    }
  } catch {
    // fallback to JioSaavn upstream
  }

  const commonParams = {
    api_version: API_CONFIG.jiosaavn.apiVersion,
    _format: "json",
    _marker: "0",
    cc: "in",
    includeMetaTags: "1",
    ctx: "web6dot0",
  }

  // 2. Try official "Trending Today" chart
  try {
    const params = new URLSearchParams({
      ...commonParams,
      __call: "playlist.getDetails",
      listid: API_CONFIG.jiosaavn.trendingChartId,
      p: "1",
      n: "30",
    })
    const data = await fetchSaavn(params)
    const songs = parsePlaylistSongs(data)
    if (songs.length > 0 && songs.some((s) => s.streamUrl)) {
      return NextResponse.json(songs)
    }
  } catch (err) {
    console.warn("Trending chart fetch failed, trying Superhits chart:", err)
  }

  // 2. Fallback: Try "India Superhits Top 50"
  try {
    const params = new URLSearchParams({
      ...commonParams,
      __call: "playlist.getDetails",
      listid: API_CONFIG.jiosaavn.superhitsChartId,
      p: "1",
      n: "30",
    })
    const data = await fetchSaavn(params)
    const songs = parsePlaylistSongs(data)
    if (songs.length > 0 && songs.some((s) => s.streamUrl)) {
      return NextResponse.json(songs)
    }
  } catch (err) {
    console.warn("Superhits chart failed:", err)
  }

  // 3. Fallback: Search for "Trending Hindi"
  try {
    const searchParams = new URLSearchParams({
      ...commonParams,
      __call: "search.getResults",
      q: "Trending Hindi",
      song: "1",
      album: "0",
      artist: "0",
      playlist: "0",
      page: "1",
    })
    const data = await fetchSaavn(searchParams)
    const d = data as { results?: Array<Record<string, unknown>> }
    const results = Array.isArray(d.results) ? d.results : []
    const songs = results
      .filter((r) => {
        const mi = r.more_info as Record<string, unknown> | undefined
        return mi?.encrypted_media_url || mi?.vlink
      })
      .map((r) => {
        const mi = (r.more_info || {}) as Record<string, unknown>
        const subtitle = (r.subtitle as string) || ""
        const artists = subtitle.split(" - ")[0]?.trim() || (mi.music as string) || ""

        let streamUrl = ""
        if (mi.encrypted_media_url) {
          streamUrl = decryptMediaUrl(mi.encrypted_media_url as string)
        }
        if (!streamUrl && mi.vlink) {
          streamUrl = mi.vlink as string
        }

        return {
          id: (r.id as string) || "",
          title: decodeHtmlEntities((r.title as string) || ""),
          album: decodeHtmlEntities((mi.album as string) || ""),
          singers: decodeHtmlEntities(artists),
          image: ((r.image as string) || "").replace("150x150", "500x500"),
          duration: (mi.duration as string) || "0",
          streamUrl,
          year: (r.year as string) || "",
          language: (r.language as string) || "",
        }
      })

    return NextResponse.json(songs)
  } catch {
    return NextResponse.json([])
  }
}
