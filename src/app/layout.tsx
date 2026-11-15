import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "NairaSplit", description: "Split shared bills in naira and settle up in as few transfers as possible." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-stone-200 bg-white">
          <nav className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
            <Link href="/" className="font-semibold"><span className="text-accent">₦</span> NairaSplit</Link>
            <form action="/auth/signout" method="post"><button className="text-sm text-stone-500 hover:text-stone-900">Sign out</button></form>
          </nav>
        </header>
        <div className="mx-auto max-w-3xl px-4 py-8">{children}</div>
      </body>
    </html>
  );
}
