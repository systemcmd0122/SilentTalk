"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  MessageCircle, 
  Users, 
  Plus, 
  ArrowRight, 
  Globe, 
  Lock, 
  Unlock, 
  Eye,
  EyeOff,
  RefreshCw
} from "lucide-react"
import { getAvailableRooms, createRoom, type Room } from "@/lib/room-manager"

// フローティングメッセージのデータ
const floatingMessages = [
  { text: "こんにちは！", delay: 0 },
  { text: "元気？", delay: 2 },
  { text: "今日は何してる？", delay: 4 },
  { text: "一緒に話そう", delay: 6 },
  { text: "楽しいね", delay: 8 },
  { text: "また明日", delay: 10 },
  { text: "おつかれさま", delay: 12 },
  { text: "ありがとう", delay: 14 },
  { text: "よろしく", delay: 16 },
  { text: "頑張って", delay: 18 },
]

// フローティングメッセージコンポーネント
const FloatingMessage = ({ text, delay, index }: { text: string; delay: number; index: number }) => {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, delay * 1000)
    
    return () => clearTimeout(timer)
  }, [delay])
  
  const positions = [
    { left: '10%', top: '20%' },
    { left: '85%', top: '15%' },
    { left: '20%', top: '70%' },
    { left: '80%', top: '60%' },
    { left: '15%', top: '45%' },
    { left: '75%', top: '35%' },
    { left: '25%', top: '25%' },
    { left: '70%', top: '75%' },
    { left: '30%', top: '80%' },
    { left: '60%', top: '20%' },
  ]
  
  const position = positions[index % positions.length]
  
  return (
    <div
      className={`absolute transition-all duration-1000 ease-out pointer-events-none ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{
        left: position.left,
        top: position.top,
        animationDelay: `${delay}s`,
      }}
    >
      <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30 shadow-lg">
        <span className="text-sm font-medium text-white/90">{text}</span>
      </div>
    </div>
  )
}

// 背景アニメーション
const BackgroundAnimation = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* グラデーションの動く背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 opacity-20 animate-pulse" />
      
      {/* 浮遊する円 */}
      <div className="absolute w-96 h-96 bg-blue-300/20 rounded-full -top-48 -left-48 animate-bounce" style={{ animationDuration: '6s' }} />
      <div className="absolute w-80 h-80 bg-purple-300/20 rounded-full -bottom-40 -right-40 animate-bounce" style={{ animationDuration: '8s', animationDelay: '2s' }} />
      <div className="absolute w-64 h-64 bg-pink-300/20 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-ping" style={{ animationDuration: '4s' }} />
      
      {/* フローティングメッセージ */}
      {floatingMessages.map((message, index) => (
        <FloatingMessage
          key={`${message.text}-${index}`}
          text={message.text}
          delay={message.delay}
          index={index}
        />
      ))}
      
      {/* 動く線 */}
      <div className="absolute inset-0">
        <div className="absolute w-px h-full bg-gradient-to-b from-transparent via-white/30 to-transparent left-1/4 animate-pulse" />
        <div className="absolute w-px h-full bg-gradient-to-b from-transparent via-white/30 to-transparent right-1/4 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent top-1/4 animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent bottom-1/4 animate-pulse" style={{ animationDelay: '3s' }} />
      </div>
    </div>
  )
}

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
  const [refreshing, setRefreshing] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showJoinPassword, setShowJoinPassword] = useState(false)
  const [usernameError, setUsernameError] = useState("")
  const [roomNameError, setRoomNameError] = useState("")
  const router = useRouter()

  // ルーム取得
  useEffect(() => {
    const unsubscribe = getAvailableRooms(setAvailableRooms)
    return unsubscribe
  }, [])

  // ルーム一覧のリロード
  const handleRefreshRooms = useCallback(async () => {
    setRefreshing(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
    } finally {
      setRefreshing(false)
    }
  }, [])

  // ユーザー名バリデーション
  const validateUsername = useCallback((name: string) => {
    if (!name.trim()) {
      setUsernameError("ユーザー名を入力してください")
      return false
    }
    if (name.length < 2) {
      setUsernameError("ユーザー名は2文字以上で入力してください")
      return false
    }
    if (name.length > 20) {
      setUsernameError("ユーザー名は20文字以内で入力してください")
      return false
    }
    setUsernameError("")
    return true
  }, [])

  // ルーム名バリデーション
  const validateRoomName = useCallback((name: string) => {
    if (!name.trim()) {
      setRoomNameError("ルーム名を入力してください")
      return false
    }
    if (name.length > 30) {
      setRoomNameError("ルーム名は30文字以内で入力してください")
      return false
    }
    setRoomNameError("")
    return true
  }, [])

  // ルーム参加
  const joinRoom = useCallback((room: Room, password?: string) => {
    if (!validateUsername(username)) return

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
  }, [username, validateUsername, router])

  // パスワード送信
  const handlePasswordSubmit = useCallback(() => {
    if (selectedRoom && joinPassword.trim()) {
      setShowPasswordDialog(false)
      joinRoom(selectedRoom, joinPassword.trim())
      setJoinPassword("")
    }
  }, [selectedRoom, joinPassword, joinRoom])

  // ルーム作成
  const handleCreateRoom = useCallback(async () => {
    if (!validateUsername(username) || !validateRoomName(newRoomName)) return

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
    } finally {
      setCreatingRoom(false)
    }
  }, [username, newRoomName, isPrivate, roomPassword, validateUsername, validateRoomName, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* 背景アニメーション */}
      <BackgroundAnimation />
      
      <div className="flex items-center justify-center px-4 py-6 sm:p-4 min-h-screen relative z-10">
        <div className="w-full max-w-5xl space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="text-center space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
              <div className="p-2 sm:p-3 rounded-full bg-blue-500/10 backdrop-blur-sm border border-blue-200/50">
                <Globe className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500" />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 drop-shadow-sm">
                SilentTalk
              </h1>
            </div>
            <p className="text-base sm:text-lg text-gray-600 px-4 sm:px-0">
              ユーザー名だけで参加！匿名でリアルタイムテキスト通話を楽しもう
            </p>
          </div>

          {/* Username Input */}
          <Card className="mx-auto max-w-md bg-white/80 backdrop-blur-sm border-white/50 shadow-xl">
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
              <CardTitle className="text-center text-gray-900 text-xl sm:text-2xl">
                参加情報
              </CardTitle>
              <CardDescription className="text-center text-gray-600 text-sm sm:text-base">
                ユーザー名を入力してルームに参加しましょう
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-700 text-sm sm:text-base">
                  ユーザー名
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="あなたの名前を入力..."
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    if (usernameError) validateUsername(e.target.value)
                  }}
                  onBlur={() => validateUsername(username)}
                  maxLength={20}
                  className={`bg-white/90 backdrop-blur-sm text-base sm:text-lg ${usernameError ? "border-red-500" : ""}`}
                />
                {usernameError && (
                  <p className="text-xs sm:text-sm text-red-500">{usernameError}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {/* Available Rooms */}
            <Card className="lg:col-span-1 xl:col-span-2 bg-white/80 backdrop-blur-sm border-white/50 shadow-xl order-2 lg:order-1">
              <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                    <CardTitle className="text-gray-900 text-lg sm:text-xl">
                      アクティブなルーム ({availableRooms.length})
                    </CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshRooms}
                    disabled={refreshing}
                    className="bg-white/70 backdrop-blur-sm border-white/50 hover:bg-white/90 text-sm"
                  >
                    <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? '更新中...' : '更新'}
                  </Button>
                </div>
                <CardDescription className="text-gray-600 text-sm sm:text-base">
                  既存のルームに参加して会話を始めましょう
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="space-y-3 max-h-[calc(100vh-24rem)] sm:max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                  {availableRooms.map((room) => (
                    <div
                      key={room.id}
                      className="group relative p-3 sm:p-4 rounded-lg border bg-white/60 backdrop-blur-sm border-white/50 hover:bg-white/90 transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 sm:mb-2">
                            <div className="font-medium truncate text-sm sm:text-base text-gray-900">
                              {room.name}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {room.isPrivate ? (
                                <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500" />
                              ) : (
                                <Unlock className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                              )}
                            </div>
                          </div>
                          
                          <div className="text-xs sm:text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {Object.keys(room.users).length}人
                            </span>
                          </div>
                        </div>
                        
                        <Button
                          size="sm"
                          onClick={() => joinRoom(room)}
                          disabled={loading || !username.trim() || !!usernameError}
                          className="ml-2 sm:ml-4 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all duration-300 active:scale-95 hover:scale-105 text-xs sm:text-sm"
                        >
                          <ArrowRight className="w-3 h-3 mr-1" />
                          参加
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {availableRooms.length === 0 && (
                    <div className="text-center py-8 sm:py-12 text-gray-500">
                      <MessageCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 opacity-50 animate-pulse" />
                      <p className="text-base sm:text-lg mb-1 sm:mb-2">アクティブなルームがありません</p>
                      <p className="text-xs sm:text-sm">新しいルームを作成してみましょう！</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Create New Room */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/50 shadow-xl order-1 lg:order-2">
              <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  新しいルームを作成
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-gray-600">
                  あなた専用のテキスト通話ルームを作成しましょう
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roomName" className="text-sm sm:text-base text-gray-700">
                    ルーム名
                  </Label>
                  <Input
                    id="roomName"
                    type="text"
                    placeholder="例: 雑談ルーム、勉強会など..."
                    value={newRoomName}
                    onChange={(e) => {
                      setNewRoomName(e.target.value)
                      if (roomNameError) validateRoomName(e.target.value)
                    }}
                    onBlur={() => validateRoomName(newRoomName)}
                    maxLength={30}
                    className={`bg-white/90 backdrop-blur-sm text-sm sm:text-base ${roomNameError ? "border-red-500" : ""}`}
                  />
                  {roomNameError && (
                    <p className="text-xs sm:text-sm text-red-500">{roomNameError}</p>
                  )}
                </div>

                <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-white/60 backdrop-blur-sm border border-white/50">
                  <div className="flex items-center gap-2">
                    {isPrivate ? <Lock className="w-3 h-3 sm:w-4 sm:h-4" /> : <Unlock className="w-3 h-3 sm:w-4 sm:h-4" />}
                    <Label htmlFor="private-room" className="text-sm sm:text-base text-gray-700">
                      プライベートルーム
                    </Label>
                  </div>
                  <Switch 
                    id="private-room" 
                    checked={isPrivate} 
                    onCheckedChange={setIsPrivate}
                    className="scale-90 sm:scale-100"
                  />
                </div>

                {isPrivate && (
                  <div className="space-y-2">
                    <Label htmlFor="roomPassword" className="text-sm sm:text-base text-gray-700">
                      パスワード
                    </Label>
                    <div className="relative">
                      <Input
                        id="roomPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="ルームのパスワードを設定..."
                        value={roomPassword}
                        onChange={(e) => setRoomPassword(e.target.value)}
                        maxLength={20}
                        className="pr-10 bg-white/90 backdrop-blur-sm text-sm sm:text-base"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-2 sm:px-3 py-1 sm:py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" /> : <Eye className="w-3 h-3 sm:w-4 sm:h-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleCreateRoom}
                  disabled={creatingRoom || !username.trim() || !newRoomName.trim() || !!usernameError || !!roomNameError}
                  className="w-full hover:scale-105 active:scale-95 transition-transform duration-200 text-sm sm:text-base"
                >
                  {creatingRoom ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      作成中...
                    </div>
                  ) : (
                    "ルームを作成して参加"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="bg-white/95 backdrop-blur-sm border-white/50 w-[90vw] max-w-md mx-auto p-4 sm:p-6">
          <DialogHeader className="space-y-2 sm:space-y-3">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg text-gray-900">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
              プライベートルーム
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base text-gray-600">
              「{selectedRoom?.name}」に参加するにはパスワードが必要です
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2 sm:mt-4">
            <div className="space-y-2">
              <Label htmlFor="joinPassword" className="text-sm sm:text-base text-gray-700">
                パスワード
              </Label>
              <div className="relative">
                <Input
                  id="joinPassword"
                  type={showJoinPassword ? "text" : "password"}
                  placeholder="ルームのパスワードを入力..."
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                  className="pr-10 bg-white/90 backdrop-blur-sm text-sm sm:text-base"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-2 sm:px-3 py-1 sm:py-2 hover:bg-transparent"
                  onClick={() => setShowJoinPassword(!showJoinPassword)}
                >
                  {showJoinPassword ? <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" /> : <Eye className="w-3 h-3 sm:w-4 sm:h-4" />}
                </Button>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <Button 
                onClick={handlePasswordSubmit} 
                disabled={!joinPassword.trim()} 
                className="flex-1 hover:scale-105 active:scale-95 transition-transform duration-200 text-sm sm:text-base"
              >
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                参加
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowPasswordDialog(false)
                  setJoinPassword("")
                }}
                className="bg-white/70 backdrop-blur-sm border-white/50 hover:bg-white/90 text-sm sm:text-base"
              >
                キャンセル
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="p-4 sm:p-6 rounded-lg bg-white/95 backdrop-blur-sm border border-white/50 shadow-2xl w-full max-w-xs sm:max-w-sm">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-4 h-4 sm:w-6 sm:h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm sm:text-base text-gray-900">
                ルームに参加中...
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}