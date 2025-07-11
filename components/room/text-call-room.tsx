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
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  AlertTriangle,
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
  cleanupUser,
  type Room,
  type ChatMessage,
  type User,
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
  const [kickedDialogOpen, setKickedDialogOpen] = useState(false)
  const [connectionLost, setConnectionLost] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())

  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const updateTimeoutRef = useRef<NodeJS.Timeout>()
  const cleanupRef = useRef<(() => void) | null>(null)
  const lastMessageCountRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const mountedRef = useRef(true)

  const currentUser = room && currentUserId ? room.users[currentUserId] : null

  // キックイベントリスナー
  useEffect(() => {
    const handleUserKicked = (event: CustomEvent) => {
      const { userId: kickedUserId, username: kickedUsername } = event.detail
      if (kickedUserId === currentUserId) {
        setKickedDialogOpen(true)
        setIsJoined(false)
      }
    }

    window.addEventListener('userKicked', handleUserKicked as EventListener)
    return () => {
      window.removeEventListener('userKicked', handleUserKicked as EventListener)
    }
  }, [currentUserId])

  // 接続状態の監視
  useEffect(() => {
    const handleOnline = () => {
      if (connectionLost && isJoined) {
        setIsReconnecting(true)
        attemptReconnection()
      }
    }

    const handleOffline = () => {
      setConnectionLost(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [connectionLost, isJoined])

  // 再接続処理
  const attemptReconnection = useCallback(async () => {
    if (!mountedRef.current) return

    try {
      if (currentUserId) {
        await cleanupUser(roomId, currentUserId)
      }
      
      const result = await joinRoom(roomId, username, password)
      if (result.success && result.userId) {
        setCurrentUserId(result.userId)
        setConnectionLost(false)
        setIsReconnecting(false)
        setError(null)
      } else {
        throw new Error(result.error || "再接続に失敗しました")
      }
    } catch (error) {
      console.error("Reconnection failed:", error)
      setError("接続が失われました。再接続を試行中...")
      
      // 5秒後に再試行
      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          attemptReconnection()
        }
      }, 5000)
    }
  }, [roomId, username, password, currentUserId])

  // タイピング状態の更新
  const updateTypingState = useCallback(
    async (text: string, composing: boolean) => {
      if (!currentUserId || isMuted || !isJoined || connectionLost) return

      try {
        await updateTyping(roomId, currentUserId, composing ? "" : text, composing ? text : "")
        
        // タイピング状態のタイムアウト管理
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }
        
        const isTyping = text.length > 0 || composing
        if (isTyping) {
          setTypingUsers(prev => new Set(prev).add(currentUserId))
          
          // 3秒後にタイピング状態をクリア
          typingTimeoutRef.current = setTimeout(() => {
            setTypingUsers(prev => {
              const newSet = new Set(prev)
              newSet.delete(currentUserId)
              return newSet
            })
            
            if (currentUserId && mountedRef.current) {
              updateTyping(roomId, currentUserId, "", "").catch(console.error)
            }
          }, 3000)
        } else {
          setTypingUsers(prev => {
            const newSet = new Set(prev)
            newSet.delete(currentUserId)
            return newSet
          })
        }
      } catch (error) {
        console.error("Error updating typing state:", error)
        // 接続エラーの場合は接続状態をチェック
        if (error instanceof Error && error.message.includes('permission')) {
          setConnectionLost(true)
        }
      }
    },
    [roomId, currentUserId, isMuted, isJoined, connectionLost],
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
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10
      setAutoScroll(isAtBottom)
    }
  }, [])

  // ルーム初期化とリスナー設定
  useEffect(() => {
    let roomUnsubscribe: (() => void) | null = null
    let messagesUnsubscribe: (() => void) | null = null
    let joinedUserId: string | null = null

    const initializeRoom = async () => {
      if (!mountedRef.current) return

      try {
        const result = await joinRoom(roomId, username, password)
        if (!mountedRef.current) return

        if (result.success && result.userId) {
          setCurrentUserId(result.userId)
          setIsJoined(true)
          joinedUserId = result.userId
          setLoading(false)
          setError(null)
        } else {
          setError(result.error || "ルームへの参加に失敗しました")
          setLoading(false)
        }
      } catch (error) {
        if (!mountedRef.current) return
        console.error("Error joining room:", error)
        setError("ルームへの参加に失敗しました")
        setLoading(false)
      }
    }

    // ルームデータのリスナー
    roomUnsubscribe = listenToRoom(roomId, (roomData) => {
      if (!mountedRef.current) return
      
      if (roomData) {
        setRoom(roomData)
        setConnectionLost(false)
        
        // 自分がルームから削除されているかチェック
        if (currentUserId && !roomData.users[currentUserId]) {
          // キックされたユーザーリストをチェック
          const kickedUser = roomData.kickedUsers && Object.values(roomData.kickedUsers).find(
            (kicked: any) => kicked.username === username
          )
          
          if (kickedUser) {
            setKickedDialogOpen(true)
            setIsJoined(false)
          } else {
            // 通常の切断の場合は再接続を試行
            setConnectionLost(true)
          }
        }
        
        // 他のユーザーのタイピング状態を更新
        const currentTypingUsers = new Set<string>()
        Object.values(roomData.users).forEach((user: User) => {
          if (user.id !== currentUserId && (user.typing || user.composing)) {
            currentTypingUsers.add(user.id)
          }
        })
        setTypingUsers(currentTypingUsers)
      } else {
        setRoom(null)
        setConnectionLost(true)
      }
    })

    // メッセージのリスナー
    messagesUnsubscribe = listenToMessages(roomId, (messagesData) => {
      if (!mountedRef.current) return
      setMessages(messagesData)
    })

    // ルームに参加
    initializeRoom()

    // クリーンアップ関数を設定
    cleanupRef.current = () => {
      if (roomUnsubscribe) roomUnsubscribe()
      if (messagesUnsubscribe) messagesUnsubscribe()
      if (joinedUserId && mountedRef.current) {
        leaveRoom(roomId, joinedUserId, username)
      }
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
      }
    }
  }, [roomId, username, password, currentUserId])

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

  // コンポーネントのアンマウント時
  useEffect(() => {
    return () => {
      mountedRef.current = false
      
      // タイムアウトのクリア
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setCurrentText(text)

    if (!isMuted && isJoined && !connectionLost) {
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

    if (!isMuted && isJoined && !connectionLost) {
      debouncedUpdate(text, false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      setCurrentText("")
      if (!isMuted && isJoined && !connectionLost) {
        updateTypingState("", false)
      }
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatMessage.trim() || !currentUserId || !currentUser || !isJoined || connectionLost) return

    try {
      await sendChatMessage(roomId, currentUserId, username, chatMessage.trim(), currentUser.color)
      setChatMessage("")
      // 送信後にフォーカスを入力フィールドに戻す
      if (chatInputRef.current) {
        chatInputRef.current.focus()
      }
    } catch (error) {
      console.error("Error sending message:", error)
      setConnectionLost(true)
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

  const handleKickedDialogClose = () => {
    setKickedDialogOpen(false)
    router.push("/")
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (!isMuted && isJoined && !connectionLost) {
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

  // キックされたユーザーへの通知ダイアログ
  const KickedDialog = () => (
    <AlertDialog open={kickedDialogOpen} onOpenChange={setKickedDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            ルームから除名されました
          </AlertDialogTitle>
          <AlertDialogDescription>
            あなたはこのルームから除名されました。ルームに再参加することはできません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogAction onClick={handleKickedDialogClose}>
          ホームに戻る
        </AlertDialogAction>
      </AlertDialogContent>
    </AlertDialog>
  )

  // 接続状態の表示
  const ConnectionStatus = () => {
    if (connectionLost) {
      return (
        <div className="bg-red-100 border border-red-300 rounded-md p-3 mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-red-700 text-sm">
              {isReconnecting ? "再接続中..." : "接続が切断されました"}
            </span>
          </div>
        </div>
      )
    }
    return null
  }

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

  if (error && !connectionLost) {
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
      <KickedDialog />
      
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex-shrink-0">
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
                {typingUsers.size > 0 && (
                  <span className="text-blue-500">
                    {typingUsers.size}人が入力中
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={showChat ? "default" : "outline"} 
              size="sm" 
              onClick={() => setShowChat(!showChat)}
              className="relative"
              disabled={connectionLost}
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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={copyRoomLink}
              disabled={connectionLost}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "コピー済み" : "リンクをコピー"}
            </Button>
            <Button 
              variant={isMuted ? "destructive" : "outline"} 
              size="sm" 
              onClick={toggleMute}
              disabled={connectionLost}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isMuted ? "ミュート中" : "ミュート"}
            </Button>
            {isRoomOwner && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={connectionLost}>
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

      <div className="flex-1 flex max-w-6xl mx-auto w-full p-4 gap-4 overflow-hidden">
        {/* 参加者一覧 */}
        <Card className="w-80 flex-shrink-0 flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="text-sm">参加者 ({room ? Object.keys(room.users).length : 0})</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            <ConnectionStatus />
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
                {connectionLost && (
                  <Badge variant="destructive" className="text-xs">
                    切断
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
                  {(user.typing || user.composing || typingUsers.has(user.id)) && (
                    <Badge variant="outline" className="text-xs">
                      入力中
                    </Badge>
                  )}
                  {isRoomOwner && !connectionLost && (
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
        <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-hidden">
          {/* チャットエリア */}
          {showChat && (
            <Card className={`flex-shrink-0 ${chatExpanded ? 'h-96' : 'h-64'} flex flex-col`}>
              <CardHeader className="flex-shrink-0 pb-2">
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
              <CardContent className="flex-1 flex flex-col p-4 pt-0 min-h-0">
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
                <div className="flex-shrink-0 border-t pt-4">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
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
                </div>
              </CardContent>
            </Card>
          )}

          {/* 他の参加者の入力表示 */}
          {otherUsers.length > 0 && (
            <div
              className="flex-shrink-0 grid gap-4"
              style={{ gridTemplateColumns: `repeat(${Math.min(otherUsers.length, 2)}, 1fr)` }}
            >
              {otherUsers.slice(0, 4).map((user, index) => (
                <Card key={user.id || `user-${index}`} className="min-h-0">
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
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="flex-shrink-0">
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
            <CardContent className="flex-1 flex flex-col min-h-0">
              <textarea
                ref={textareaRef}
                value={currentText}
                onChange={handleTextChange}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                onKeyDown={handleKeyDown}
                placeholder={isMuted ? "ミュート中です" : "ここに入力してください..."}
                disabled={isMuted}
                className="flex-1 w-full p-4 text-base leading-relaxed resize-none border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 min-h-[200px]"
                autoFocus
              />
              <div className="flex-shrink-0 mt-2 text-sm text-gray-500">
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