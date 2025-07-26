import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "../components/Sidebar";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "LakeForge",
  description: "Metadata driven data lake management",
  icons: {icon: "/favicon.ico"},
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className='dark'>
      <body className="antialiased flex bg-background text-foreground">
        <Sidebar />
        <main className="flex-1 ml-[var(--sidebar-width)]">
          {children}
        </main>
        <Toaster theme="dark" richColors />
      </body>
    </html>
  );
}
