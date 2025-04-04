import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import '@/styles/globals.css'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Paul Graham's Essays",
  description: "Answering questions about Paul Graham's essays",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen flex flex-col">
          <header className="bg-gray-800 text-white p-4">
            <h1 className="text-2xl font-bold">Paul Graham&apos;s Essays</h1>
          </header>
          <main className="flex-grow p-4">{children}</main>
          <footer className="bg-gray-800 text-white p-4 text-center">
            &copy; 2025
          </footer>
        </div>
      </body>
    </html>
  );
}
