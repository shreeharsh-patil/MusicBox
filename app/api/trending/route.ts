import { NextRequest, NextResponse } from "next/server"
import { decryptMediaUrl } from "@/lib/des"
import { decodeHtmlEntities } from "@/lib/utils"
import { API_CONFIG } from "@/lib/config"

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
    next: { revalidate: 1800 }, // Cache trending list for 30 minutes
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
      const artists = subtitle.split(" - ")[0]?.trim() || (mi.music as string) || (mi.singers as string) || ""

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

function parseSearchResults(data: unknown): SongResult[] {
  const d = data as { results?: Array<Record<string, unknown>> }
  const results = Array.isArray(d.results) ? d.results : []

  return results
    .filter((r) => {
      const mi = r.more_info as Record<string, unknown> | undefined
      return mi?.encrypted_media_url || mi?.vlink
    })
    .map((r) => {
      const mi = (r.more_info || {}) as Record<string, unknown>
      const subtitle = (r.subtitle as string) || ""
      const artists = subtitle.split(" - ")[0]?.trim() || (mi.music as string) || (mi.singers as string) || ""

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
}

// GET /api/trending?category=trending|superhits|bollywood|punjabi|romantic|indie
export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") || "trending"

  const commonParams = {
    api_version: API_CONFIG.jiosaavn.apiVersion,
    _format: "json",
    _marker: "0",
    cc: "in",
    includeMetaTags: "1",
    ctx: "web6dot0",
  }

  // Handle specific category charts
  if (category === "trending" || category === "all") {
    try {
      const params = new URLSearchParams({
        ...commonParams,
        __call: "playlist.getDetails",
        listid: API_CONFIG.jiosaavn.trendingChartId || "110858205",
        p: "1",
        n: "30",
      })
      const data = await fetchSaavn(params)
      const songs = parsePlaylistSongs(data)
      if (songs.length > 0 && songs.some((s) => s.streamUrl)) {
        return NextResponse.json(songs)
      }
    } catch (err) {
      console.warn("Trending chart failed:", err)
    }
  }

  if (category === "superhits") {
    try {
      const params = new URLSearchParams({
        ...commonParams,
        __call: "playlist.getDetails",
        listid: API_CONFIG.jiosaavn.superhitsChartId || "1134548194",
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
  }

  // Category query mapping for Indian music
  const queryMap: Record<string, string> = {
    bollywood: "Bollywood Hits 2024",
    punjabi: "Punjabi Hits Karan Aujla Diljit",
    romantic: "Arijit Singh Romantic Hits",
    indie: "Anuv Jain Prateek Kuhad Indian Indie",
    south: "South India Superhits",
    trending: "Trending Bollywood Hits",
  }

  const query = queryMap[category] || "Trending Bollywood Hits"

  try {
    const searchParams = new URLSearchParams({
      ...commonParams,
      __call: "search.getResults",
      q: query,
      song: "1",
      album: "0",
      artist: "0",
      playlist: "0",
      n: "30",
      p: "1",
    })
    const data = await fetchSaavn(searchParams)
    const songs = parseSearchResults(data)
    if (songs.length > 0) {
      return NextResponse.json(songs)
    }
  } catch (err) {
    console.warn("Trending search fallback failed:", err)
  }

  // Ultimate fallback
  try {
    const params = new URLSearchParams({
      ...commonParams,
      __call: "playlist.getDetails",
      listid: "110858205",
      p: "1",
      n: "20",
    })
    const data = await fetchSaavn(params)
    const songs = parsePlaylistSongs(data)
    return NextResponse.json(songs)
  } catch {
    return NextResponse.json([])
  }
}
