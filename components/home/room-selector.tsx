"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  MessageCircle, 
  Users, 
  Plus, 
  ArrowRight, 
  Globe, 
  Lock, 
  Unlock, 
  Zap,
  Moon,
  Sun,
  Search,
  Filter,
  Sparkles,
  Activity,
  Clock,
  Shield,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react"
import { getAvailableRooms, createRoom, type Room } from "@/lib/room-manager"

export default function RoomSelector() {
  const [username, setUsername] = useState("")
  const [newRoomName, setNewRoomName] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [roomPassword, setRoomPassword] = useState("")
  const [joinPassword, setJoinPassword] = useState("")
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [availableRooms, setAvailableRooms] = useState<Room[]>([])
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(false)
  const [creatingRoom, setCreatingRoom] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterPrivate, setFilterPrivate] = useState<boolean | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showJoinPassword, setShowJoinPassword] = useState(false)
  const [usernameError, setUsernameError] = useState("")
  const [roomNameError, setRoomNameError] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()

  // ダークモードの初期化
  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode") === "true"
    setDarkMode(savedDarkMode)
    if (savedDarkMode) {
      document.documentElement.classList.add("dark")
    }
  }, [])

  // ダークモードの切り替え
  const toggleDarkMode = useCallback(() => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem("darkMode", newDarkMode.toString())
    if (newDarkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

  // ルーム取得
  useEffect(() => {
    const unsubscribe = getAvailableRooms(setAvailableRooms)
    return unsubscribe
  }, [])

  // ルームフィルタリング
  useEffect(() => {
    let filtered = availableRooms

    if (searchQuery) {
      filtered = filtered.filter(room =>
        room.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (filterPrivate !== null) {
      filtered = filtered.filter(room => room.isPrivate === filterPrivate)
    }

    setFilteredRooms(filtered)
  }, [availableRooms, searchQuery, filterPrivate])

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

  // クイック作成
  const handleQuickCreate = useCallback(async (presetName: string) => {
    if (!validateUsername(username)) return

    setCreatingRoom(true)
    try {
      const roomId = await createRoom(presetName, false)
      const params = new URLSearchParams({
        username: username.trim(),
      })
      router.push(`/room/${roomId}?${params.toString()}`)
    } catch (error) {
      console.error("Error creating room:", error)
      alert("ルームの作成に失敗しました")
    } finally {
      setCreatingRoom(false)
    }
  }, [username, validateUsername, router])

  // ルーム更新
  const handleRefreshRooms = useCallback(() => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 1000)
  }, [])

  // ユーティリティ関数
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

  const isRoomActive = (room: Room): boolean => {
    const now = Date.now()
    const diff = now - room.lastActivity
    return diff < 300000 // 5分以内
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode 
        ? "bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900" 
        : "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"
    }`}>
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 ${
          darkMode ? "bg-blue-500" : "bg-blue-400"
        }`} />
        <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 ${
          darkMode ? "bg-purple-500" : "bg-purple-400"
        }`} />
      </div>

      <div className="relative z-10 flex items-center justify-center p-4 min-h-screen">
        <div className="w-full max-w-7xl space-y-8">
          {/* Header */}
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center gap-4">
              <div className={`p-3 rounded-full ${
                darkMode ? "bg-blue-500/20" : "bg-blue-500/10"
              }`}>
                <Globe className="w-12 h-12 text-blue-500" />
              </div>
              <h1 className={`text-5xl font-bold ${
                darkMode ? "text-white" : "text-gray-900"
              }`}>
                フリーテキスト通話
              </h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDarkMode}
                className={`ml-4 ${
                  darkMode ? "text-yellow-400 hover:text-yellow-300" : "text-gray-600 hover:text-gray-700"
                }`}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
            </div>
            
            <p className={`text-xl ${
              darkMode ? "text-gray-300" : "text-gray-600"
            }`}>
              ユーザー名だけで参加！匿名でリアルタイムテキスト通話を楽しもう
            </p>
            
            <div className="flex items-center justify-center gap-6 mt-6">
              {[
                { icon: Zap, text: "リアルタイム入力", color: "text-yellow-500" },
                { icon: Users, text: "匿名参加", color: "text-green-500" },
                { icon: MessageCircle, text: "チャット機能", color: "text-blue-500" },
                { icon: Shield, text: "安全な環境", color: "text-purple-500" },
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                  <span className={`text-sm ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}>
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Username Input */}
          <Card className={`mx-auto max-w-md ${
            darkMode ? "bg-gray-800/50 border-gray-700" : "bg-white/70 backdrop-blur"
          }`}>
            <CardHeader>
              <CardTitle className={`text-center ${
                darkMode ? "text-white" : "text-gray-900"
              }`}>
                参加情報
              </CardTitle>
              <CardDescription className={`text-center ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}>
                ユーザー名を入力してルームに参加しましょう
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className={darkMode ? "text-gray-200" : "text-gray-700"}>
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
                  className={`${
                    darkMode ? "bg-gray-700/50 border-gray-600 text-white" : "bg-white/80"
                  } ${usernameError ? "border-red-500" : ""}`}
                />
                {usernameError && (
                  <p className="text-sm text-red-500 animate-pulse">{usernameError}</p>
                )}
                <div className={`text-xs ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}>
                  {username.length}/20文字
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid xl:grid-cols-3 gap-8">
            {/* Available Rooms */}
            <Card className={`xl:col-span-2 ${
              darkMode ? "bg-gray-800/50 border-gray-700" : "bg-white/70 backdrop-blur"
            }`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className={`flex items-center gap-2 ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    <Users className="w-5 h-5" />
                    アクティブなルーム ({filteredRooms.length})
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefreshRooms}
                    disabled={isRefreshing}
                    className={darkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-700"}
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  </Button>
                </div>
                <CardDescription className={darkMode ? "text-gray-400" : "text-gray-600"}>
                  既存のルームに参加して会話を始めましょう
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filter */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="ルームを検索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`pl-10 ${
                        darkMode ? "bg-gray-700/50 border-gray-600 text-white" : "bg-white/80"
                      }`}
                    />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant={filterPrivate === false ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterPrivate(filterPrivate === false ? null : false)}
                      className="flex items-center gap-1"
                    >
                      <Unlock className="w-3 h-3" />
                      パブリック
                    </Button>
                    <Button
                      variant={filterPrivate === true ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterPrivate(filterPrivate === true ? null : true)}
                      className="flex items-center gap-1"
                    >
                      <Lock className="w-3 h-3" />
                      プライベート
                    </Button>
                  </div>
                </div>

                {/* Room List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredRooms.map((room) => {
                    const typingUsers = getTypingUsers(room)
                    const userCount = getUserCount(room)
                    const isActive = isRoomActive(room)
                    
                    return (
                      <div
                        key={room.id}
                        className={`group relative p-4 rounded-lg border transition-all duration-200 hover:shadow-lg ${
                          darkMode 
                            ? "bg-gray-700/30 border-gray-600 hover:bg-gray-700/50" 
                            : "bg-gray-50/80 border-gray-200 hover:bg-white/90"
                        }`}
                      >
                        {/* Active indicator */}
                        {isActive && (
                          <div className="absolute top-2 right-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`font-medium truncate ${
                                darkMode ? "text-white" : "text-gray-900"
                              }`}>
                                {room.name}
                              </div>
                              <div className="flex items-center gap-1">
                                {room.isPrivate ? (
                                  <Lock className="w-4 h-4 text-amber-500" />
                                ) : (
                                  <Unlock className="w-4 h-4 text-green-500" />
                                )}
                                {isActive && (
                                  <Activity className="w-4 h-4 text-green-500" />
                                )}
                              </div>
                            </div>
                            
                            <div className={`text-sm flex items-center gap-4 ${
                              darkMode ? "text-gray-400" : "text-gray-600"
                            }`}>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {userCount}人
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {getLastActivity(room)}
                              </span>
                            </div>
                            
                            {typingUsers.length > 0 && (
                              <div className="mt-2">
                                <Badge variant="outline" className="text-xs animate-pulse">
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                                    {typingUsers.slice(0, 2).join(", ")}
                                    {typingUsers.length > 2 && ` +${typingUsers.length - 2}`}が入力中
                                  </div>
                                </Badge>
                              </div>
                            )}
                          </div>
                          
                          <Button
                            size="sm"
                            onClick={() => joinRoom(room)}
                            disabled={loading || !username.trim() || !!usernameError}
                            className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ArrowRight className="w-3 h-3 mr-1" />
                            参加
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  
                  {filteredRooms.length === 0 && (
                    <div className={`text-center py-12 ${
                      darkMode ? "text-gray-400" : "text-gray-500"
                    }`}>
                      <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg mb-2">
                        {searchQuery || filterPrivate !== null 
                          ? "条件に一致するルームがありません" 
                          : "アクティブなルームがありません"
                        }
                      </p>
                      <p className="text-sm">新しいルームを作成してみましょう！</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Create New Room */}
            <Card className={`${
              darkMode ? "bg-gray-800/50 border-gray-700" : "bg-white/70 backdrop-blur"
            }`}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}>
                  <Plus className="w-5 h-5" />
                  新しいルームを作成
                </CardTitle>
                <CardDescription className={darkMode ? "text-gray-400" : "text-gray-600"}>
                  あなた専用のテキスト通話ルームを作成しましょう
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roomName" className={darkMode ? "text-gray-200" : "text-gray-700"}>
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
                    className={`${
                      darkMode ? "bg-gray-700/50 border-gray-600 text-white" : "bg-white/80"
                    } ${roomNameError ? "border-red-500" : ""}`}
                  />
                  {roomNameError && (
                    <p className="text-sm text-red-500 animate-pulse">{roomNameError}</p>
                  )}
                  <div className={`text-xs ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}>
                    {newRoomName.length}/30文字
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center gap-2">
                    {isPrivate ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    <Label htmlFor="private-room" className={darkMode ? "text-gray-200" : "text-gray-700"}>
                      プライベートルーム
                    </Label>
                  </div>
                  <Switch 
                    id="private-room" 
                    checked={isPrivate} 
                    onCheckedChange={setIsPrivate}
                  />
                </div>

                {isPrivate && (
                  <div className="space-y-2">
                    <Label htmlFor="roomPassword" className={darkMode ? "text-gray-200" : "text-gray-700"}>
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
                        className={`pr-10 ${
                          darkMode ? "bg-gray-700/50 border-gray-600 text-white" : "bg-white/80"
                        }`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleCreateRoom}
                  disabled={creatingRoom || !username.trim() || !newRoomName.trim() || !!usernameError || !!roomNameError}
                  className="w-full"
                >
                  {creatingRoom ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      作成中...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      ルームを作成して参加
                    </div>
                  )}
                </Button>

                <Separator className={darkMode ? "bg-gray-700" : "bg-gray-200"} />

                <div className="space-y-3">
                  <h4 className={`font-medium text-sm ${
                    darkMode ? "text-gray-200" : "text-gray-700"
                  }`}>
                    クイック作成
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: "雑談ルーム", icon: "💬", color: "bg-blue-500" },
                      { name: "勉強会", icon: "📚", color: "bg-green-500" },
                      { name: "作業部屋", icon: "💻", color: "bg-purple-500" },
                      { name: "フリートーク", icon: "🗣️", color: "bg-orange-500" },
                    ].map((preset) => (
                      <Button
                        key={preset.name}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickCreate(preset.name)}
                        disabled={!username.trim() || !!usernameError || creatingRoom}
                        className={`text-xs h-12 flex flex-col gap-1 ${
                          darkMode 
                            ? "border-gray-600 hover:bg-gray-700/50" 
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <span className="text-lg">{preset.icon}</span>
                        <span>{preset.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Features */}
          <Card className={`${
            darkMode ? "bg-gray-800/50 border-gray-700" : "bg-white/70 backdrop-blur"
          }`}>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-4 gap-6">
                {[
                  {
                    icon: MessageCircle,
                    title: "リアルタイム通話",
                    description: "入力中の文字が即座に相手に表示される",
                    color: "text-blue-500"
                  },
                  {
                    icon: Users,
                    title: "匿名参加",
                    description: "アカウント不要、ユーザー名だけで参加",
                    color: "text-green-500"
                  },
                  {
                    icon: Lock,
                    title: "プライベートルーム",
                    description: "パスワード付きの限定ルーム作成",
                    color: "text-amber-500"
                  },
                  {
                    icon: Globe,
                    title: "自動管理",
                    description: "空のルームは自動削除でクリーンな環境",
                    color: "text-purple-500"
                  }
                ].map((feature, index) => (
                  <div key={index} className="text-center group">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 transition-transform group-hover:scale-110 ${
                      darkMode ? "bg-gray-700/50" : "bg-gray-100"
                    }`}>
                      <feature.icon className={`w-8 h-8 ${feature.color}`} />
                    </div>
                    <h3 className={`font-medium mb-2 ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}>
                      {feature.title}
                    </h3>
                    <p className={`text-sm ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}>
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card className={`${
            darkMode ? "bg-gray-800/50 border-gray-700" : "bg-white/70 backdrop-blur"
          }`}>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    {availableRooms.length}
                  </div>
                  <div className={`text-sm ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}>
                    アクティブルーム
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    {availableRooms.reduce((sum, room) => sum + getUserCount(room), 0)}
                  </div>
                  <div className={`text-sm ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}>
                    オンラインユーザー
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    {availableRooms.filter(room => !room.isPrivate).length}
                  </div>
                  <div className={`text-sm ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}>
                    パブリックルーム
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    {availableRooms.filter(room => isRoomActive(room)).length}
                  </div>
                  <div className={`text-sm ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}>
                    アクティブ中
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className={`text-center text-sm ${
            darkMode ? "text-gray-400" : "text-gray-500"
          }`}>
            <p>© 2024 フリーテキスト通話 - 安全で楽しいリアルタイムコミュニケーション</p>
          </div>
        </div>
      </div>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className={`${
          darkMode ? "bg-gray-800 border-gray-700" : "bg-white"
        }`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}>
              <Lock className="w-5 h-5 text-amber-500" />
              プライベートルーム
            </DialogTitle>
            <DialogDescription className={darkMode ? "text-gray-400" : "text-gray-600"}>
              「{selectedRoom?.name}」に参加するにはパスワードが必要です
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="joinPassword" className={darkMode ? "text-gray-200" : "text-gray-700"}>
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
                  className={`pr-10 ${
                    darkMode ? "bg-gray-700/50 border-gray-600 text-white" : "bg-white"
                  }`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowJoinPassword(!showJoinPassword)}
                >
                  {showJoinPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handlePasswordSubmit} 
                disabled={!joinPassword.trim()} 
                className="flex-1"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                参加
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowPasswordDialog(false)
                  setJoinPassword("")
                }}
                className={darkMode ? "border-gray-600 text-gray-300 hover:bg-gray-700" : ""}
              >
                キャンセル
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-lg ${
            darkMode ? "bg-gray-800" : "bg-white"
          }`}>
            <div className="flex items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
              <span className={darkMode ? "text-white" : "text-gray-900"}>
                ルームに参加中...
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}