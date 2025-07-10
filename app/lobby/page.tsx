"use client"

import { useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"
import { logoutUser, updateUserStatus } from "@/lib/auth"
import UserList from "@/components/lobby/user-list"
import { Button } from "@/components/ui/button"
import { LogOut, Phone } from "lucide-react"

export default function LobbyPage() {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
  }, [user, loading, router])

  useEffect(() => {
    // Update user status to online when entering lobby
    if (user && userProfile) {
      updateUserStatus(user.uid, "online")
    }
  }, [user, userProfile])

  const handleLogout = async () => {
    await logoutUser()
    router.push("/")
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white border-b px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
              {userProfile.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="font-semibold flex items-center gap-2">
                <Phone className="w-5 h-5" />
                テキスト通話ロビー
              </h1>
              <p className="text-sm text-gray-500">ようこそ、{userProfile.username}さん</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            ログアウト
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">テキスト通話を始めましょう</h2>
          <p className="text-gray-600">
            オンラインのユーザーを選んでリアルタイムテキスト通話を開始できます。
            <br />
            入力中の文字が相手にリアルタイムで表示される新しい通話体験をお楽しみください。
          </p>
        </div>

        <UserList />
      </main>
    </div>
  )
}
