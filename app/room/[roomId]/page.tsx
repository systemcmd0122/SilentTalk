"use client"

import { use, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  
  // React.use()を使ってparamsを非同期で取得
  const resolvedParams = use(params)

  useEffect(() => {
    // 重複実行を防ぐ - searchParamsが変更されない限り実行しない
    const usernameParam = searchParams.get("username")
    const passwordParam = searchParams.get("password")

    if (!usernameParam) {
      router.push("/")
      return
    }

    // 値が変更された場合のみ更新
    if (username !== usernameParam || password !== passwordParam) {
      setUsername(usernameParam)
      setPassword(passwordParam)
      setIsInitialized(true)
    }
  }, [searchParams, router, username, password])

  if (!isInitialized || !username) {
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