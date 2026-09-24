import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TalentFlow AI | سامانه هوشمند استخدام",
  description: "مدیریت بانک رزومه، غربالگری، مصاحبه و تصمیم‌گیری منابع انسانی",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
