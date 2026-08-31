import { NextRequest } from "next/server"
import { API_CONFIG } from "@/lib/config"

// GET /api/stream?url=https://aac.saavncdn.com/...
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")
  if (!url) {
    return new Response("Missing ?url= param", { status: 400 })
  }

  // Only allow proxying from JioSaavn CDN domains
  try {
    const parsed = new URL(url)
    const allowed = API_CONFIG.jiosaavn.allowedDomains
    if (!allowed.some((d) => parsed.hostname.endsWith(d.trim()))) {
      return new Response("Domain not allowed", { status: 403 })
    }
  } catch {
    return new Response("Invalid URL", { status: 400 })
  }

  const rangeHeader = req.headers.get("range")
  const fetchHeaders: Record<string, string> = {
    "User-Agent": API_CONFIG.jiosaavn.userAgent,
    Referer: API_CONFIG.jiosaavn.referer,
    Origin: API_CONFIG.jiosaavn.origin,
  }

  if (rangeHeader) {
    fetchHeaders["Range"] = rangeHeader
  }

  try {
    const res = await fetch(url, {
      headers: fetchHeaders,
    })

    if (!res.ok && res.status !== 206) {
      return new Response(`Upstream error: ${res.status}`, { status: res.status })
    }

    // Stream the response back to the client
    const contentType = res.headers.get("content-type") || "audio/mp4"
    const contentLength = res.headers.get("content-length")
    const contentRange = res.headers.get("content-range")
    const acceptRanges = res.headers.get("accept-ranges") || "bytes"

    const headers = new Headers({
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Accept-Ranges": acceptRanges,
      "Cache-Control": "public, max-age=86400",
    })

    if (contentLength) {
      headers.set("Content-Length", contentLength)
    }
    if (contentRange) {
      headers.set("Content-Range", contentRange)
    }

    return new Response(res.body, {
      status: res.status,
      headers,
    })
  } catch (err) {
    return new Response(`Stream error: ${err}`, { status: 500 })
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Origin, Content-Type, Accept",
      "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
    },
  })
}
