import MusicPlayerUI from "@/components/music-player-ui"

export default function Home() {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url(/bg-img.jpg)" }}
    >
      <MusicPlayerUI />
    </main>
  )
}
