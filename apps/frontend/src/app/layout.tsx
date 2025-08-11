import type { Metadata } from "next";
import "./globals.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import DarkVeil from "@/components/DarkVeil";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "LakeForge",
  description: "Metadata driven data lake management",
  icons: {icon: "/favicon.ico"},
};

export default function RootLayout({ children,}: Readonly<{ children: React.ReactNode;}>) {
  return (
    <html lang="en" className='dark h-full'>
      <body className="antialiased bg-background text-foreground h-full">
        <DarkVeil className="fixed inset-0 -z-10" />
        <SidebarProvider>
          <AppSidebar />
          {/* CHANGE: Add `relative` to make this the positioning context for the trigger button. */}
          <main className="flex-1 relative">
            {/* CHANGE: Position the trigger absolutely so it doesn't take up layout space. */}
            <div className="absolute top-2 left-4 z-20">
              <SidebarTrigger />
            </div>
            {children}
          </main>
          <Toaster theme="dark" richColors />
        </SidebarProvider>
      </body>
    </html>
  );
}