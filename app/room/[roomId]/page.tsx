"use client"

import { use, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Users, MessageCircle, ArrowRight, Lock, Unlock } from "lucide-react"
import TextCallRoom from "@/components/room/text-call-room"
import { listenToRoom, type Room } from "@/lib/room-manager"

interface RoomPageProps {
  params: Promise<{
    roomId: string
  }>
}

export default function RoomPage({ params }: RoomPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [username, setUsername] = useState<string | null>(null)
  const [password, setPassword] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [showUsernameInput, setShowUsernameInput] = useState(false)
  const [inputUsername, setInputUsername] = useState("")
  const [inputPassword, setInputPassword] = useState("")
  const [room, setRoom] = useState<Room | null>(null)
  const [roomLoading, setRoomLoading] = useState(true)
  const [roomError, setRoomError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  
  // React.use()を使ってparamsを非同期で取得
  const resolvedParams = use(params)

  // ルーム情報を取得
  useEffect(() => {
    let unsubscribe: (() => void) | null = null

    const loadRoomInfo = () => {
      unsubscribe = listenToRoom(resolvedParams.roomId, (roomData) => {
        if (roomData) {
          setRoom(roomData)
          setRoomError(null)
        } else {
          setRoomError("ルームが見つかりません")
        }
        setRoomLoading(false)
      })
    }

    loadRoomInfo()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [resolvedParams.roomId])

  useEffect(() => {
    // 重複実行を防ぐ - searchParamsが変更されない限り実行しない
    const usernameParam = searchParams.get("username")
    const passwordParam = searchParams.get("password")

    // ユーザー名がない場合は入力画面を表示
    if (!usernameParam) {
      setShowUsernameInput(true)
      setIsInitialized(true)
      return
    }

    // 値が変更された場合のみ更新
    if (username !== usernameParam || password !== passwordParam) {
      setUsername(usernameParam)
      setPassword(passwordParam)
      setShowUsernameInput(false)
      setIsInitialized(true)
    }
  }, [searchParams, router, username, password])

  const handleJoinRoom = () => {
    if (!inputUsername.trim()) {
      alert("ユーザー名を入力してください")
      return
    }

    if (inputUsername.length < 2) {
      alert("ユーザー名は2文字以上で入力してください")
      return
    }

    if (room?.isPrivate && !inputPassword.trim()) {
      alert("このルームはプライベートルームです。パスワードを入力してください")
      return
    }

    setJoining(true)
    
    // URLパラメータを更新してルームに参加
    const params = new URLSearchParams({
      username: inputUsername.trim(),
      ...(room?.isPrivate && inputPassword.trim() && { password: inputPassword.trim() }),
    })
    
    // 現在のURLを更新（リロードなし）
    const newUrl = `/room/${resolvedParams.roomId}?${params.toString()}`
    window.history.replaceState({}, '', newUrl)
    
    // 状態を更新してルームコンポーネントを表示
    setUsername(inputUsername.trim())
    setPassword(inputPassword.trim() || null)
    setShowUsernameInput(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleJoinRoom()
    }
  }

  const getUserCount = (room: Room): number => {
    return Object.keys(room.users).length
  }

  // ローディング中
  if (!isInitialized || roomLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    )
  }

  // ルームエラー
  if (roomError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-red-600">エラー</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">{roomError}</p>
            <Button onClick={() => router.push("/")} className="w-full">
              ホームに戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ユーザー名入力画面
  if (showUsernameInput) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* ルーム情報 */}
          {room && (
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <MessageCircle className="w-6 h-6 text-blue-500" />
                  {room.name}
                </CardTitle>
                <CardDescription className="flex items-center justify-center gap-4">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {getUserCount(room)}人参加中
                  </span>
                  {room.isPrivate ? (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      プライベート
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Unlock className="w-3 h-3" />
                      パブリック
                    </Badge>
                  )}
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* ユーザー名入力 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">ルームに参加</CardTitle>
              <CardDescription className="text-center">
                ユーザー名を入力してルームに参加しましょう
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">ユーザー名</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="あなたの名前を入力..."
                  value={inputUsername}
                  onChange={(e) => setInputUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                  maxLength={20}
                  autoFocus
                />
              </div>

              {room?.isPrivate && (
                <div className="space-y-2">
                  <Label htmlFor="password">パスワード</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="ルームのパスワードを入力..."
                    value={inputPassword}
                    onChange={(e) => setInputPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    maxLength={20}
                  />
                </div>
              )}

              <Button
                onClick={handleJoinRoom}
                disabled={joining || !inputUsername.trim() || (room?.isPrivate && !inputPassword.trim())}
                className="w-full"
              >
                {joining ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    参加中...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    ルームに参加
                  </>
                )}
              </Button>

              <div className="text-center">
                <Button variant="ghost" onClick={() => router.push("/")} className="text-sm">
                  ホームに戻る
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 機能説明 */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <MessageCircle className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                  <h3 className="font-medium mb-1 text-sm">リアルタイム通話</h3>
                  <p className="text-xs text-gray-600">入力中の文字が即座に表示</p>
                </div>
                <div>
                  <Users className="w-6 h-6 mx-auto mb-2 text-green-500" />
                  <h3 className="font-medium mb-1 text-sm">匿名参加</h3>
                  <p className="text-xs text-gray-600">アカウント不要で参加</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ユーザー名が設定されている場合はルームコンポーネントを表示
  if (!username) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    )
  }

  return <TextCallRoom roomId={resolvedParams.roomId} username={username} password={password || undefined} />
}