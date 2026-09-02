import MusicPlayerUI from "@/components/music-player-ui"

export default function Home() {
  return (
    <main
      className="min-h-[100dvh] w-full flex items-center justify-center p-2 sm:p-4 md:p-6 bg-cover bg-center bg-no-repeat overflow-x-hidden"
      style={{ backgroundImage: "url(/bg-img.jpg)" }}
    >
      <MusicPlayerUI />
    </main>
  )
}
