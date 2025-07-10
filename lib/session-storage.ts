// セッション管理用のユーティリティ
export const SessionStorage = {
  setUser: (userData: { uid: string; username: string }) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("textcall_user", JSON.stringify(userData))
    }
  },

  getUser: (): { uid: string; username: string } | null => {
    if (typeof window !== "undefined") {
      const userData = localStorage.getItem("textcall_user")
      return userData ? JSON.parse(userData) : null
    }
    return null
  },

  clearUser: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("textcall_user")
    }
  },
}
