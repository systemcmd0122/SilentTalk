"use client"

import RoomSelector from "@/components/home/room-selector"

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <RoomSelector />
    </div>
  )
}