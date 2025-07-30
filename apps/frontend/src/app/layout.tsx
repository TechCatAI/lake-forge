import type { Metadata } from "next";
import "./globals.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import DarkVeil from "@/components/DarkVeil"; 
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "LakeForge",
  description: "Metadata driven data lake management",
  icons: {icon: "/favicon.ico"},
};

export default function RootLayout({ children,}: Readonly<{ children: React.ReactNode;}>) {
  return (
    <html lang="en" className='dark'>
      <body className="antialiased flex bg-background text-foreground">
        {/* ─── GLOBAL BACKDROP ─────────────────────────────── */}
        <DarkVeil className="fixed inset-0 -z-10" />
        {/* ─── APP CONTENT ─────────────────────────────────── */}
      <SidebarProvider>
        <AppSidebar />
        <main className="flex-1">
          <SidebarTrigger />
          {children}
        </main>
        <Toaster theme="dark" richColors />
      </SidebarProvider>
      </body>
    </html>
  );
}
