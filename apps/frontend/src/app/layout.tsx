import type { Metadata } from "next";
import { Inter, Poppins } from 'next/font/google';
import "./globals.css";
import Sidebar from "../components/Sidebar";
import { Toaster } from "sonner";

const inter   = Inter({ 
  subsets: ['latin'],  
  variable: '--font-inter',
  weight: ['400', '500'], // only the weights you actually use 
});

const poppins = Poppins({
  subsets: ['latin'],
  weight:  ['600', '700'],         // only the weights you actually use
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: "LakeForge",
  description: "Metadata driven data lake management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${poppins.variable}`}>
      <body className="antialiased flex">
        <Sidebar />
        <main className="flex-1 ml-[var(--sidebar-width)]">
          {children}
        </main>
        <Toaster theme="dark" richColors />
      </body>
    </html>
  );
}
