"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  LogOut,
  Users,
  Mic,
  MicOff,
  Copy,
  Check,
  Send,
  MessageSquare,
  Settings,
  UserX,
  Trash2,
  Crown,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import {
  joinRoom,
  leaveRoom,
  updateTyping,
  listenToRoom,
  listenToMessages,
  sendChatMessage,
  kickUser,
  clearRoomMessages,
  type Room,
  type ChatMessage,
} from "@/lib/room-manager"

interface TextCallRoomProps {
  roomId: string
  username: string
  password?: string
}

export default function TextCallRoom({ roomId, username, password }: TextCallRoomProps) {
  const [room, setRoom] = useState<Room | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentText, setCurrentText] = useState("")
  const [chatMessage, setChatMessage] = useState("")
  const [isComposing, setIsComposing] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [chatExpanded, setChatExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isJoined, setIsJoined] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const updateTimeoutRef = useRef<NodeJS.Timeout>()
  const cleanupRef = useRef<(() => void) | null>(null)
  const lastMessageCountRef = useRef(0)

  const currentUser = room && currentUserId ? room.users[currentUserId] : null

  const updateTypingState = useCallback(
    async (text: string, composing: boolean) => {
      if (!currentUserId || isMuted || !isJoined) return

      try {
        await updateTyping(roomId, currentUserId, composing ? "" : text, composing ? text : "")
      } catch (error) {
        console.error("Error updating typing state:", error)
      }
    },
    [roomId, currentUserId, isMuted, isJoined],
  )

  const debouncedUpdate = useCallback(
    (text: string, composing: boolean) => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      updateTimeoutRef.current = setTimeout(() => {
        updateTypingState(text, composing)
      }, 100)
    },
    [updateTypingState],
  )

  // チャットの自動スクロール処理
  const scrollToBottom = useCallback(() => {
    if (chatScrollRef.current && autoScroll) {
      const scrollContainer = chatScrollRef.current
      scrollContainer.scrollTop = scrollContainer.scrollHeight
    }
  }, [autoScroll])

  // チャットスクロール監視
  const handleChatScroll = useCallback(() => {
    if (chatScrollRef.current) {
      const scrollContainer = chatScrollRef.current
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10 // 10px の余裕を持たせる
      setAutoScroll(isAtBottom)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    let roomUnsubscribe: (() => void) | null = null
    let messagesUnsubscribe: (() => void) | null = null
    let joinedUserId: string | null = null

    const initializeRoom = async () => {
      if (!mounted) return

      try {
        const result = await joinRoom(roomId, username, password)
        if (!mounted) return

        if (result.success && result.userId) {
          setCurrentUserId(result.userId)
          setIsJoined(true)
          joinedUserId = result.userId
          setLoading(false)
        } else {
          setError(result.error || "ルームへの参加に失敗しました")
          setLoading(false)
        }
      } catch (error) {
        if (!mounted) return
        console.error("Error joining room:", error)
        setError("ルームへの参加に失敗しました")
        setLoading(false)
      }
    }

    // リスナーを設定
    roomUnsubscribe = listenToRoom(roomId, (roomData) => {
      if (!mounted) return
      setRoom(roomData)
    })

    messagesUnsubscribe = listenToMessages(roomId, (messagesData) => {
      if (!mounted) return
      setMessages(messagesData)
    })

    // ルームに参加
    initializeRoom()

    // クリーンアップ関数を設定
    cleanupRef.current = () => {
      if (roomUnsubscribe) roomUnsubscribe()
      if (messagesUnsubscribe) messagesUnsubscribe()
      if (joinedUserId) {
        leaveRoom(roomId, joinedUserId, username)
      }
    }

    return () => {
      mounted = false
      if (cleanupRef.current) {
        cleanupRef.current()
      }
    }
  }, [roomId, username, password])

  // メッセージが更新されたときの処理
  useEffect(() => {
    const newMessageCount = messages.length
    const hasNewMessages = newMessageCount > lastMessageCountRef.current
    
    if (hasNewMessages) {
      // チャットが非表示の場合、未読カウントを増やす
      if (!showChat) {
        setUnreadMessages(prev => prev + (newMessageCount - lastMessageCountRef.current))
      }
      
      // 自動スクロール
      setTimeout(scrollToBottom, 100)
    }
    
    lastMessageCountRef.current = newMessageCount
  }, [messages, showChat, scrollToBottom])

  // チャットを開いたときに未読カウントをリセット
  useEffect(() => {
    if (showChat) {
      setUnreadMessages(0)
      setTimeout(scrollToBottom, 100)
    }
  }, [showChat, scrollToBottom])

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setCurrentText(text)

    if (!isMuted && isJoined) {
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

    if (!isMuted && isJoined) {
      debouncedUpdate(text, false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      setCurrentText("")
      if (!isMuted && isJoined) {
        updateTypingState("", false)
      }
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatMessage.trim() || !currentUserId || !currentUser || !isJoined) return

    try {
      await sendChatMessage(roomId, currentUserId, username, chatMessage.trim(), currentUser.color)
      setChatMessage("")
      // 送信後にフォーカスを入力フィールドに戻す
      if (chatInputRef.current) {
        chatInputRef.current.focus()
      }
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const handleChatMessageKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  const leaveRoomHandler = async () => {
    if (currentUserId && isJoined) {
      await leaveRoom(roomId, currentUserId, username)
      setIsJoined(false)
    }
    router.push("/")
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (!isMuted && isJoined) {
      updateTypingState("", false)
    }
  }

  const copyRoomLink = () => {
    const link = `${window.location.origin}/room/${roomId}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleKickUser = async (userId: string, targetUsername: string) => {
    if (currentUserId && userId !== currentUserId && isJoined) {
      await kickUser(roomId, userId, targetUsername)
    }
  }

  const handleClearMessages = async () => {
    if (isJoined) {
      await clearRoomMessages(roomId)
    }
  }

  const toggleChatExpanded = () => {
    setChatExpanded(!chatExpanded)
    setTimeout(scrollToBottom, 100)
  }

  const otherUsers = room ? Object.values(room.users).filter((user) => user.id !== currentUserId) : []
  const isRoomOwner = currentUser && room && Object.values(room.users)[0]?.id === currentUserId

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>ルームに参加中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => router.push("/")}>ホームに戻る</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                {room?.name || "テキスト通話ルーム"}
                {room?.isPrivate && <Badge variant="secondary">プライベート</Badge>}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {room ? Object.keys(room.users).length : 0}人参加中
                </span>
                <span>あなた: {username}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={showChat ? "default" : "outline"} 
              size="sm" 
              onClick={() => setShowChat(!showChat)}
              className="relative"
            >
              <MessageSquare className="w-4 h-4" />
              チャット
              {unreadMessages > 0 && !showChat && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 px-1 py-0 text-xs min-w-[20px] h-5 flex items-center justify-center"
                >
                  {unreadMessages > 99 ? '99+' : unreadMessages}
                </Badge>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={copyRoomLink}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "コピー済み" : "リンクをコピー"}
            </Button>
            <Button variant={isMuted ? "destructive" : "outline"} size="sm" onClick={toggleMute}>
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isMuted ? "ミュート中" : "ミュート"}
            </Button>
            {isRoomOwner && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Crown className="w-5 h-5" />
                      ルーム管理
                    </DialogTitle>
                    <DialogDescription>ルームオーナーとして管理機能を使用できます</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Button variant="destructive" onClick={handleClearMessages} className="w-full">
                      <Trash2 className="w-4 h-4 mr-2" />
                      チャット履歴をクリア
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <Button variant="outline" onClick={leaveRoomHandler}>
              <LogOut className="w-4 h-4 mr-2" />
              退出
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-6xl mx-auto w-full p-4 gap-4">
        {/* 参加者一覧 */}
        <Card className="w-80">
          <CardHeader>
            <CardTitle className="text-sm">参加者 ({room ? Object.keys(room.users).length : 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* 自分 */}
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                  style={{ backgroundColor: currentUser?.color || "#3B82F6" }}
                >
                  {username ? username.charAt(0).toUpperCase() : "?"}
                </div>
                <span className="text-sm font-medium flex-1">{username} (あなた)</span>
                {isRoomOwner && <Crown className="w-4 h-4 text-amber-500" />}
                {isMuted && (
                  <Badge variant="secondary" className="text-xs">
                    ミュート
                  </Badge>
                )}
              </div>

              <Separator />

              {/* 他の参加者 */}
              {otherUsers.map((user, index) => (
                <div key={user.id || `other-user-${index}`} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded group">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.username ? user.username.charAt(0).toUpperCase() : "?"}
                  </div>
                  <span className="text-sm flex-1">{user.username || "Unknown"}</span>
                  {(user.typing || user.composing) && (
                    <Badge variant="outline" className="text-xs">
                      入力中
                    </Badge>
                  )}
                  {isRoomOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleKickUser(user.id, user.username || "Unknown")}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <UserX className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}

              {otherUsers.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">他の参加者を待っています</p>
                  <p className="text-xs">リンクを共有して友達を招待しましょう</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* メインエリア */}
        <div className="flex-1 flex flex-col gap-4">
          {/* チャットエリア */}
          {showChat && (
            <Card className={`transition-all duration-300 ${chatExpanded ? 'h-96' : 'h-64'}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">チャット</CardTitle>
                  <div className="flex items-center gap-2">
                    {!autoScroll && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={scrollToBottom}
                        className="text-xs"
                      >
                        最新へ
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={toggleChatExpanded}
                    >
                      {chatExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col h-full p-4 pt-0">
                <div 
                  className="flex-1 overflow-y-auto mb-4 pr-2"
                  ref={chatScrollRef}
                  onScroll={handleChatScroll}
                  style={{ 
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#cbd5e1 #f1f5f9'
                  }}
                >
                  <div className="space-y-3">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">まだメッセージがありません</p>
                        <p className="text-xs">最初のメッセージを送信しましょう</p>
                      </div>
                    ) : (
                      messages.map((message, index) => (
                        <div key={message.id || `message-${index}`} className="text-sm">
                          {message.userId === "system" ? (
                            <div className="text-center text-gray-500 italic py-2 border-l-2 border-gray-300 pl-3 bg-gray-50 rounded">
                              {message.text}
                            </div>
                          ) : (
                            <div className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 mt-1"
                                style={{ backgroundColor: message.color }}
                              >
                                {message.username ? message.username.charAt(0).toUpperCase() : "?"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm" style={{ color: message.color }}>
                                    {message.username || "Unknown"}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {new Date(message.timestamp).toLocaleTimeString("ja-JP", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                                  {message.text}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <form onSubmit={handleSendMessage} className="flex gap-2 border-t pt-4">
                  <Input
                    ref={chatInputRef}
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={handleChatMessageKeyDown}
                    placeholder="メッセージを入力... (Enter: 送信)"
                    className="flex-1"
                    autoComplete="off"
                  />
                  <Button 
                    type="submit" 
                    size="sm" 
                    disabled={!chatMessage.trim()}
                    className="px-4"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* 他の参加者の入力表示 */}
          {otherUsers.length > 0 && (
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${Math.min(otherUsers.length, 2)}, 1fr)` }}
            >
              {otherUsers.slice(0, 4).map((user, index) => (
                <Card key={user.id || `user-${index}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                        style={{ backgroundColor: user.color }}
                      >
                        {user.username ? user.username.charAt(0).toUpperCase() : "?"}
                      </div>
                      {user.username || "Unknown"}
                      {user.isTyping && (
                        <Badge variant="outline" className="text-xs">
                          入力中
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="min-h-[200px] p-3 bg-gray-50 rounded-lg">
                      <div className="text-base leading-relaxed whitespace-pre-wrap">
                        {user.composing && (
                          <span key={`composing-${user.id || index}`} className="text-gray-500 bg-yellow-100 px-1 rounded">{user.composing}</span>
                        )}
                        {user.typing && !user.composing && <span key={`typing-${user.id || index}`}>{user.typing}</span>}
                        {!user.typing && !user.composing && <span key={`waiting-${user.id || index}`} className="text-gray-400">入力待ち...</span>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* 自分の入力エリア */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                  style={{ backgroundColor: currentUser?.color || "#3B82F6" }}
                >
                  {username ? username.charAt(0).toUpperCase() : "?"}
                </div>
                あなた ({username})
                {isMuted && (
                  <Badge variant="destructive" className="text-xs">
                    ミュート中
                  </Badge>
                )}
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
                className="w-full min-h-[300px] p-4 text-base leading-relaxed resize-none border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                autoFocus
              />
              <div className="mt-2 text-sm text-gray-500">
                {isMuted
                  ? "ミュート中 - 他の参加者に文字が表示されません"
                  : "入力中の文字がリアルタイムで他の参加者に表示されます"}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}