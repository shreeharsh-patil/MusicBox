// Centralized application & API configuration from environment variables (.env)

export const API_CONFIG = {
  // NepoTune API (Primary wrapper for JioSaavn content)
  nepotune: {
    apiUrl: process.env.NEPOTUNE_API_URL || "https://nepotuneapi.vercel.app",
  },

  // Server-side JioSaavn API config (Direct upstream fallback)
  jiosaavn: {
    apiUrl: process.env.JIOSAAVN_API_URL || "https://www.jiosaavn.com/api.php",
    apiVersion: process.env.JIOSAAVN_API_VERSION || "4",
    desKey: process.env.JIOSAAVN_DES_KEY || "38346591",
    referer: process.env.JIOSAAVN_REFERER || "https://www.jiosaavn.com/",
    origin: process.env.JIOSAAVN_ORIGIN || "https://www.jiosaavn.com",
    userAgent:
      process.env.JIOSAAVN_USER_AGENT ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    allowedDomains: (process.env.JIOSAAVN_ALLOWED_DOMAINS || "aac.saavncdn.com,c.saavncdn.com,saavncdn.com,jiotunepreview.jio.com").split(","),
    trendingChartId: process.env.JIOSAAVN_TRENDING_CHART_ID || "110858205",
    superhitsChartId: process.env.JIOSAAVN_SUPERHITS_CHART_ID || "1134548194",
  },

  // Server-side LRCLIB Lyrics API config
  lrclib: {
    apiUrl: process.env.LRCLIB_API_URL || "https://lrclib.net/api",
    userAgent: process.env.LRCLIB_USER_AGENT || "Harmonia/1.0 (https://github.com/harmonia)",
  },

  // Client-side Next.js route endpoints (NEXT_PUBLIC_*)
  client: {
    searchUrl: process.env.NEXT_PUBLIC_API_SEARCH_URL || "/api/search",
    trendingUrl: process.env.NEXT_PUBLIC_API_TRENDING_URL || "/api/trending",
    streamUrl: process.env.NEXT_PUBLIC_API_STREAM_URL || "/api/stream",
    lyricsUrl: process.env.NEXT_PUBLIC_API_LYRICS_URL || "/api/lyrics",
    appName: process.env.NEXT_PUBLIC_APP_NAME || "Harmonia",
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  },
}
