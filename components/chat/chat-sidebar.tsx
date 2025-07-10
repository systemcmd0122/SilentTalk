"use client"

import { useState, useEffect } from "react"
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/useAuth"
import type { UserProfile } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, UserPlus, MessageCircle } from "lucide-react"

interface ChatSidebarProps {
  onSelectChat: (friendId: string, friendName: string) => void
  selectedFriend: string | null
}

export default function ChatSidebar({ onSelectChat, selectedFriend }: ChatSidebarProps) {
  const { user, userProfile } = useAuth()
  const [friends, setFriends] = useState<UserProfile[]>([])
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [searchEmail, setSearchEmail] = useState("")
  const [showAddFriend, setShowAddFriend] = useState(false)

  useEffect(() => {
    if (!user || !userProfile) return

    // Listen to friends
    const friendsQuery = query(
      collection(db, "users"),
      where("uid", "in", userProfile.friends.length > 0 ? userProfile.friends : ["dummy"]),
    )

    const unsubscribeFriends = onSnapshot(friendsQuery, (snapshot) => {
      const friendsData = snapshot.docs.map((doc) => doc.data() as UserProfile)
      setFriends(friendsData)
    })

    return () => unsubscribeFriends()
  }, [user, userProfile])

  useEffect(() => {
    if (!showAddFriend) return

    // Listen to all users for friend search
    const usersQuery = query(collection(db, "users"))
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs
        .map((doc) => doc.data() as UserProfile)
        .filter((u) => u.uid !== user?.uid && !userProfile?.friends.includes(u.uid))
      setAllUsers(usersData)
    })

    return () => unsubscribeUsers()
  }, [showAddFriend, user, userProfile])

  const addFriend = async (friendId: string) => {
    if (!user || !userProfile) return

    try {
      // Add friend to current user's friends list
      await updateDoc(doc(db, "users", user.uid), {
        friends: arrayUnion(friendId),
      })

      // Add current user to friend's friends list
      await updateDoc(doc(db, "users", friendId), {
        friends: arrayUnion(user.uid),
      })

      setSearchEmail("")
    } catch (error) {
      console.error("Error adding friend:", error)
    }
  }

  const removeFriend = async (friendId: string) => {
    if (!user) return

    try {
      // Remove friend from current user's friends list
      await updateDoc(doc(db, "users", user.uid), {
        friends: arrayRemove(friendId),
      })

      // Remove current user from friend's friends list
      await updateDoc(doc(db, "users", friendId), {
        friends: arrayRemove(user.uid),
      })
    } catch (error) {
      console.error("Error removing friend:", error)
    }
  }

  const filteredUsers = allUsers.filter(
    (user) =>
      user.email.toLowerCase().includes(searchEmail.toLowerCase()) ||
      user.username.toLowerCase().includes(searchEmail.toLowerCase()),
  )

  return (
    <div className="w-80 border-r bg-gray-50 flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            チャット
          </h2>
          <Button size="sm" variant="outline" onClick={() => setShowAddFriend(!showAddFriend)}>
            <UserPlus className="w-4 h-4" />
          </Button>
        </div>

        {showAddFriend && (
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">フレンド追加</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="メールアドレスまたはユーザー名で検索"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="mb-2"
              />
              <div className="max-h-32 overflow-y-auto space-y-1">
                {filteredUsers.map((user) => (
                  <div key={user.uid} className="flex items-center justify-between p-2 bg-white rounded border">
                    <div>
                      <div className="font-medium text-sm">{user.username}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                    <Button size="sm" onClick={() => addFriend(user.uid)}>
                      追加
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <div className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
            <Users className="w-4 h-4" />
            フレンド ({friends.length})
          </div>
          {friends.map((friend) => (
            <div
              key={friend.uid}
              className={`p-3 rounded-lg cursor-pointer transition-colors mb-1 ${
                selectedFriend === friend.uid ? "bg-blue-100 border border-blue-200" : "hover:bg-gray-100"
              }`}
              onClick={() => onSelectChat(friend.uid, friend.username)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{friend.username}</div>
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <Badge variant={friend.status === "online" ? "default" : "secondary"}>
                      {friend.status === "online" ? "オンライン" : "オフライン"}
                    </Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFriend(friend.uid)
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  削除
                </Button>
              </div>
            </div>
          ))}
          {friends.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>フレンドがいません</p>
              <p className="text-sm">上の + ボタンでフレンドを追加しましょう</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
