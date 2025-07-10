import { ref, set, push, onValue, off, remove, onDisconnect, update, get } from "firebase/database"
import { rtdb } from "./firebase"

export interface User {
  id: string
  username: string
  typing: string
  composing: string
  lastUpdate: number
  joinedAt: number
  isTyping: boolean
  color: string
}

export interface Room {
  id: string
  name: string
  users: { [userId: string]: User }
  createdAt: number
  lastActivity: number
  messageCount: number
  isPrivate: boolean
  password?: string
}

export interface ChatMessage {
  id: string
  userId: string
  username: string
  text: string
  timestamp: number
  color: string
  type?: "join" | "leave" | "system"
}

const USER_COLORS = [
  "#3B82F6", // blue
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#06B6D4", // cyan
  "#F97316", // orange
  "#84CC16", // lime
]

// アクティブなユーザーセッションを追跡（より厳密な管理）
const activeUserSessions = new Map<string, { userId: string; timestamp: number }>()

// 重複参加を防ぐためのフラグ
const joiningUsers = new Set<string>()

export const generateUserId = (): string => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export const generateUserColor = (): string => {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]
}

export const joinRoom = async (
  roomId: string,
  username: string,
  password?: string,
  isRoomCreator: boolean = false
): Promise<{ success: boolean; userId?: string; error?: string }> => {
  try {
    // セッションキーを生成してユーザーの重複を防ぐ
    const sessionKey = `${roomId}_${username}`
    
    // 新規ルーム作成者の場合は重複チェックをスキップ
    if (!isRoomCreator) {
      // 既に参加処理中の場合はエラーを返す
      if (joiningUsers.has(sessionKey)) {
        return { success: false, error: "既に参加処理中です" }
      }
    }
    
    // 参加処理開始をマーク
    joiningUsers.add(sessionKey)
    
    try {
      // 既存のセッションがある場合は先に削除
      if (activeUserSessions.has(sessionKey)) {
        const existingSession = activeUserSessions.get(sessionKey)!
        await cleanupUser(roomId, existingSession.userId)
        activeUserSessions.delete(sessionKey)
      }

      // Check if room exists and password is correct
      const roomRef = ref(rtdb, `rooms/${roomId}`)
      const roomSnapshot = await get(roomRef)

      const roomData = roomSnapshot.val()
      if (roomData?.isPrivate && roomData.password !== password) {
        return { success: false, error: "パスワードが間違っています" }
      }

      // 既存のユーザーで同じユーザー名があるかチェック
      if (roomData?.users) {
        const existingUsers = Object.values(roomData.users) as User[]
        const duplicateUsers = existingUsers.filter(user => user.username === username)
        
        // 重複するユーザーを全て削除
        for (const duplicateUser of duplicateUsers) {
          await cleanupUser(roomId, duplicateUser.id)
        }
      }

      const userId = generateUserId()
      const userRef = ref(rtdb, `rooms/${roomId}/users/${userId}`)

      const userData: User = {
        id: userId,
        username,
        typing: "",
        composing: "",
        lastUpdate: Date.now(),
        joinedAt: Date.now(),
        isTyping: false,
        color: generateUserColor(),
      }

      // セッションを追跡
      activeUserSessions.set(sessionKey, { userId, timestamp: Date.now() })

      await set(userRef, userData)

      // Set up disconnect handler to remove user when they leave
      const disconnectRef = onDisconnect(userRef)
      await disconnectRef.remove()

      // Update room last activity
      await update(ref(rtdb, `rooms/${roomId}`), {
        lastActivity: Date.now()
      })

      // Add join message
      await addSystemMessage(roomId, `${username}さんが参加しました`, "join")

      return { success: true, userId }
    } finally {
      // 参加処理完了をマーク
      joiningUsers.delete(sessionKey)
    }
  } catch (error) {
    console.error("Error joining room:", error)
    const sessionKey = `${roomId}_${username}`
    joiningUsers.delete(sessionKey)
    return { success: false, error: "ルームへの参加に失敗しました" }
  }
}

export const cleanupUser = async (roomId: string, userId: string) => {
  try {
    const userRef = ref(rtdb, `rooms/${roomId}/users/${userId}`)
    await remove(userRef)
  } catch (error) {
    console.error("Error cleaning up user:", error)
  }
}

export const leaveRoom = async (roomId: string, userId: string, username: string) => {
  try {
    // セッションから削除
    const sessionKey = `${roomId}_${username}`
    activeUserSessions.delete(sessionKey)

    // Remove user
    const userRef = ref(rtdb, `rooms/${roomId}/users/${userId}`)
    await remove(userRef)

    // Add leave message
    await addSystemMessage(roomId, `${username}さんが退出しました`, "leave")

    // Check if room is empty and delete if so
    setTimeout(() => checkAndDeleteEmptyRoom(roomId), 1000)
  } catch (error) {
    console.error("Error leaving room:", error)
  }
}

export const checkAndDeleteEmptyRoom = async (roomId: string) => {
  try {
    const roomRef = ref(rtdb, `rooms/${roomId}`)
    const snapshot = await get(roomRef)

    const roomData = snapshot.val()
    if (!roomData || !roomData.users || Object.keys(roomData.users).length === 0) {
      await remove(roomRef)
      console.log(`Empty room ${roomId} deleted`)
    }
  } catch (error) {
    console.error("Error checking/deleting empty room:", error)
  }
}

export const updateTyping = async (roomId: string, userId: string, typing: string, composing: string) => {
  try {
    const userRef = ref(rtdb, `rooms/${roomId}/users/${userId}`)
    await update(userRef, {
      typing,
      composing,
      lastUpdate: Date.now(),
      isTyping: typing.length > 0 || composing.length > 0,
    })
  } catch (error) {
    console.error("Error updating typing:", error)
  }
}

export const sendChatMessage = async (
  roomId: string,
  userId: string,
  username: string,
  text: string,
  color: string,
) => {
  try {
    const messagesRef = ref(rtdb, `rooms/${roomId}/messages`)
    const newMessageRef = push(messagesRef)

    const message: ChatMessage = {
      id: newMessageRef.key!,
      userId,
      username,
      text,
      timestamp: Date.now(),
      color,
    }

    await set(newMessageRef, message)

    // Update room activity
    await update(ref(rtdb, `rooms/${roomId}`), {
      lastActivity: Date.now(),
      messageCount: Date.now() // Use timestamp as increment
    })
  } catch (error) {
    console.error("Error sending message:", error)
  }
}

export const addSystemMessage = async (roomId: string, text: string, type: "join" | "leave" | "system") => {
  try {
    const messagesRef = ref(rtdb, `rooms/${roomId}/messages`)
    const newMessageRef = push(messagesRef)

    const message = {
      id: newMessageRef.key!,
      userId: "system",
      username: "システム",
      text,
      timestamp: Date.now(),
      color: "#6B7280",
      type,
    }

    await set(newMessageRef, message)
  } catch (error) {
    console.error("Error adding system message:", error)
  }
}

export const listenToRoom = (roomId: string, callback: (room: Room | null) => void) => {
  const roomRef = ref(rtdb, `rooms/${roomId}`)

  const handleRoomData = (snapshot: any) => {
    const data = snapshot.val()
    if (data) {
      callback({
        id: roomId,
        name: data.name || `Room ${roomId}`,
        users: data.users || {},
        createdAt: data.createdAt || Date.now(),
        lastActivity: data.lastActivity || Date.now(),
        messageCount: data.messageCount || 0,
        isPrivate: data.isPrivate || false,
        password: data.password,
      })
    } else {
      callback(null)
    }
  }

  onValue(roomRef, handleRoomData)

  return () => {
    off(roomRef, "value", handleRoomData)
  }
}

export const listenToMessages = (roomId: string, callback: (messages: ChatMessage[]) => void) => {
  const messagesRef = ref(rtdb, `rooms/${roomId}/messages`)

  const handleMessages = (snapshot: any) => {
    const data = snapshot.val()
    if (data) {
      const messages = Object.values(data) as ChatMessage[]
      messages.sort((a, b) => a.timestamp - b.timestamp)
      callback(messages.slice(-50)) // Keep only last 50 messages
    } else {
      callback([])
    }
  }

  onValue(messagesRef, handleMessages)

  return () => {
    off(messagesRef, "value", handleMessages)
  }
}

export const createRoom = async (roomName: string, isPrivate = false, password?: string): Promise<string> => {
  const roomsRef = ref(rtdb, "rooms")
  const newRoomRef = push(roomsRef)
  const roomId = newRoomRef.key!

  const roomData: any = {
    name: roomName,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    users: {},
    messageCount: 0,
    isPrivate,
  }

  if (isPrivate && password) {
    roomData.password = password
  }

  await set(newRoomRef, roomData)

  return roomId
}

export const createAndJoinRoom = async (
  roomName: string,
  username: string,
  isPrivate = false,
  password?: string
): Promise<{ success: boolean; roomId?: string; userId?: string; error?: string }> => {
  try {
    // ルームを作成
    const roomId = await createRoom(roomName, isPrivate, password)
    
    // 作成者としてルームに参加（重複チェックをスキップ）
    const joinResult = await joinRoom(roomId, username, password, true)
    
    if (joinResult.success) {
      return {
        success: true,
        roomId,
        userId: joinResult.userId
      }
    } else {
      return {
        success: false,
        error: joinResult.error
      }
    }
  } catch (error) {
    console.error("Error creating and joining room:", error)
    return {
      success: false,
      error: "ルームの作成に失敗しました"
    }
  }
}

export const getAvailableRooms = (callback: (rooms: Room[]) => void) => {
  const roomsRef = ref(rtdb, "rooms")

  const handleRoomsData = (snapshot: any) => {
    const data = snapshot.val()
    if (data) {
      const rooms: Room[] = Object.entries(data)
        .map(([id, roomData]: [string, any]) => ({
          id,
          name: roomData.name || `Room ${id}`,
          users: roomData.users || {},
          createdAt: roomData.createdAt || Date.now(),
          lastActivity: roomData.lastActivity || Date.now(),
          messageCount: roomData.messageCount || 0,
          isPrivate: roomData.isPrivate || false,
          password: roomData.password,
        }))
        .filter((room) => Object.keys(room.users).length > 0) // Only show rooms with users
      callback(rooms.sort((a, b) => b.lastActivity - a.lastActivity))
    } else {
      callback([])
    }
  }

  onValue(roomsRef, handleRoomsData)

  return () => {
    off(roomsRef, "value", handleRoomsData)
  }
}

export const kickUser = async (roomId: string, userId: string, username: string) => {
  try {
    await leaveRoom(roomId, userId, username)
    await addSystemMessage(roomId, `${username}さんがキックされました`, "system")
  } catch (error) {
    console.error("Error kicking user:", error)
  }
}

export const clearRoomMessages = async (roomId: string) => {
  try {
    const messagesRef = ref(rtdb, `rooms/${roomId}/messages`)
    await remove(messagesRef)
    await addSystemMessage(roomId, "メッセージがクリアされました", "system")
  } catch (error) {
    console.error("Error clearing messages:", error)
  }
}