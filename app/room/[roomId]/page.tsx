"use client"

import { use, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Users, Lock } from "lucide-react"
import TextCallRoom from "@/components/room/text-call-room"

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
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // React.use()を使ってparamsを非同期で取得
  const resolvedParams = use(params)

  useEffect(() => {
    const usernameParam = searchParams.get("username")
    const passwordParam = searchParams.get("password")

    if (!usernameParam) {
      // ユーザー名がない場合は入力画面を表示
      setShowUsernameInput(true)
      setPassword(passwordParam)
      setIsInitialized(true)
    } else {
      // ユーザー名がある場合は直接ルームに入る
      setUsername(usernameParam)
      setPassword(passwordParam)
      setIsInitialized(true)
    }
  }, [searchParams])

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inputUsername.trim()) {
      setError("ユーザー名を入力してください")
      return
    }

    if (inputUsername.trim().length > 20) {
      setError("ユーザー名は20文字以内で入力してください")
      return
    }

    setIsJoining(true)
    setError(null)

    try {
      // ユーザー名とパスワードを設定してルームに入る
      setUsername(inputUsername.trim())
      setPassword(inputPassword || null)
      setShowUsernameInput(false)
    } catch (error) {
      console.error("Error joining room:", error)
      setError("ルームへの参加に失敗しました")
    } finally {
      setIsJoining(false)
    }
  }

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputUsername(e.target.value)
    if (error) setError(null)
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputPassword(e.target.value)
  }

  const handleBackToHome = () => {
    router.push("/")
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  // ユーザー名入力画面
  if (showUsernameInput) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-xl">ルームに参加</CardTitle>
            <p className="text-gray-600 text-sm mt-2">
              ルームに参加するにはユーザー名を入力してください
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">ユーザー名</Label>
                <Input
                  id="username"
                  type="text"
                  value={inputUsername}
                  onChange={handleUsernameChange}
                  placeholder="ユーザー名を入力"
                  maxLength={20}
                  required
                  autoFocus
                  disabled={isJoining}
                />
                <p className="text-xs text-gray-500">
                  {inputUsername.length}/20文字
                </p>
              </div>

              {password && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    パスワード
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={inputPassword}
                    onChange={handlePasswordChange}
                    placeholder="パスワードを入力"
                    disabled={isJoining}
                  />
                  <p className="text-xs text-gray-500">
                    このルームはパスワードで保護されています
                  </p>
                </div>
              )}

              {error && (
                <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isJoining || !inputUsername.trim()}
                >
                  {isJoining ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      参加中...
                    </>
                  ) : (
                    "ルームに参加"
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={handleBackToHome}
                  disabled={isJoining}
                >
                  ホームに戻る
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ルームコンポーネントを表示
  if (username) {
    return <TextCallRoom roomId={resolvedParams.roomId} username={username} password={password || undefined} />
  }

  // 何らかのエラーが発生した場合
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <p className="text-red-500 mb-4">エラーが発生しました</p>
        <Button onClick={handleBackToHome}>ホームに戻る</Button>
      </div>
    </div>
  )
}