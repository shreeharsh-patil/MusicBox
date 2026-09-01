import { NextRequest, NextResponse } from "next/server"
import { decryptMediaUrl } from "@/lib/des"
import { decodeHtmlEntities } from "@/lib/utils"
import { API_CONFIG } from "@/lib/config"
import { fetchNepoTuneSearch } from "@/lib/nepotune"

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
  const res = await fetch(`${API_CONFIG.jiosaavn.apiUrl}?${params}`, {
    headers: { "User-Agent": API_CONFIG.jiosaavn.userAgent, Accept: "application/json" },
  })
  if (!res.ok) throw new Error(`Saavn API ${res.status}`)
  return res.json()
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
      const artists = subtitle.split(" - ")[0]?.trim() || (mi.music as string) || ""

      // Try DES decrypt for 320kbps, fallback to vlink
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

function parseAutocompleteResults(data: unknown): SongResult[] {
  const d = data as { songs?: { data?: Array<Record<string, unknown>> } }
  const songs = d?.songs?.data || []

  return songs
    .filter((s) => {
      const mi = s.more_info as Record<string, unknown> | undefined
      return mi?.vlink
    })
    .map((s) => {
      const mi = (s.more_info || {}) as Record<string, unknown>
      return {
        id: (s.id as string) || "",
        title: decodeHtmlEntities((s.title as string) || ""),
        album: decodeHtmlEntities((s.description as string) || ""),
        singers: decodeHtmlEntities((mi.singers as string) || (mi.primary_artists as string) || ""),
        image: (s.image as string) || "",
        duration: (mi.song_duration as string) || "0",
        streamUrl: (mi.vlink as string) || "",
        year: (mi.year as string) || "",
        language: (mi.language as string) || "",
      }
    })
}

// GET /api/search?q=tum+hi+ho
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")
  if (!q) {
    return NextResponse.json({ error: "Missing ?q= param" }, { status: 400 })
  }

  // 1) Try NepoTune API
  try {
    const nepotuneSongs = await fetchNepoTuneSearch(q)
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

  try {
    // 2) Fallback to search.getResults
    const searchParams = new URLSearchParams({
      ...commonParams,
      __call: "search.getResults",
      q,
      song: "1",
      album: "0",
      artist: "0",
      playlist: "0",
      page: "1",
    })
    const data = await fetchSaavn(searchParams)
    const songs = parseSearchResults(data)
    if (songs.length > 0 && songs.some((s) => s.streamUrl)) {
      return NextResponse.json(songs)
    }
  } catch {
    // fall through to autocomplete
  }

  try {
    // 2) Fallback: autocomplete.get
    const autoParams = new URLSearchParams({
      ...commonParams,
      __call: "autocomplete.get",
      query: q,
      song: "1",
      album: "0",
      artist: "0",
      playlist: "0",
    })
    const data = await fetchSaavn(autoParams)
    const songs = parseAutocompleteResults(data)
    if (songs.length > 0) {
      return NextResponse.json(songs)
    }
  } catch {
    // fall through
  }

  return NextResponse.json([])
}
