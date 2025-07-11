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
  status: "active" | "kicked" | "disconnected"
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
  kickedUsers: { [userId: string]: { username: string; kickedAt: number } }
}

export interface ChatMessage {
  id: string
  userId: string
  username: string
  text: string
  timestamp: number
  color: string
  type?: "join" | "leave" | "system" | "kick"
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

// アクティブなユーザーセッションを追跡
const activeUserSessions = new Map<string, { userId: string; timestamp: number; roomId: string }>()

// 重複参加を防ぐためのフラグ
const joiningUsers = new Set<string>()

// タイピング状態のクリーンアップ用タイマー
const typingTimeouts = new Map<string, NodeJS.Timeout>()

// キックされたユーザーのセッション監視
const kickedUserWatchers = new Map<string, () => void>()

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
    const sessionKey = `${roomId}_${username}`
    
    // キックされたユーザーかどうかをチェック
    if (!isRoomCreator) {
      const roomRef = ref(rtdb, `rooms/${roomId}`)
      const roomSnapshot = await get(roomRef)
      const roomData = roomSnapshot.val()
      
      if (roomData?.kickedUsers) {
        const kickedUser = Object.values(roomData.kickedUsers).find(
          (kicked: any) => kicked.username === username
        )
        if (kickedUser) {
          return { success: false, error: "このルームからキックされています" }
        }
      }
    }
    
    if (!isRoomCreator && joiningUsers.has(sessionKey)) {
      return { success: false, error: "既に参加処理中です" }
    }
    
    joiningUsers.add(sessionKey)
    
    try {
      // 既存のセッションがある場合は先に削除
      if (activeUserSessions.has(sessionKey)) {
        const existingSession = activeUserSessions.get(sessionKey)!
        await cleanupUser(existingSession.roomId, existingSession.userId)
        activeUserSessions.delete(sessionKey)
      }

      // ルームの存在確認とパスワードチェック
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
        status: "active",
      }

      // セッションを追跡
      activeUserSessions.set(sessionKey, { userId, timestamp: Date.now(), roomId })

      await set(userRef, userData)

      // 切断時の処理を設定
      const disconnectRef = onDisconnect(userRef)
      await disconnectRef.remove()

      // キックされたユーザーの監視を開始
      startKickWatcher(roomId, userId, username)

      // ルームの最終活動時刻を更新
      await update(ref(rtdb, `rooms/${roomId}`), {
        lastActivity: Date.now()
      })

      // 参加メッセージを追加
      await addSystemMessage(roomId, `${username}さんが参加しました`, "join")

      return { success: true, userId }
    } finally {
      joiningUsers.delete(sessionKey)
    }
  } catch (error) {
    console.error("Error joining room:", error)
    const sessionKey = `${roomId}_${username}`
    joiningUsers.delete(sessionKey)
    return { success: false, error: "ルームへの参加に失敗しました" }
  }
}

// キックされたユーザーの監視を開始
const startKickWatcher = (roomId: string, userId: string, username: string) => {
  const watcherKey = `${roomId}_${userId}`
  
  // 既存のウォッチャーがある場合は削除
  if (kickedUserWatchers.has(watcherKey)) {
    kickedUserWatchers.get(watcherKey)!()
    kickedUserWatchers.delete(watcherKey)
  }

  const userRef = ref(rtdb, `rooms/${roomId}/users/${userId}`)
  const kickedUsersRef = ref(rtdb, `rooms/${roomId}/kickedUsers`)

  const handleUserStatus = (snapshot: any) => {
    const userData = snapshot.val()
    if (!userData) {
      // ユーザーが削除された場合、キックされたかどうかを確認
      get(kickedUsersRef).then((kickedSnapshot) => {
        const kickedData = kickedSnapshot.val()
        if (kickedData) {
          const isKicked = Object.values(kickedData).some(
            (kicked: any) => kicked.username === username
          )
          if (isKicked) {
            // キックされたユーザーに通知
            window.dispatchEvent(new CustomEvent('userKicked', { 
              detail: { roomId, userId, username } 
            }))
          }
        }
      })
    }
  }

  onValue(userRef, handleUserStatus)
  
  const cleanup = () => {
    off(userRef, "value", handleUserStatus)
  }
  
  kickedUserWatchers.set(watcherKey, cleanup)
}

export const cleanupUser = async (roomId: string, userId: string) => {
  try {
    const userRef = ref(rtdb, `rooms/${roomId}/users/${userId}`)
    await remove(userRef)
    
    // タイピング状態のクリーンアップ
    const typingKey = `${roomId}_${userId}`
    if (typingTimeouts.has(typingKey)) {
      clearTimeout(typingTimeouts.get(typingKey)!)
      typingTimeouts.delete(typingKey)
    }
    
    // キックウォッチャーのクリーンアップ
    const watcherKey = `${roomId}_${userId}`
    if (kickedUserWatchers.has(watcherKey)) {
      kickedUserWatchers.get(watcherKey)!()
      kickedUserWatchers.delete(watcherKey)
    }
  } catch (error) {
    console.error("Error cleaning up user:", error)
  }
}

export const leaveRoom = async (roomId: string, userId: string, username: string) => {
  try {
    const sessionKey = `${roomId}_${username}`
    activeUserSessions.delete(sessionKey)

    // ユーザーを削除
    const userRef = ref(rtdb, `rooms/${roomId}/users/${userId}`)
    await remove(userRef)

    // 退出メッセージを追加
    await addSystemMessage(roomId, `${username}さんが退出しました`, "leave")

    // クリーンアップ
    await cleanupUser(roomId, userId)

    // 空のルームを削除
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
    const isTyping = typing.length > 0 || composing.length > 0
    
    await update(userRef, {
      typing,
      composing,
      lastUpdate: Date.now(),
      isTyping,
      status: "active"
    })

    // タイピング状態のタイムアウト管理
    const typingKey = `${roomId}_${userId}`
    
    if (typingTimeouts.has(typingKey)) {
      clearTimeout(typingTimeouts.get(typingKey)!)
    }
    
    if (isTyping) {
      // 5秒間入力がない場合、タイピング状態をクリア
      const timeout = setTimeout(async () => {
        try {
          await update(userRef, {
            typing: "",
            composing: "",
            isTyping: false,
            lastUpdate: Date.now()
          })
        } catch (error) {
          console.error("Error clearing typing state:", error)
        }
        typingTimeouts.delete(typingKey)
      }, 5000)
      
      typingTimeouts.set(typingKey, timeout)
    }
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

    // タイピング状態をクリア
    const userRef = ref(rtdb, `rooms/${roomId}/users/${userId}`)
    await update(userRef, {
      typing: "",
      composing: "",
      isTyping: false,
      lastUpdate: Date.now()
    })

    // ルームの活動を更新
    await update(ref(rtdb, `rooms/${roomId}`), {
      lastActivity: Date.now(),
      messageCount: Date.now()
    })
  } catch (error) {
    console.error("Error sending message:", error)
  }
}

export const addSystemMessage = async (roomId: string, text: string, type: "join" | "leave" | "system" | "kick") => {
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
        kickedUsers: data.kickedUsers || {},
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
      callback(messages.slice(-50))
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
    kickedUsers: {},
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
    const roomId = await createRoom(roomName, isPrivate, password)
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
          kickedUsers: roomData.kickedUsers || {},
        }))
        .filter((room) => Object.keys(room.users).length > 0)
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
    // キックされたユーザーのリストに追加
    const kickedUserRef = ref(rtdb, `rooms/${roomId}/kickedUsers/${userId}`)
    await set(kickedUserRef, {
      username,
      kickedAt: Date.now()
    })

    // キックメッセージを追加
    await addSystemMessage(roomId, `${username}さんがキックされました`, "kick")

    // ユーザーを削除（これによりキックされたユーザーの画面が反応する）
    await cleanupUser(roomId, userId)
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

// セッションのクリーンアップ
export const cleanupAllSessions = () => {
  // タイピングタイムアウトのクリア
  typingTimeouts.forEach((timeout) => clearTimeout(timeout))
  typingTimeouts.clear()
  
  // キックウォッチャーのクリア
  kickedUserWatchers.forEach((cleanup) => cleanup())
  kickedUserWatchers.clear()
  
  // アクティブセッションのクリア
  activeUserSessions.clear()
}

// ページの終了時にクリーンアップ
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", cleanupAllSessions)
}