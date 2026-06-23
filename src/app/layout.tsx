import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { ReloadRecovery } from "@/components/ReloadRecovery";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "お帳面 - 保育園プリント管理",
  description: "保育園のプリントをスキャンして、やること・提出期限を家族で管理",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "お帳面",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#e8826a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} h-full antialiased`}>
      <body className="h-full font-sans overflow-hidden">
        <ReloadRecovery />
        {children}
      </body>
    </html>
  );
}
