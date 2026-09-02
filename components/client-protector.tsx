"use client"

import { useEffect } from "react"

export default function ClientProtector() {
  useEffect(() => {
    // 1. Disable Right-Click Context Menu (Inspect, View Source, etc.)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      return false
    }

    // 2. Disable Developer Mode & Inspect Shortcut Keys
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey
      const isShift = e.shiftKey
      const key = e.key.toUpperCase()

      // Block F12 (DevTools)
      if (e.key === "F12" || e.keyCode === 123) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }

      // Block Ctrl+Shift+I / Cmd+Opt+I (Inspect)
      // Block Ctrl+Shift+J / Cmd+Opt+J (Console)
      // Block Ctrl+Shift+C / Cmd+Opt+C (Inspect Element)
      // Block Ctrl+Shift+K (Firefox Web Console)
      if (isCtrlOrMeta && isShift && ["I", "J", "C", "K"].includes(key)) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }

      // Block Ctrl+U / Cmd+U (View Page Source)
      // Block Ctrl+S / Cmd+S (Save Page)
      if (isCtrlOrMeta && ["U", "S"].includes(key)) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }

      // 3. Disable Keyboard Zoom (Ctrl + +, Ctrl + -, Ctrl + 0, Ctrl + =)
      if (
        isCtrlOrMeta &&
        ["+", "-", "=", "_", "0"].includes(e.key) ||
        (isCtrlOrMeta && ["NumpadAdd", "NumpadSubtract"].includes(e.code))
      ) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
    }

    // 4. Disable Mouse Wheel Zoom (Ctrl + Scroll Wheel)
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
      }
    }

    // 5. Disable Multi-Touch Pinch to Zoom on Mobile
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    }

    // 6. Disable iOS Safari Gesture Zoom (Pinch)
    const handleGesture = (e: Event) => {
      e.preventDefault()
    }

    // 7. Prevent Double-Tap to Zoom on Mobile (Except Input/Textarea)
    let lastTouchEnd = 0
    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now()
      const target = e.target as HTMLElement | null
      const isInput =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")

      if (!isInput && now - lastTouchEnd <= 300) {
        e.preventDefault()
      }
      lastTouchEnd = now
    }

    // Attach all event listeners with passive: false where needed
    window.addEventListener("contextmenu", handleContextMenu, { capture: true })
    window.addEventListener("keydown", handleKeyDown, { capture: true })
    window.addEventListener("wheel", handleWheel, { passive: false, capture: true })
    window.addEventListener("touchmove", handleTouchMove, { passive: false, capture: true })
    window.addEventListener("touchend", handleTouchEnd, { passive: false, capture: true })
    window.addEventListener("gesturestart", handleGesture, { passive: false, capture: true })
    window.addEventListener("gesturechange", handleGesture, { passive: false, capture: true })
    window.addEventListener("gestureend", handleGesture, { passive: false, capture: true })

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true })
      window.removeEventListener("keydown", handleKeyDown, { capture: true })
      window.removeEventListener("wheel", handleWheel, { capture: true })
      window.removeEventListener("touchmove", handleTouchMove, { capture: true })
      window.removeEventListener("touchend", handleTouchEnd, { capture: true })
      window.removeEventListener("gesturestart", handleGesture, { capture: true })
      window.removeEventListener("gesturechange", handleGesture, { capture: true })
      window.removeEventListener("gestureend", handleGesture, { capture: true })
    }
  }, [])

  return null
}
