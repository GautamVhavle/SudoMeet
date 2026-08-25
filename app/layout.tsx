import type { Metadata } from "next";
import { Geist_Mono, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { CommandPalette } from "@/components/command-palette";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SudoMeet",
    template: "%s | SudoMeet",
  },
  description:
    "Dark-mode-first video collaboration for developer teams. P2P calls, screen share, and chat.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Dark-mode-first: `dark` is the default; suppressHydrationWarning so a
    // future theme switcher can mutate <html> before hydration (Phase 5).
    <html 
      lang="en" 
      className={cn("dark", inter.variable, jetbrainsMono.variable)} 
      suppressHydrationWarning
    >
      <body
        className={`${geistMono.variable} min-h-screen bg-background font-sans antialiased`}
      >
        {children}
        <Toaster />
        <CommandPalette />
      </body>
    </html>
  );
}
