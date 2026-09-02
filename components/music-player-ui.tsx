"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Star,
  Music2,
  Search,
  X,
  Loader2,
  ListMusic,
  Disc3,
  Github,
} from "lucide-react"
import { motion } from "motion/react"
import { searchSongs, getTrendingSongs, formatDuration, type JioSaavnSong } from "@/lib/jiosaavn"
import { API_CONFIG } from "@/lib/config"

export interface PlaylistItem {
  id: string
  title: string
  artist: string
  duration: string
  cover: string
  streamUrl: string
  raw?: JioSaavnSong
}

// Indian Trending Categories
const TREND_CATEGORIES = [
  { id: "trending", label: "Trending India", emoji: "🔥" },
  { id: "superhits", label: "Superhits Top 50", emoji: "⚡" },
  { id: "bollywood", label: "Bollywood Hits", emoji: "🎬" },
  { id: "romantic", label: "Arijit & Romantic", emoji: "💖" },
  { id: "punjabi", label: "Punjabi Beats", emoji: "🕺" },
  { id: "indie", label: "Indian Indie", emoji: "🎸" },
]

// Authentic initial Indian trending playlist fallback
const INITIAL_PLAYLIST: PlaylistItem[] = [
  {
    id: "1",
    title: "Saathiya",
    artist: "Darshan Raval",
    duration: "3:12",
    cover: "https://c.saavncdn.com/694/Saathiya-Hindi-2026-20260220193432-500x500.jpg",
    streamUrl: "https://aac.saavncdn.com/694/de6cea5703ff195d00a96e70b9ff7018_320.mp4",
  },
  {
    id: "2",
    title: "Aayi Nai",
    artist: "Sachin-Jigar, Pawan Singh, Divya Kumar",
    duration: "2:58",
    cover: "https://c.saavncdn.com/373/Stree-2-Hindi-2024-20240828083834-500x500.jpg",
    streamUrl: "https://aac.saavncdn.com/373/9a3ad2173b2e80bc6f9655d1da7c8f27_320.mp4",
  },
  {
    id: "3",
    title: "Balam Pichkari",
    artist: "Pritam, Vishal Dadlani, Shalmali",
    duration: "4:49",
    cover: "https://c.saavncdn.com/440/Yeh-Jawaani-Hai-Deewani-2013-500x500.jpg",
    streamUrl: "https://aac.saavncdn.com/440/402182e33ef81008a8aecbdd57886c4c_320.mp4",
  },
  {
    id: "4",
    title: "Gehra Hua",
    artist: "Arijit Singh, Shashwat Sachdev",
    duration: "3:40",
    cover: "https://c.saavncdn.com/475/Dhurandhar-Hindi-2025-20260203083204-500x500.jpg",
    streamUrl: "https://aac.saavncdn.com/475/87e1f440b8537651a511e6191b72b834_320.mp4",
  },
  {
    id: "5",
    title: "Apna Bana Le",
    artist: "Arijit Singh, Sachin-Jigar",
    duration: "4:21",
    cover: "https://c.saavncdn.com/815/Bhediya-Hindi-2023-20230713144807-500x500.jpg",
    streamUrl: "",
  },
  {
    id: "6",
    title: "Soulmate",
    artist: "Badshah, Arijit Singh",
    duration: "3:33",
    cover: "https://c.saavncdn.com/469/Ek-Tha-Raja-Hindi-2024-20240315183818-500x500.jpg",
    streamUrl: "",
  },
  {
    id: "7",
    title: "G.O.A.T.",
    artist: "Diljit Dosanjh",
    duration: "3:43",
    cover: "https://c.saavncdn.com/467/G-O-A-T-Punjabi-2020-20200729181156-500x500.jpg",
    streamUrl: "",
  },
]

export default function MusicPlayerUI() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(25)
  const [isDragging, setIsDragging] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [playlist, setPlaylist] = useState<PlaylistItem[]>(INITIAL_PLAYLIST)
  const [trendingPlaylist, setTrendingPlaylist] = useState<PlaylistItem[]>(INITIAL_PLAYLIST)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentTime, setCurrentTime] = useState(61)
  const [duration, setDuration] = useState(156)
  const [isRepeatOne, setIsRepeatOne] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  // Indian Trend Category & View States
  const [selectedCategory, setSelectedCategory] = useState("trending")
  const [isLoadingCategory, setIsLoadingCategory] = useState(false)
  const [mobileTab, setMobileTab] = useState<"player" | "playlist">("player")

  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  const modalRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const playlistRef = useRef<PlaylistItem[]>(playlist)
  const currentIndexRef = useRef<number>(currentIndex)
  const isRepeatOneRef = useRef<boolean>(isRepeatOne)

  useEffect(() => {
    playlistRef.current = playlist
  }, [playlist])

  useEffect(() => {
    currentIndexRef.current = currentIndex
  }, [currentIndex])

  useEffect(() => {
    isRepeatOneRef.current = isRepeatOne
  }, [isRepeatOne])

  const currentSong = playlist[currentIndex] || playlist[0]

  // Play audio safely
  const playTrack = useCallback(async (song: PlaylistItem | null, shouldPlay = true) => {
    if (!audioRef.current || !song) return

    if (!song.streamUrl) {
      if (shouldPlay) setIsPlaying(true)
      return
    }

    try {
      if (audioRef.current.src !== song.streamUrl) {
        audioRef.current.src = song.streamUrl
      }
      if (shouldPlay) {
        await audioRef.current.play()
        setIsPlaying(true)
      }
    } catch {
      if (!song.streamUrl.startsWith(API_CONFIG.client.streamUrl) && song.streamUrl.startsWith("http")) {
        try {
          const proxied = `${API_CONFIG.client.streamUrl}?url=${encodeURIComponent(song.streamUrl)}`
          if (audioRef.current) {
            audioRef.current.src = proxied
            if (shouldPlay) {
              await audioRef.current.play()
              setIsPlaying(true)
              return
            }
          }
        } catch {
          // proxy failed
        }
      }
      setIsPlaying(false)
    }
  }, [])

  // Audio setup
  useEffect(() => {
    const audio = new Audio()
    audio.preload = "auto"
    audio.volume = 0.8
    audioRef.current = audio

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        setProgress((audio.currentTime / audio.duration) * 100)
      }
    }

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration)
      }
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    const handleEnded = () => {
      if (isRepeatOneRef.current) {
        audio.currentTime = 0
        audio.play().catch(() => {})
        return
      }
      const list = playlistRef.current
      const curr = currentIndexRef.current
      if (list.length > 0) {
        const nextIdx = (curr + 1) % list.length
        setCurrentIndex(nextIdx)
        const nextSong = list[nextIdx]
        if (nextSong?.streamUrl) {
          audio.src = nextSong.streamUrl
          audio.play().catch(() => {})
        }
      } else {
        setIsPlaying(false)
      }
    }

    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
      audio.removeEventListener("ended", handleEnded)
      audio.pause()
      audio.src = ""
    }
  }, [])

  // Load trending songs by category in India
  const loadTrending = useCallback(async (cat = selectedCategory) => {
    setIsLoadingCategory(true)
    try {
      const songs = await getTrendingSongs(cat)
      if (songs && songs.length > 0) {
        const items: PlaylistItem[] = songs.map((s) => ({
          id: s.id,
          title: s.title,
          artist: s.singers,
          duration: formatDuration(s.duration),
          cover: s.image || "/music-1.jpg",
          streamUrl: s.streamUrl,
          raw: s,
        }))
        setPlaylist(items)
        setTrendingPlaylist(items)
        if (audioRef.current && items[0]?.streamUrl && !audioRef.current.src) {
          audioRef.current.src = items[0].streamUrl
        }
      }
    } catch (err) {
      console.warn("Trending fallback:", err)
    } finally {
      setIsLoadingCategory(false)
    }
  }, [selectedCategory])

  useEffect(() => {
    loadTrending("trending")
  }, [loadTrending])

  const handleCategorySelect = async (catId: string) => {
    setSelectedCategory(catId)
    setSearchQuery("")
    await loadTrending(catId)
  }

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setIsSearching(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await searchSongs(searchQuery)
        if (results && results.length > 0) {
          const items: PlaylistItem[] = results.map((s) => ({
            id: s.id,
            title: s.title,
            artist: s.singers,
            duration: formatDuration(s.duration),
            cover: s.image || "/music-1.jpg",
            streamUrl: s.streamUrl,
            raw: s,
          }))
          setPlaylist(items)
        } else {
          setPlaylist([])
        }
      } catch (err) {
        console.warn("Search error:", err)
      } finally {
        setIsSearching(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Mouse move glass distortion physics
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!modalRef.current) return
      const rect = modalRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      setMousePos({ x, y })

      const filter = document.querySelector("#glass-distortion feDisplacementMap")
      if (filter) {
        const scaleX = (x / rect.width) * 100
        const scaleY = (y / rect.height) * 100
        filter.setAttribute("scale", String(Math.min(scaleX, scaleY) + 20))
      }
    }

    const handleMouseLeave = () => {
      const filter = document.querySelector("#glass-distortion feDisplacementMap")
      if (filter) {
        filter.setAttribute("scale", "77")
      }
    }

    const modal = modalRef.current
    if (modal) {
      modal.addEventListener("mousemove", handleMouseMove)
      modal.addEventListener("mouseleave", handleMouseLeave)
      return () => {
        modal.removeEventListener("mousemove", handleMouseMove)
        modal.removeEventListener("mouseleave", handleMouseLeave)
      }
    }
  }, [])

  // Touch & Mouse Progress Bar updates
  const updateProgressFromEvent = (ref: React.RefObject<HTMLDivElement | null>, clientX: number) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    if (rect.width <= 0) return
    const x = clientX - rect.left
    const percentage = (x / rect.width) * 100
    const clamped = Math.max(0, Math.min(100, percentage))
    setProgress(clamped)

    if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
      const targetTime = (clamped / 100) * audioRef.current.duration
      audioRef.current.currentTime = targetTime
      setCurrentTime(targetTime)
    }
  }

  const togglePlay = useCallback(async () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      if (!audioRef.current.src && currentSong?.streamUrl) {
        await playTrack(currentSong, true)
      } else {
        try {
          await audioRef.current.play()
          setIsPlaying(true)
        } catch {
          await playTrack(currentSong, true)
        }
      }
    }
  }, [isPlaying, currentSong, playTrack])

  const playNext = useCallback(() => {
    if (playlist.length === 0) return
    const nextIdx = (currentIndex + 1) % playlist.length
    setCurrentIndex(nextIdx)
    playTrack(playlist[nextIdx], true)
  }, [playlist, currentIndex, playTrack])

  const playPrev = useCallback(() => {
    if (playlist.length === 0) return
    const prevIdx = (currentIndex - 1 + playlist.length) % playlist.length
    setCurrentIndex(prevIdx)
    playTrack(playlist[prevIdx], true)
  }, [playlist, currentIndex, playTrack])

  const selectSong = useCallback(
    (index: number) => {
      if (index < 0 || index >= playlist.length) return
      setCurrentIndex(index)
      playTrack(playlist[index], true)
    },
    [playlist, playTrack]
  )

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formattedCurrentTime = duration > 0 ? formatTime(currentTime) : "0:00"
  const formattedRemainingTime =
    duration > 0 ? `-${formatTime(Math.max(0, duration - currentTime))}` : "0:00"

  return (
    <>
      {/* SVG Filter for Glass Distortion */}
      <svg
        className="sr-only pointer-events-none absolute w-0 h-0 overflow-hidden"
        aria-hidden="true"
        style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}
      >
        <filter id="glass-distortion">
          <feTurbulence type="turbulence" baseFrequency="0.008" numOctaves="2" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="77" />
        </filter>
      </svg>

      <motion.div
        ref={modalRef}
        className="glass-card relative w-full max-w-4xl h-[92dvh] max-h-[850px] min-h-[520px] md:h-[550px] lg:h-[580px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 15,
          duration: 0.5,
        }}
      >
        {/* Glass Filter Layer */}
        <div className="glass-filter" />

        {/* Glass Distortion Overlay */}
        <div className="glass-distortion-overlay" />

        {/* Glass Overlay */}
        <div className="glass-overlay" />

        {/* Glass Specular highlight follows mouse on desktop */}
        <div
          className="glass-specular hidden sm:block"
          style={{
            background: `radial-gradient(
              circle at ${mousePos.x}px ${mousePos.y}px,
              rgba(255,255,255,0.15) 0%,
              rgba(255,255,255,0.05) 30%,
              rgba(255,255,255,0) 60%
            )`,
          }}
        />

        {/* Main Content Container */}
        <div className="glass-content relative z-[4] p-3.5 sm:p-5 md:p-7 h-full flex flex-col min-h-0">
          {/* Top Bar: Brand Logo + Search + GitHub Link */}
          <div className="flex items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4 flex-shrink-0">
            {/* Logo */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="p-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                <Music2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight font-sans">
                {API_CONFIG.client.appName || "Harmonia"}
              </span>
            </div>

            {/* Right Side: Search Bar + GitHub Repo Link */}
            <div className="flex items-center gap-2 flex-1 justify-end max-w-[240px] xs:max-w-[280px] sm:max-w-sm">
              {/* Search Bar */}
              <div className="relative flex-1">
                <div className="relative flex items-center bg-white/10 hover:bg-white/15 focus-within:bg-white/20 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/20 focus-within:border-white/40 transition-all shadow-inner">
                  <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/70 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search songs..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      if (e.target.value && mobileTab !== "playlist") {
                        setMobileTab("playlist")
                      }
                    }}
                    className="bg-transparent text-xs text-white placeholder-white/50 outline-none w-full pr-5"
                  />
                  {isSearching ? (
                    <Loader2 className="w-3.5 h-3.5 text-white/70 animate-spin absolute right-2.5" />
                  ) : searchQuery ? (
                    <button
                      onClick={() => {
                        setSearchQuery("")
                        if (trendingPlaylist.length > 0) {
                          setPlaylist(trendingPlaylist)
                        } else {
                          loadTrending()
                        }
                      }}
                      className="text-white/60 hover:text-white absolute right-2.5 cursor-pointer p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>

              {/* GitHub Link */}
              <motion.a
                href="https://github.com/shreeharsh-patil/MusicBox"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 backdrop-blur-md border border-white/20 text-white/80 hover:text-white transition-all shadow-sm flex-shrink-0 flex items-center justify-center cursor-pointer"
                whileHover={{ scale: 1.1, rotate: 6 }}
                whileTap={{ scale: 0.92 }}
                title="View GitHub Repository"
                aria-label="GitHub Repository"
              >
                <Github className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white" />
              </motion.a>
            </div>
          </div>

          {/* Mobile Segmented Tab Switcher (Visible on small screens < md) */}
          <div className="flex md:hidden items-center justify-between p-1 bg-white/10 backdrop-blur-md rounded-xl mb-3 flex-shrink-0 border border-white/15">
            <button
              onClick={() => setMobileTab("player")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                mobileTab === "player"
                  ? "bg-white text-black shadow-md font-bold"
                  : "text-white/75 hover:text-white"
              }`}
            >
              <Disc3 className={`w-3.5 h-3.5 ${isPlaying && mobileTab === "player" ? "animate-spin" : ""}`} />
              <span>Now Playing</span>
            </button>
            <button
              onClick={() => setMobileTab("playlist")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                mobileTab === "playlist"
                  ? "bg-white text-black shadow-md font-bold"
                  : "text-white/75 hover:text-white"
              }`}
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span>Queue ({playlist.length})</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col md:flex-row md:gap-6 lg:gap-8">
            {/* LEFT / NOW PLAYING SECTION */}
            <div
              className={`flex-col justify-between flex-1 md:flex-initial md:w-[290px] lg:w-[320px] min-h-0 ${
                mobileTab === "player" ? "flex" : "hidden md:flex"
              }`}
            >
              {/* Album Art Container */}
              <div className="flex-1 flex items-center justify-center min-h-0 py-1">
                <motion.div
                  className="bg-black/40 rounded-2xl p-2.5 sm:p-3 backdrop-blur-sm w-full max-w-[210px] xs:max-w-[240px] sm:max-w-[270px] md:max-w-full shadow-lg border border-white/10 relative group"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 120,
                    damping: 14,
                    delay: 0.1,
                  }}
                >
                  <motion.img
                    key={currentSong?.id || "art"}
                    src={currentSong?.cover || "/music-1.jpg"}
                    alt={currentSong?.title || "Album Art"}
                    className="w-full aspect-square object-cover rounded-xl shadow-md"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35 }}
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = "/music-1.jpg"
                    }}
                  />
                  {/* Subtle live pulsating glow when playing */}
                  {isPlaying && (
                    <div className="absolute inset-0 rounded-2xl ring-2 ring-white/30 animate-pulse pointer-events-none" />
                  )}
                </motion.div>
              </div>

              {/* Player Controls Panel */}
              <motion.div
                className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 mt-2 sm:mt-3 border border-white/15 shadow-xl flex-shrink-0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 100,
                  damping: 15,
                  delay: 0.2,
                }}
              >
                {/* Song Info */}
                <div className="text-white mb-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm sm:text-base truncate leading-tight">
                      {currentSong?.title || "Harmonia Track"}
                    </h3>
                    <p className="text-xs text-white/70 truncate mt-0.5 font-medium">
                      {currentSong?.artist || "Unknown Artist"}
                    </p>
                  </div>
                  <motion.button
                    onClick={() => currentSong && toggleFavorite(currentSong.id)}
                    className="text-white p-1 rounded-full hover:bg-white/10 cursor-pointer flex-shrink-0"
                    whileHover={{ scale: 1.15, rotate: 12 }}
                    whileTap={{ scale: 0.9 }}
                    aria-label="Favorite"
                  >
                    <Star
                      className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${
                        currentSong && favorites.has(currentSong.id)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-white/70 hover:text-white"
                      }`}
                    />
                  </motion.button>
                </div>

                {/* Progress Bar (Touch & Mouse Draggable) */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-white/80 text-[11px] font-mono w-8 text-left">
                    {formattedCurrentTime}
                  </span>
                  <div
                    ref={progressRef}
                    className="flex-1 h-3 flex items-center cursor-pointer relative group touch-none select-none"
                    onClick={(e) => updateProgressFromEvent(progressRef, e.clientX)}
                    onMouseDown={(e) => {
                      setIsDragging(true)
                      updateProgressFromEvent(progressRef, e.clientX)
                    }}
                    onMouseMove={(e) => {
                      if (isDragging) updateProgressFromEvent(progressRef, e.clientX)
                    }}
                    onMouseUp={() => setIsDragging(false)}
                    onMouseLeave={() => setIsDragging(false)}
                    onTouchStart={(e) => {
                      setIsDragging(true)
                      if (e.touches[0]) updateProgressFromEvent(progressRef, e.touches[0].clientX)
                    }}
                    onTouchMove={(e) => {
                      if (isDragging && e.touches[0])
                        updateProgressFromEvent(progressRef, e.touches[0].clientX)
                    }}
                    onTouchEnd={() => setIsDragging(false)}
                  >
                    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {/* Scrub Thumb */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md border border-black/10 transition-transform group-hover:scale-125"
                      style={{ left: `${progress}%`, transform: "translate(-50%, -50%)" }}
                    />
                  </div>
                  <span className="text-white/80 text-[11px] font-mono w-8 text-right">
                    {formattedRemainingTime}
                  </span>
                </div>

                {/* Playback Control Buttons */}
                <div className="flex items-center justify-between px-1">
                  <motion.button
                    onClick={() => setIsRepeatOne((prev) => !prev)}
                    className={`p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer ${
                      isRepeatOne ? "text-green-400 bg-white/10" : "text-white/70 hover:text-white"
                    }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title={isRepeatOne ? "Repeat One Enabled" : "Repeat All"}
                    aria-label="Repeat mode"
                  >
                    <Repeat className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </motion.button>

                  <div className="flex items-center gap-2 sm:gap-3">
                    <motion.button
                      onClick={playPrev}
                      className="text-white/90 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all cursor-pointer"
                      whileHover={{ scale: 1.1, x: -2 }}
                      whileTap={{ scale: 0.9 }}
                      aria-label="Previous Track"
                    >
                      <SkipBack className="w-5 h-5 sm:w-5 sm:h-5" />
                    </motion.button>

                    <motion.button
                      onClick={togglePlay}
                      className="bg-white text-black rounded-full p-3 shadow-lg hover:bg-white/90 transition-transform cursor-pointer flex items-center justify-center"
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      aria-label={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 fill-black" />
                      ) : (
                        <Play className="w-5 h-5 fill-black ml-0.5" />
                      )}
                    </motion.button>

                    <motion.button
                      onClick={playNext}
                      className="text-white/90 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all cursor-pointer"
                      whileHover={{ scale: 1.1, x: 2 }}
                      whileTap={{ scale: 0.9 }}
                      aria-label="Next Track"
                    >
                      <SkipForward className="w-5 h-5 sm:w-5 sm:h-5" />
                    </motion.button>
                  </div>

                  {/* View queue shortcut for mobile or extra options */}
                  <motion.button
                    onClick={() => setMobileTab("playlist")}
                    className="md:hidden text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 cursor-pointer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="View Queue"
                    aria-label="View Queue"
                  >
                    <ListMusic className="w-4 h-4" />
                  </motion.button>

                  <div className="hidden md:block w-8" />
                </div>
              </motion.div>
            </div>

            {/* RIGHT / PLAYLIST SECTION */}
            <div
              className={`flex-1 min-w-0 flex-col overflow-hidden ${
                mobileTab === "playlist" ? "flex" : "hidden md:flex"
              }`}
            >
              {/* Header / Search results banner */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/15 flex-shrink-0">
                <div className="flex items-center text-xs text-white/90 font-semibold truncate">
                  <span className="truncate">
                    {searchQuery
                      ? `Search: "${searchQuery}" (${playlist.length})`
                      : `${TREND_CATEGORIES.find((c) => c.id === selectedCategory)?.label || "Trending India"} (${playlist.length})`}
                  </span>
                </div>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("")
                      if (trendingPlaylist.length > 0) setPlaylist(trendingPlaylist)
                    }}
                    className="text-[11px] text-white/80 hover:text-white underline cursor-pointer flex-shrink-0 ml-2"
                  >
                    Clear Search
                  </button>
                )}
              </div>

              {/* Quick India Trend Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-thin flex-shrink-0">
                {TREND_CATEGORIES.map((cat) => {
                  const isActive = selectedCategory === cat.id && !searchQuery
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                        isActive
                          ? "bg-white text-black font-bold shadow-md scale-[1.02]"
                          : "bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10"
                      }`}
                    >
                      <span>{cat.emoji}</span>
                      <span>{cat.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Scrollable Song List */}
              <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 scrollbar-thin space-y-1.5 sm:space-y-2 min-h-0">
                {isLoadingCategory ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/70 gap-2">
                    <Loader2 className="w-7 h-7 animate-spin text-white" />
                    <p className="text-xs font-medium">Fetching trending songs in India...</p>
                  </div>
                ) : playlist.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/60">
                    <Music2 className="w-10 h-10 mb-2 opacity-50" />
                    <p className="text-sm">No tracks found</p>
                    <p className="text-xs text-white/40 mt-1">Try searching for a different song or artist</p>
                  </div>
                ) : (
                  playlist.map((song, index) => {
                    const isCurrent = index === currentIndex
                    return (
                      <motion.div
                        key={`${song.id}-${index}`}
                        className={`flex items-center gap-2.5 sm:gap-3 p-2 sm:p-2.5 rounded-xl transition-all cursor-pointer group ${
                          isCurrent
                            ? "bg-white/25 shadow-md border border-white/30 backdrop-blur-sm"
                            : "hover:bg-white/10 active:bg-white/15 border border-transparent"
                        }`}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 120,
                          damping: 15,
                          delay: Math.min(0.3, index * 0.03),
                        }}
                        whileHover={{ scale: 1.01, x: 3 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          selectSong(index)
                        }}
                      >
                        {/* Song Cover Thumbnail */}
                        <div className="relative flex-shrink-0">
                          <motion.img
                            src={song.cover || "/placeholder.svg"}
                            alt={song.title}
                            className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg object-cover shadow-sm"
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).src = "/music-1.jpg"
                            }}
                          />
                          {isCurrent && isPlaying && (
                            <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                            </div>
                          )}
                        </div>

                        {/* Song Title & Artist */}
                        <div className="flex-1 min-w-0">
                          <h4
                            className={`text-xs sm:text-sm font-semibold truncate ${
                              isCurrent ? "text-white font-bold" : "text-white/95"
                            }`}
                          >
                            {song.title}
                          </h4>
                          <p className="text-[11px] sm:text-xs text-white/70 truncate mt-0.5">
                            {song.artist}
                          </p>
                        </div>

                        {/* Duration */}
                        <span className="text-white/75 text-xs font-mono font-medium flex-shrink-0 pl-1">
                          {song.duration}
                        </span>
                      </motion.div>
                    )
                  })
                )}
              </div>

              {/* Mobile Docked Mini-Player Bar (When viewing playlist on phone) */}
              <div className="md:hidden mt-2 pt-2 border-t border-white/15 flex-shrink-0">
                <div
                  onClick={() => setMobileTab("player")}
                  className="bg-white/15 backdrop-blur-xl rounded-xl p-2 border border-white/25 flex items-center justify-between gap-2 shadow-lg cursor-pointer"
                >
                  <img
                    src={currentSong?.cover || "/music-1.jpg"}
                    alt={currentSong?.title || "Cover"}
                    className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = "/music-1.jpg"
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate leading-tight">
                      {currentSong?.title || "No Track"}
                    </p>
                    <p className="text-[10px] text-white/70 truncate">
                      {currentSong?.artist || "Harmonia"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={togglePlay}
                      className="bg-white text-black p-1.5 rounded-full hover:bg-white/90 shadow-sm cursor-pointer"
                      aria-label={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5 fill-black" /> : <Play className="w-3.5 h-3.5 fill-black ml-0.5" />}
                    </button>
                    <button
                      onClick={playNext}
                      className="text-white p-1.5 rounded-full hover:bg-white/10 cursor-pointer"
                      aria-label="Next Track"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}

