"use client"

import { useState, useEffect } from "react"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { ref, set } from "firebase/database"
import { db, rtdb } from "@/lib/firebase"
import { useAuth } from "@/hooks/useAuth"
import { updateUserStatus, type UserProfile } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Phone, Users, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function UserList() {
  const { user, userProfile } = useAuth()
  const [onlineUsers, setOnlineUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [startingCall, setStartingCall] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const usersQuery = query(collection(db, "users"), where("status", "in", ["online", "in-call"]))

      const unsubscribe = onSnapshot(
        usersQuery,
        (snapshot) => {
          const users = snapshot.docs
            .map((doc) => ({ ...doc.data(), uid: doc.id }) as UserProfile)
            .filter((u) => u.uid !== user.uid)
          setOnlineUsers(users)
          setLoading(false)
        },
        (error) => {
          console.error("Error fetching users:", error)
          setLoading(false)
        },
      )

      return () => unsubscribe()
    } catch (error) {
      console.error("Error setting up user listener:", error)
      setLoading(false)
    }
  }, [user])

  const startCall = async (targetUserId: string, targetUsername: string) => {
    if (!user || !userProfile) return

    setStartingCall(targetUserId)

    try {
      const callId = `${user.uid}_${targetUserId}_${Date.now()}`

      // Update both users' status
      await updateUserStatus(user.uid, "in-call", callId)
      await updateUserStatus(targetUserId, "in-call", callId)

      // Initialize call data in Realtime Database
      await set(ref(rtdb, `calls/${callId}`), {
        participants: {
          [user.uid]: {
            username: userProfile.username,
            typing: "",
            composing: "",
            lastUpdate: Date.now(),
          },
          [targetUserId]: {
            username: targetUsername,
            typing: "",
            composing: "",
            lastUpdate: Date.now(),
          },
        },
        status: "active",
        startTime: Date.now(),
      })

      router.push(`/call/${callId}`)
    } catch (error) {
      console.error("Error starting call:", error)
      setStartingCall(null)
    }
  }

  if (loading) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>ユーザーを読み込み中...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          オンラインユーザー ({onlineUsers.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {onlineUsers.map((user) => (
            <div key={user.uid} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{user.username}</div>
                  <Badge
                    variant={user.status === "online" ? "default" : user.status === "in-call" ? "secondary" : "outline"}
                  >
                    {user.status === "online" ? "オンライン" : user.status === "in-call" ? "通話中" : "オフライン"}
                  </Badge>
                </div>
              </div>
              <Button
                onClick={() => startCall(user.uid, user.username)}
                disabled={user.status === "in-call" || startingCall === user.uid}
                className="flex items-center gap-2"
              >
                {startingCall === user.uid ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Phone className="w-4 h-4" />
                )}
                {user.status === "in-call" ? "通話中" : startingCall === user.uid ? "開始中..." : "テキスト通話"}
              </Button>
            </div>
          ))}
          {onlineUsers.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>現在オンラインのユーザーはいません</p>
              <p className="text-sm mt-1">他のユーザーがログインするまでお待ちください</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
