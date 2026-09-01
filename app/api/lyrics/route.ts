import { NextRequest, NextResponse } from "next/server"
import { API_CONFIG } from "@/lib/config"

// GET /api/lyrics?track=...&artist=...&album=...&duration=...
export async function GET(req: NextRequest) {
  const track = req.nextUrl.searchParams.get("track")
  const artist = req.nextUrl.searchParams.get("artist")
  const album = req.nextUrl.searchParams.get("album")
  const duration = req.nextUrl.searchParams.get("duration")

  if (!track) {
    return NextResponse.json({ error: "Missing ?track= param" }, { status: 400 })
  }

  // Clean track and artist strings for much better match rate
  const cleanTrack = track
    .replace(/\s*[\(\[\{].*?[\)\]\}]/g, "")
    .replace(/feat\..*$/i, "")
    .replace(/ft\..*$/i, "")
    .trim()

  const cleanArtist = artist
    ? artist.split(",")[0].split("&")[0].split("/")[0].trim()
    : ""

  const cleanAlbum = album
    ? album.replace(/\s*[\(\[\{].*?[\)\]\}]/g, "").trim()
    : ""

  const tryFetch = async (t: string, a?: string, alb?: string) => {
    try {
      const params = new URLSearchParams()
      params.set("track_name", t)
      if (a) params.set("artist_name", a)
      if (alb) params.set("album_name", alb)
      if (duration) params.set("duration", String(Math.round(Number(duration))))

      const res = await fetch(`${API_CONFIG.lrclib.apiUrl}/get?${params}`, {
        headers: { "User-Agent": API_CONFIG.lrclib.userAgent },
      })
      if (res.ok) {
        return await res.json()
      }
      return null
    } catch {
      return null
    }
  }

  const trySearch = async (query: string) => {
    try {
      const searchParams = new URLSearchParams({ q: query })
      const res = await fetch(`${API_CONFIG.lrclib.apiUrl}/search?${searchParams}`, {
        headers: { "User-Agent": API_CONFIG.lrclib.userAgent },
      })
      if (res.ok) {
        const results = await res.json()
        if (Array.isArray(results) && results.length > 0) {
          return results[0]
        }
      }
      return null
    } catch {
      return null
    }
  }

  try {
    // 1. Try exact cleaned track + artist + album
    let data = await tryFetch(cleanTrack, cleanArtist, cleanAlbum)
    if (data) return NextResponse.json(data)

    // 2. Try cleaned track + artist
    if (cleanArtist) {
      data = await tryFetch(cleanTrack, cleanArtist)
      if (data) return NextResponse.json(data)
    }

    // 3. Try search query (track + artist)
    const searchQuery = cleanArtist ? `${cleanTrack} ${cleanArtist}` : cleanTrack
    data = await trySearch(searchQuery)
    if (data) return NextResponse.json(data)

    // 4. Try raw original track title search
    if (cleanTrack !== track) {
      data = await trySearch(track)
      if (data) return NextResponse.json(data)
    }

    return NextResponse.json(null)
  } catch {
    return NextResponse.json(null)
  }
}
