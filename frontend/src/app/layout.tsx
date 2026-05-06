import type { Metadata } from "next";
import Link from "next/link";

import { modules } from "@/lib/modules";
import "./globals.css";

export const metadata: Metadata = {
  title: "Compass V2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const navEntries = modules.flatMap((m) => m.nav);

  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <div className="flex min-h-screen">
          <aside className="w-56 border-r border-neutral-200 dark:border-neutral-800 p-4">
            <Link href="/" className="block text-lg font-semibold mb-6">
              Compass V2
            </Link>
            <nav className="flex flex-col gap-1 text-sm">
              {navEntries.map((entry) => (
                <Link
                  key={entry.href}
                  href={entry.href}
                  className="rounded px-2 py-1 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                >
                  {entry.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
