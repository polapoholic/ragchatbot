import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "RAG Chatbot",
    description: "Document-based intelligent response system",
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-50 text-zinc-900`}>

        <div className="min-h-screen flex flex-col">

            {/* Header */}
            <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur px-6 py-4 flex items-center justify-between">
            <h1 className="text-lg font-semibold tracking-tight">
                    RAG Chatbot
                </h1>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              Live
            </span>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-4xl mx-auto w-full p-6">
                {children}
            </main>

            {/* Footer */}
            <footer className="text-center text-xs text-gray-400 py-4">
                © 2026 RAG System
            </footer>
        </div>
        </body>
        </html>
    );
}
