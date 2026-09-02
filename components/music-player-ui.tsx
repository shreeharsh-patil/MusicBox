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
  MoreHorizontal,
  Search,
  X,
  Loader2,
} from "lucide-react"
import { motion } from "motion/react"
import { searchSongs, getTrendingSongs, formatDuration, type JioSaavnSong } from "@/lib/jiosaavn"
import { API_CONFIG } from "@/lib/config"

interface PlaylistItem {
  id: string
  title: string
  artist: string
  duration: string
  cover: string
  streamUrl: string
  raw?: JioSaavnSong
}

// Initial playlist from reference component
const INITIAL_PLAYLIST: PlaylistItem[] = [
  {
    id: "1",
    title: "Die With a Smile",
    artist: "Lady Gaga & Bruno Mars",
    duration: "3:38",
    cover: "/diewithasmile.jpeg",
    streamUrl: "",
  },
  {
    id: "2",
    title: "The Fate of Ophelia",
    artist: "Fall Out Boy",
    duration: "3:45",
    cover: "/fateofophelia.jpg",
    streamUrl: "",
  },
  {
    id: "3",
    title: "Espresso",
    artist: "Sabrina Carpenter",
    duration: "2:55",
    cover: "/espresso.jpeg",
    streamUrl: "",
  },
  {
    id: "4",
    title: "Beautiful Things",
    artist: "Benson Boone",
    duration: "3:18",
    cover: "/beautifulthings.jpg",
    streamUrl: "",
  },
  {
    id: "5",
    title: "Loose Controls",
    artist: "Teddy Swims",
    duration: "2:42",
    cover: "/loosecontrols.jpg",
    streamUrl: "",
  },
  {
    id: "6",
    title: "Good Luck Babe",
    artist: "Chappell Roan",
    duration: "3:25",
    cover: "/goodluckbabe.jpeg",
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

  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  const modalRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const barProgressRef = useRef<HTMLDivElement>(null)
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

  // Load trending songs
  const loadTrending = useCallback(async () => {
    try {
      const songs = await getTrendingSongs()
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
    }
  }, [])

  useEffect(() => {
    loadTrending()
  }, [loadTrending])

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

  // Mouse move glass distortion physics from reference
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!modalRef.current) return
      const rect = modalRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      setMousePos({ x, y })

      // Update filter turbulence based on mouse position
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

  const updateProgressFromRef = (ref: React.RefObject<HTMLDivElement | null>, clientX: number) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = (x / rect.width) * 100
    const clamped = Math.max(0, Math.min(100, percentage))
    setProgress(clamped)

    if (audioRef.current && audioRef.current.duration) {
      const targetTime = (clamped / 100) * audioRef.current.duration
      audioRef.current.currentTime = targetTime
      setCurrentTime(targetTime)
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    updateProgressFromRef(progressRef, e.clientX)
  }

  const handleProgressDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return
    updateProgressFromRef(progressRef, e.clientX)
  }

  const handleBarProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    updateProgressFromRef(barProgressRef, e.clientX)
  }

  const handleBarProgressDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return
    updateProgressFromRef(barProgressRef, e.clientX)
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

  const formattedCurrentTime = duration > 0 ? formatTime(currentTime) : "1:01"
  const formattedRemainingTime =
    duration > 0 ? `-${formatTime(Math.max(0, duration - currentTime))}` : "-1:35"

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
        className="glass-card relative w-full max-w-4xl h-[500px] rounded-3xl overflow-hidden shadow-2xl"
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 15,
          duration: 0.6,
        }}
      >
        {/* Glass Filter Layer */}
        <div className="glass-filter" />

        {/* Glass Distortion Overlay */}
        <div className="glass-distortion-overlay" />

        {/* Glass Overlay */}
        <div className="glass-overlay" />

        {/* Glass Specular */}
        <div
          className="glass-specular"
          style={{
            background: `radial-gradient(
              circle at ${mousePos.x}px ${mousePos.y}px,
              rgba(255,255,255,0.15) 0%,
              rgba(255,255,255,0.05) 30%,
              rgba(255,255,255,0) 60%
            )`,
          }}
        />

        {/* Content */}
        <div className="glass-content relative z-[4] p-8 h-full flex flex-col">
          {/* Top Bar: Logo + Search */}
          <div className="flex items-center justify-between gap-4 mb-6 flex-shrink-0">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Music2 className="w-8 h-8 text-white" />
              <span className="text-2xl font-bold text-white font-sans">
                {API_CONFIG.client.appName || "Harmonia"}
              </span>
            </div>

            {/* Search Bar */}
            <div className="relative flex items-center">
              <div className="relative flex items-center bg-white/10 hover:bg-white/15 focus-within:bg-white/20 backdrop-blur-md rounded-full px-3.5 py-1.5 border border-white/20 focus-within:border-white/40 transition-all w-52 sm:w-64 md:w-72 shadow-inner">
                <Search className="w-4 h-4 text-white/70 mr-2 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search songs, artists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs text-white placeholder-white/50 outline-none w-full pr-5"
                />
                {isSearching ? (
                  <Loader2 className="w-3.5 h-3.5 text-white/70 animate-spin absolute right-3" />
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
                    className="text-white/60 hover:text-white absolute right-3 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex gap-8 flex-1 overflow-hidden">
            {/* Left Side - Album Art and Controls */}
            <div className="flex flex-col justify-between w-[320px]">
              {/* Album Art */}
              <motion.div
                className="bg-black/40 rounded-2xl p-3 backdrop-blur-sm w-[290px] mx-auto"
                initial={{ opacity: 0, scale: 0.8, rotateY: -15 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 120,
                  damping: 12,
                  delay: 0.2,
                }}
              >
                <motion.img
                  key={currentSong?.id || "art"}
                  src={currentSong?.cover || "/music-1.jpg"}
                  alt="Album Art"
                  className="w-full aspect-square object-cover rounded-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src = "/music-1.jpg"
                  }}
                />
              </motion.div>

              {/* Player Controls */}
              <motion.div
                className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mt-4"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 100,
                  damping: 15,
                  delay: 0.3,
                }}
              >
                {/* Song Info */}
                <div className="text-white mb-3">
                  <h3 className="font-semibold text-sm truncate">
                    {currentSong ? `${currentSong.title} - ${currentSong.artist}` : "Die With a Smile - Lady Gaga & Bruno Mars"}
                  </h3>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-white text-xs font-medium">{formattedCurrentTime}</span>
                  <div
                    ref={progressRef}
                    className="flex-1 h-1 bg-white/30 rounded-full cursor-pointer relative group"
                    onClick={handleProgressClick}
                    onMouseDown={() => setIsDragging(true)}
                    onMouseUp={() => setIsDragging(false)}
                    onMouseMove={handleProgressDrag}
                    onMouseLeave={() => setIsDragging(false)}
                  >
                    <div
                      className="h-full bg-white rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ left: `${progress}%`, transform: "translate(-50%, -50%)" }}
                    />
                  </div>
                  <span className="text-white text-xs font-medium">{formattedRemainingTime}</span>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <motion.button
                    onClick={() => currentSong && toggleFavorite(currentSong.id)}
                    className="text-white cursor-pointer"
                    whileHover={{ scale: 1.1, rotate: 15 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Star
                      className={`w-5 h-5 ${
                        currentSong && favorites.has(currentSong.id)
                          ? "fill-yellow-400 text-yellow-400"
                          : ""
                      }`}
                    />
                  </motion.button>
                  <motion.button
                    onClick={playPrev}
                    className="text-white cursor-pointer"
                    whileHover={{ scale: 1.1, x: -2 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <SkipBack className="w-5 h-5" />
                  </motion.button>
                  <motion.button
                    onClick={togglePlay}
                    className="bg-white text-black rounded-full p-2 cursor-pointer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <motion.div animate={{ rotate: isPlaying ? 360 : 0 }} transition={{ duration: 0.3 }}>
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </motion.div>
                  </motion.button>
                  <motion.button
                    onClick={playNext}
                    className="text-white cursor-pointer"
                    whileHover={{ scale: 1.1, x: 2 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <SkipForward className="w-5 h-5" />
                  </motion.button>
                  <motion.button
                    onClick={() => setIsRepeatOne((prev) => !prev)}
                    className={`text-white transition-colors cursor-pointer ${
                      isRepeatOne ? "text-green-400" : ""
                    }`}
                    whileHover={{ scale: 1.1, rotate: -15 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    title={isRepeatOne ? "Repeat One" : "Repeat All"}
                  >
                    <Repeat className="w-5 h-5" />
                  </motion.button>
                </div>
              </motion.div>
            </div>

            {/* Right Side - Playlist */}
            <motion.div
              className="flex-1 overflow-hidden flex flex-col"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 15,
                delay: 0.4,
              }}
            >
              {searchQuery && (
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 flex-shrink-0">
                  <span className="text-xs text-white/80 font-medium">
                    Search Results for &quot;{searchQuery}&quot; ({playlist.length})
                  </span>
                  <button
                    onClick={() => {
                      setSearchQuery("")
                      if (trendingPlaylist.length > 0) setPlaylist(trendingPlaylist)
                    }}
                    className="text-[11px] text-white/70 hover:text-white underline cursor-pointer"
                  >
                    Back to Trending
                  </button>
                </div>
              )}

              <div className="h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                <div className="space-y-2">
                  {playlist.map((song, index) => {
                    const isCurrent = index === currentIndex
                    return (
                      <motion.div
                        key={`${song.id}-${index}`}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer group ${
                          isCurrent ? "bg-white/20" : "hover:bg-white/10"
                        }`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 100,
                          damping: 15,
                          delay: 0.5 + index * 0.05,
                        }}
                        whileHover={{ scale: 1.02, x: 5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => selectSong(index)}
                      >
                        <motion.img
                          src={song.cover || "/placeholder.svg"}
                          alt={song.title}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src = "/music-1.jpg"
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-medium text-sm truncate">{song.title}</h4>
                          <p className="text-white/70 text-xs truncate">{song.artist}</p>
                        </div>
                        <span className="text-white/70 text-sm font-medium flex-shrink-0">{song.duration}</span>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Floating Music Bar - bottom left */}
        <motion.div
          className="absolute bottom-6 left-8 z-[4] w-[320px] rounded-2xl bg-white/10 backdrop-blur-xl shadow-2xl ring-1 ring-white/20"
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 15,
            delay: 0.6,
          }}
          whileHover={{ scale: 1.02 }}
        >
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 60%, rgba(255,255,255,0.02) 100%)",
              boxShadow: "inset 1px 1px 0 rgba(255,255,255,0.35)",
            }}
          />
          <div className="relative z-[1] p-2">
            <div className="text-white text-xs font-medium text-center mb-2 truncate">
              {currentSong ? `${currentSong.title} - ${currentSong.artist}` : "Lunch Break - Seedhe Maut"}
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white/90 text-xs font-medium">{formattedCurrentTime}</span>
              <div
                ref={barProgressRef}
                className="flex-1 h-1 bg-white/30 rounded-full cursor-pointer relative group"
                onClick={handleBarProgressClick}
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                onMouseMove={handleBarProgressDrag}
                onMouseLeave={() => setIsDragging(false)}
              >
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `${progress}%`, transform: "translate(-50%, -50%)" }}
                />
              </div>
              <span className="text-white/90 text-xs font-medium">{formattedRemainingTime}</span>
            </div>
            <div className="flex items-center justify-between">
              <motion.button
                onClick={() => currentSong && toggleFavorite(currentSong.id)}
                className="text-white cursor-pointer"
                whileHover={{ scale: 1.1, rotate: 15 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Star
                  className={`w-4 h-4 ${
                    currentSong && favorites.has(currentSong.id)
                      ? "fill-yellow-400 text-yellow-400"
                      : ""
                  }`}
                />
              </motion.button>
              <motion.button
                onClick={playPrev}
                className="text-white cursor-pointer"
                whileHover={{ scale: 1.1, x: -2 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <SkipBack className="w-4 h-4" />
              </motion.button>
              <motion.button
                onClick={togglePlay}
                className="bg-white text-black rounded-full p-1.5 shadow-md cursor-pointer"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <motion.div animate={{ rotate: isPlaying ? 360 : 0 }} transition={{ duration: 0.3 }}>
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </motion.div>
              </motion.button>
              <motion.button
                onClick={playNext}
                className="text-white cursor-pointer"
                whileHover={{ scale: 1.1, x: 2 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <SkipForward className="w-4 h-4" />
              </motion.button>
              <motion.button
                onClick={() => setIsRepeatOne((prev) => !prev)}
                className={`text-white transition-colors cursor-pointer ${
                  isRepeatOne ? "text-green-400" : ""
                }`}
                whileHover={{ scale: 1.1, rotate: -15 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <MoreHorizontal className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </>
  )
}
