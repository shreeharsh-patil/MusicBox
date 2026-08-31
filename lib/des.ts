// Server-side only — DES decryption for JioSaavn encrypted_media_url
// Do NOT import this in client components ("use client")

import CryptoJS from "crypto-js"
import { API_CONFIG } from "@/lib/config"

// JioSaavn DES-ECB decryption key from environment
const DES_KEY = API_CONFIG.jiosaavn.desKey

/**
 * Decrypts JioSaavn's encrypted_media_url using DES-ECB.
 * Returns the direct 320kbps CDN URL for high-fidelity audio.
 */
export function decryptMediaUrl(encryptedUrl: string): string {
  if (!encryptedUrl) return ""
  try {
    const key = CryptoJS.enc.Utf8.parse(DES_KEY)
    const decrypted = CryptoJS.DES.decrypt(encryptedUrl, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    })
    const url = decrypted.toString(CryptoJS.enc.Utf8)
    if (!url.startsWith("http")) return ""

    // Upgrade to 320kbps (replace _96.mp4 / _160.mp4 with _320.mp4)
    return url.replace(/_\d+\.mp4$/, "_320.mp4")
  } catch {
    return ""
  }
}
