import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { UserProvider } from "@/context/UserContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DocProvider } from "@/context/DocumentContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Editly",
  description: "Realtime document editor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased">
        <UserProvider>
          <DocProvider>
            <TooltipProvider>
              <ProtectedRoute>{children}</ProtectedRoute>
              <Toaster position="top-right" richColors />
            </TooltipProvider>
          </DocProvider>
        </UserProvider>
      </body>
    </html>
  );
}
