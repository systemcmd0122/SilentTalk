"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { ref, push, onValue, serverTimestamp, query, orderByChild } from "firebase/database"
import { rtdb } from "@/lib/firebase"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, MessageCircle } from "lucide-react"

interface Message {
  id: string
  text: string
  senderId: string
  senderName: string
  timestamp: number
}

interface ChatWindowProps {
  friendId: string | null
  friendName: string | null
}

export default function ChatWindow({ friendId, friendName }: ChatWindowProps) {
  const { user, userProfile } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const chatId = user && friendId ? [user.uid, friendId].sort().join("_") : null

  useEffect(() => {
    if (!chatId) {
      setMessages([])
      return
    }

    const messagesRef = ref(rtdb, `chats/${chatId}/messages`)
    const messagesQuery = query(messagesRef, orderByChild("timestamp"))

    const unsubscribe = onValue(messagesQuery, (snapshot) => {
      const messagesData: Message[] = []
      snapshot.forEach((childSnapshot) => {
        messagesData.push({
          id: childSnapshot.key!,
          ...childSnapshot.val(),
        })
      })
      setMessages(messagesData)
    })

    return () => unsubscribe()
  }, [chatId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !chatId || !user || !userProfile) return

    setLoading(true)
    try {
      const messagesRef = ref(rtdb, `chats/${chatId}/messages`)
      await push(messagesRef, {
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: userProfile.username,
        timestamp: serverTimestamp(),
      })
      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!friendId || !friendName) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">チャットを開始</h3>
          <p>左側からフレンドを選択してチャットを開始しましょう</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <Card className="flex-1 flex flex-col m-4">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            {friendName}とのチャット
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderId === user?.uid ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.senderId === user?.uid ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"
                  }`}
                >
                  <div className="text-sm font-medium mb-1">{message.senderName}</div>
                  <div>{message.text}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={sendMessage} className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="メッセージを入力..."
                disabled={loading}
                className="flex-1"
              />
              <Button type="submit" disabled={loading || !newMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
