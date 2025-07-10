"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MessageCircle, Users, Plus, ArrowRight, Globe, Lock, Unlock, Zap } from "lucide-react"
import { getAvailableRooms, createRoom, type Room } from "@/lib/room-manager"

export default function RoomSelector() {
  const [username, setUsername] = useState("")
  const [newRoomName, setNewRoomName] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [roomPassword, setRoomPassword] = useState("")
  const [joinPassword, setJoinPassword] = useState("")
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [availableRooms, setAvailableRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(false)
  const [creatingRoom, setCreatingRoom] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = getAvailableRooms(setAvailableRooms)
    return unsubscribe
  }, [])

  const joinRoom = (room: Room, password?: string) => {
    if (!username.trim()) {
      alert("ユーザー名を入力してください")
      return
    }

    if (username.length < 2) {
      alert("ユーザー名は2文字以上で入力してください")
      return
    }

    if (room.isPrivate && !password) {
      setSelectedRoom(room)
      setShowPasswordDialog(true)
      return
    }

    setLoading(true)
    const params = new URLSearchParams({
      username: username.trim(),
      ...(password && { password }),
    })
    router.push(`/room/${room.id}?${params.toString()}`)
  }

  const handlePasswordSubmit = () => {
    if (selectedRoom && joinPassword.trim()) {
      setShowPasswordDialog(false)
      joinRoom(selectedRoom, joinPassword.trim())
      setJoinPassword("")
    }
  }

  const handleCreateRoom = async () => {
    if (!username.trim()) {
      alert("ユーザー名を入力してください")
      return
    }

    if (!newRoomName.trim()) {
      alert("ルーム名を入力してください")
      return
    }

    if (isPrivate && !roomPassword.trim()) {
      alert("プライベートルームにはパスワードが必要です")
      return
    }

    setCreatingRoom(true)
    try {
      const roomId = await createRoom(newRoomName.trim(), isPrivate, roomPassword.trim() || undefined)
      const params = new URLSearchParams({
        username: username.trim(),
        ...(isPrivate && roomPassword.trim() && { password: roomPassword.trim() }),
      })
      router.push(`/room/${roomId}?${params.toString()}`)
    } catch (error) {
      console.error("Error creating room:", error)
      alert("ルームの作成に失敗しました")
      setCreatingRoom(false)
    }
  }

  const getUserCount = (room: Room): number => {
    return Object.keys(room.users).length
  }

  const getLastActivity = (room: Room): string => {
    const now = Date.now()
    const diff = now - room.lastActivity
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return "今"
    if (minutes < 60) return `${minutes}分前`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}時間前`
    const days = Math.floor(hours / 24)
    return `${days}日前`
  }

  const getTypingUsers = (room: Room): string[] => {
    return Object.values(room.users)
      .filter((user) => user.isTyping)
      .map((user) => user.username)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
            <Globe className="w-10 h-10 text-blue-500" />
            フリーテキスト通話
          </h1>
          <p className="text-lg text-gray-600">ユーザー名だけで参加！匿名でリアルタイムテキスト通話を楽しもう</p>
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4" />
              <span>リアルタイム入力</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>匿名参加</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              <span>チャット機能</span>
            </div>
          </div>
        </div>

        {/* Username Input */}
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle className="text-center">参加情報</CardTitle>
            <CardDescription className="text-center">ユーザー名を入力してルームに参加しましょう</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">ユーザー名</Label>
              <Input
                id="username"
                type="text"
                placeholder="あなたの名前を入力..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Available Rooms */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                アクティブなルーム ({availableRooms.length})
              </CardTitle>
              <CardDescription>既存のルームに参加して会話を始めましょう</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {availableRooms.map((room) => {
                  const typingUsers = getTypingUsers(room)
                  return (
                    <div
                      key={room.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-medium">{room.name}</div>
                          {room.isPrivate ? (
                            <Lock className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Unlock className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {getUserCount(room)}人
                          </span>
                          <span>最終活動: {getLastActivity(room)}</span>
                          {typingUsers.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {typingUsers.slice(0, 2).join(", ")}
                              {typingUsers.length > 2 && ` +${typingUsers.length - 2}`}が入力中
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => joinRoom(room)}
                        disabled={loading || !username.trim()}
                        className="flex items-center gap-1"
                      >
                        <ArrowRight className="w-3 h-3" />
                        参加
                      </Button>
                    </div>
                  )
                })}
                {availableRooms.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>アクティブなルームがありません</p>
                    <p className="text-sm">新しいルームを作成してみましょう！</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Create New Room */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                新しいルームを作成
              </CardTitle>
              <CardDescription>あなた専用のテキスト通話ルームを作成しましょう</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roomName">ルーム名</Label>
                <Input
                  id="roomName"
                  type="text"
                  placeholder="例: 雑談ルーム、勉強会など..."
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  maxLength={30}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="private-room" checked={isPrivate} onCheckedChange={setIsPrivate} />
                <Label htmlFor="private-room" className="flex items-center gap-2">
                  {isPrivate ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  プライベートルーム
                </Label>
              </div>

              {isPrivate && (
                <div className="space-y-2">
                  <Label htmlFor="roomPassword">パスワード</Label>
                  <Input
                    id="roomPassword"
                    type="password"
                    placeholder="ルームのパスワードを設定..."
                    value={roomPassword}
                    onChange={(e) => setRoomPassword(e.target.value)}
                    maxLength={20}
                  />
                </div>
              )}

              <Button
                onClick={handleCreateRoom}
                disabled={creatingRoom || !username.trim() || !newRoomName.trim()}
                className="w-full"
              >
                {creatingRoom ? "作成中..." : "ルームを作成して参加"}
              </Button>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium text-sm">クイック作成</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: "雑談ルーム", icon: "💬" },
                    { name: "勉強会", icon: "📚" },
                    { name: "作業部屋", icon: "💻" },
                    { name: "フリートーク", icon: "🗣️" },
                  ].map((preset) => (
                    <Button
                      key={preset.name}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewRoomName(preset.name)
                        if (username.trim()) {
                          handleCreateRoom()
                        }
                      }}
                      disabled={!username.trim()}
                      className="text-xs"
                    >
                      {preset.icon} {preset.name}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-4 gap-4 text-center">
              <div>
                <MessageCircle className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <h3 className="font-medium mb-1">リアルタイム通話</h3>
                <p className="text-sm text-gray-600">入力中の文字が即座に相手に表示される</p>
              </div>
              <div>
                <Users className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <h3 className="font-medium mb-1">匿名参加</h3>
                <p className="text-sm text-gray-600">アカウント不要、ユーザー名だけで参加</p>
              </div>
              <div>
                <Lock className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                <h3 className="font-medium mb-1">プライベートルーム</h3>
                <p className="text-sm text-gray-600">パスワード付きの限定ルーム作成</p>
              </div>
              <div>
                <Globe className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                <h3 className="font-medium mb-1">自動管理</h3>
                <p className="text-sm text-gray-600">空のルームは自動削除でクリーンな環境</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                プライベートルーム
              </DialogTitle>
              <DialogDescription>「{selectedRoom?.name}」に参加するにはパスワードが必要です</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="joinPassword">パスワード</Label>
                <Input
                  id="joinPassword"
                  type="password"
                  placeholder="ルームのパスワードを入力..."
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handlePasswordSubmit} disabled={!joinPassword.trim()} className="flex-1">
                  参加
                </Button>
                <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                  キャンセル
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
