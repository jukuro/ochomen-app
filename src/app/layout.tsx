import type { Metadata, Viewport } from "next";
import Script from "next/script";
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
        <Script id="ochomen-boot-recovery" strategy="beforeInteractive">
          {`(function(){
  if("serviceWorker" in navigator){
    navigator.serviceWorker.getRegistrations().then(function(regs){
      return Promise.all(regs.map(function(r){return r.unregister()}));
    }).catch(function(){});
  }
  var KEY="ochomen-boot-reload-count",MAX=2;
  function n(){try{return+(sessionStorage.getItem(KEY)||0)}catch(e){return 0}}
  function bump(){try{sessionStorage.setItem(KEY,String(n()+1))}catch(e){}}
  function hard(){
    var u=new URL(location.href);
    u.searchParams.delete("ochomen_reload");
    u.searchParams.set("ochomen_reload",Date.now());
    location.replace(u.toString());
  }
  var R=/ChunkLoadError|Loading chunk \\d+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;
  window.addEventListener("error",function(e){if(R.test(e.message||"")&&n()<MAX){bump();hard()}});
  window.addEventListener("unhandledrejection",function(e){
    var m=e.reason instanceof Error?e.reason.message:String(e.reason||"");
    if(R.test(m)&&n()<MAX){bump();hard()}
  });
  setTimeout(function(){try{sessionStorage.removeItem(KEY)}catch(e){}},8000);
})();`}
        </Script>
        <ReloadRecovery />
        {children}
      </body>
    </html>
  );
}
