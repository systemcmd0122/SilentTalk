import { initializeApp } from "firebase/app"
import { getDatabase } from "firebase/database"

const firebaseConfig = {
  apiKey: "AIzaSyAIhORKSdkxibnv6K5foqtNvL8Sn0nnnwg",
  authDomain: "calling-chat-94987.firebaseapp.com",
  databaseURL: "https://calling-chat-94987-default-rtdb.firebaseio.com",
  projectId: "calling-chat-94987",
  storageBucket: "calling-chat-94987.firebasestorage.app",
  messagingSenderId: "807973132456",
  appId: "1:807973132456:web:e50d124444267a8aca0a9d",
  measurementId: "G-VHW2NKV3BG",
}

const app = initializeApp(firebaseConfig)
export const rtdb = getDatabase(app)
export default app
