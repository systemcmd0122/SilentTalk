"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { ref, onValue, set, off } from "firebase/database"
import { rtdb } from "@/lib/firebase"
import { useAuth } from "@/hooks/useAuth"
import { updateUserStatus } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PhoneOff, Mic, MicOff, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface CallData {
  participants: {
    [uid: string]: {
      username: string
      typing: string
      composing: string
      lastUpdate: number
    }
  }
  status: string
  startTime: number
}

interface TextCallInterfaceProps {
  callId: string
}

export default function TextCallInterface({ callId }: TextCallInterfaceProps) {
  const { user, userProfile } = useAuth()
  const [callData, setCallData] = useState<CallData | null>(null)
  const [currentText, setCurrentText] = useState("")
  const [isComposing, setIsComposing] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const updateTimeoutRef = useRef<NodeJS.Timeout>()

  const otherParticipant =
    callData && user ? Object.entries(callData.participants).find(([uid]) => uid !== user.uid)?.[1] : null

  const updateTypingState = useCallback(
    async (text: string, composing: boolean) => {
      if (!user || !callData || isMuted) return

      try {
        const callRef = ref(rtdb, `calls/${callId}/participants/${user.uid}`)
        await set(callRef, {
          ...callData.participants[user.uid],
          typing: composing ? "" : text,
          composing: composing ? text : "",
          lastUpdate: Date.now(),
        })
      } catch (error) {
        console.error("Error updating typing state:", error)
      }
    },
    [user, callData, callId, isMuted],
  )

  const debouncedUpdate = useCallback(
    (text: string, composing: boolean) => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      updateTimeoutRef.current = setTimeout(() => {
        updateTypingState(text, composing)
      }, 100) // 100ms debounce for better performance
    },
    [updateTypingState],
  )

  useEffect(() => {
    if (!callId || !user) return

    const callRef = ref(rtdb, `calls/${callId}`)

    const handleCallData = (snapshot: any) => {
      const data = snapshot.val()
      if (data) {
        setCallData(data)
        setLoading(false)
      } else {
        setError("通話データが見つかりません")
        setLoading(false)
      }
    }

    const handleError = (error: any) => {
      console.error("Call data error:", error)
      setError("通話データの取得に失敗しました")
      setLoading(false)
    }

    onValue(callRef, handleCallData, handleError)

    return () => {
      off(callRef, "value", handleCallData)
    }
  }, [callId, user])

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setCurrentText(text)

    if (!isMuted) {
      debouncedUpdate(text, isComposing)
    }
  }

  const handleCompositionStart = () => {
    setIsComposing(true)
  }

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false)
    const text = e.currentTarget.value
    setCurrentText(text)

    if (!isMuted) {
      debouncedUpdate(text, false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      setCurrentText("")
      if (!isMuted) {
        updateTypingState("", false)
      }
    }
  }

  const endCall = async () => {
    if (!user) return

    try {
      // Update user status
      await updateUserStatus(user.uid, "online")

      // Update call status
      await set(ref(rtdb, `calls/${callId}/status`), "ended")

      router.push("/lobby")
    } catch (error) {
      console.error("Error ending call:", error)
      // Still navigate back even if there's an error
      router.push("/lobby")
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (!isMuted) {
      // Clear typing when muting
      updateTypingState("", false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>通話に接続中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => router.push("/lobby")}>ロビーに戻る</Button>
        </div>
      </div>
    )
  }

  if (!callData || !otherParticipant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">相手が通話に参加していません</p>
          <Button onClick={() => router.push("/lobby")}>ロビーに戻る</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div>
            <h1 className="text-lg font-semibold">テキスト通話中</h1>
            <p className="text-sm text-gray-500">{otherParticipant.username}さんと通話中</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={isMuted ? "destructive" : "outline"} size="sm" onClick={toggleMute}>
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isMuted ? "ミュート中" : "ミュート"}
            </Button>
            <Button variant="destructive" onClick={endCall}>
              <PhoneOff className="w-4 h-4 mr-2" />
              通話終了
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-6xl mx-auto w-full p-4 gap-4">
        {/* 相手の画面 */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-center">{otherParticipant.username}さん</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-[400px] p-4 bg-gray-50 rounded-lg">
              <div className="text-lg leading-relaxed whitespace-pre-wrap">
                {otherParticipant.composing && (
                  <span className="text-gray-500 bg-yellow-100 px-1 rounded">{otherParticipant.composing}</span>
                )}
                {otherParticipant.typing && !otherParticipant.composing && <span>{otherParticipant.typing}</span>}
                {!otherParticipant.typing && !otherParticipant.composing && (
                  <span className="text-gray-400">入力待ち...</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 自分の画面 */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-center">
              あなた ({userProfile?.username}){isMuted && <span className="text-red-500 ml-2">(ミュート中)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              ref={textareaRef}
              value={currentText}
              onChange={handleTextChange}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onKeyDown={handleKeyDown}
              placeholder={isMuted ? "ミュート中です" : "ここに入力してください..."}
              disabled={isMuted}
              className="w-full min-h-[400px] p-4 text-lg leading-relaxed resize-none border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              autoFocus
            />
            <div className="mt-2 text-sm text-gray-500">
              {isMuted ? "ミュート中 - 相手に文字が表示されません" : "入力中の文字がリアルタイムで相手に表示されます"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
