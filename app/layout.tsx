import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SilentTalk - 匿名リアルタイム文字通話",
  description: "ユーザー名だけで参加できる匿名テキスト通話サイト(SilentTalk)。リアルタイムで文字のやり取りができます。",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
