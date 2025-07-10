"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"
import { logoutUser } from "@/lib/auth"
import ChatSidebar from "@/components/chat/chat-sidebar"
import ChatWindow from "@/components/chat/chat-window"
import { Button } from "@/components/ui/button"
import { LogOut, User } from "lucide-react"

export default function ChatPage() {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null)
  const [selectedFriendName, setSelectedFriendName] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
  }, [user, loading, router])

  const handleLogout = async () => {
    await logoutUser()
    router.push("/")
  }

  const handleSelectChat = (friendId: string, friendName: string) => {
    setSelectedFriend(friendId)
    setSelectedFriendName(friendName)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!user || !userProfile) {
    return null // Will redirect to login
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="w-6 h-6" />
          <div>
            <h1 className="font-semibold">{userProfile.username}</h1>
            <p className="text-sm text-gray-500">{userProfile.email}</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          ログアウト
        </Button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <ChatSidebar onSelectChat={handleSelectChat} selectedFriend={selectedFriend} />
        <ChatWindow friendId={selectedFriend} friendName={selectedFriendName} />
      </div>
    </div>
  )
}
