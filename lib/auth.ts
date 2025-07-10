import { signInAnonymously, updateProfile } from "firebase/auth"
import { doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore"
import { auth, db } from "./firebase"

export interface UserProfile {
  uid: string
  username: string
  createdAt: any
  lastSeen: any
  status: "online" | "offline" | "in-call"
  currentCallId?: string
}

interface UserAuth {
  uid: string
  username: string
  passwordHash: string
  createdAt: any
}

// Simple password hashing (in production, use bcrypt or similar)
const hashPassword = (password: string): string => {
  return btoa(password + "textcall_salt_2024")
}

export const registerUser = async (username: string, password: string) => {
  try {
    // Check if username already exists
    const usernameQuery = query(collection(db, "userAuth"), where("username", "==", username))
    const usernameSnapshot = await getDocs(usernameQuery)

    if (!usernameSnapshot.empty) {
      return { success: false, error: "このユーザー名は既に使用されています" }
    }

    // Create anonymous user first
    const userCredential = await signInAnonymously(auth)
    const user = userCredential.user

    // Ensure the auth token is attached before the first Firestore write
    await userCredential.user.getIdToken(/* forceRefresh */ true)

    // Update display name
    await updateProfile(user, {
      displayName: username,
    })

    const passwordHash = hashPassword(password)

    // Store authentication data
    const userAuth: UserAuth = {
      uid: user.uid,
      username,
      passwordHash,
      createdAt: serverTimestamp(),
    }

    await setDoc(doc(db, "userAuth", user.uid), userAuth)

    // Store user profile
    const userProfile: UserProfile = {
      uid: user.uid,
      username,
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
      status: "online",
    }

    await setDoc(doc(db, "users", user.uid), userProfile)

    // Store username mapping for quick lookup
    await setDoc(doc(db, "usernames", username), {
      uid: user.uid,
    })

    return { success: true, user }
  } catch (error: any) {
    console.error("Registration error:", error)
    return { success: false, error: "アカウント作成に失敗しました: " + error.message }
  }
}

export const loginUser = async (username: string, password: string) => {
  try {
    // Find user by username
    const usernameDoc = await getDoc(doc(db, "usernames", username))

    if (!usernameDoc.exists()) {
      return { success: false, error: "ユーザーが見つかりません" }
    }

    const { uid } = usernameDoc.data()

    // Get user auth data
    const userAuthDoc = await getDoc(doc(db, "userAuth", uid))

    if (!userAuthDoc.exists()) {
      return { success: false, error: "認証情報が見つかりません" }
    }

    const userAuthData = userAuthDoc.data() as UserAuth

    // Check password
    const passwordHash = hashPassword(password)
    if (userAuthData.passwordHash !== passwordHash) {
      return { success: false, error: "パスワードが間違っています" }
    }

    // Sign in anonymously (new session)
    const userCredential = await signInAnonymously(auth)
    const user = userCredential.user

    // Update display name
    await updateProfile(user, {
      displayName: username,
    })

    // Create new user profile for this session
    const userProfile: UserProfile = {
      uid: user.uid,
      username,
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
      status: "online",
    }

    await setDoc(doc(db, "users", user.uid), userProfile)

    return { success: true, user }
  } catch (error: any) {
    console.error("Login error:", error)
    return { success: false, error: "ログインに失敗しました: " + error.message }
  }
}

export const logoutUser = async () => {
  try {
    if (auth.currentUser) {
      // Update status to offline
      await setDoc(
        doc(db, "users", auth.currentUser.uid),
        {
          status: "offline",
          lastSeen: serverTimestamp(),
        },
        { merge: true },
      )
    }

    await auth.signOut()
    return { success: true }
  } catch (error: any) {
    console.error("Logout error:", error)
    return { success: false, error: error.message }
  }
}

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, "users", uid)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return docSnap.data() as UserProfile
    }
    return null
  } catch (error) {
    console.error("Error getting user profile:", error)
    return null
  }
}

export const updateUserStatus = async (uid: string, status: "online" | "offline" | "in-call", callId?: string) => {
  try {
    const updateData: any = {
      status,
      lastSeen: serverTimestamp(),
    }

    if (callId) {
      updateData.currentCallId = callId
    } else {
      updateData.currentCallId = null
    }

    await setDoc(doc(db, "users", uid), updateData, { merge: true })
  } catch (error) {
    console.error("Error updating user status:", error)
  }
}
