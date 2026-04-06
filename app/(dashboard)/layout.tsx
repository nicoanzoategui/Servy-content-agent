import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: {
    template: "%s · Servy Content",
    default: "Dashboard",
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="text-lg font-bold tracking-tight text-emerald-700">
            Servy.
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link
              href="/"
              className="text-zinc-600 hover:text-emerald-700"
            >
              Kanban
            </Link>
            <Link
              href="/founder"
              className="text-zinc-600 hover:text-emerald-700"
            >
              Founder
            </Link>
            <Link
              href="/strategy"
              className="text-zinc-600 hover:text-emerald-700"
            >
              Estrategia
            </Link>
            <Link
              href="/analytics"
              className="text-zinc-600 hover:text-emerald-700"
            >
              Analytics
            </Link>
          </nav>
          <span className="text-xs text-zinc-500">Content Agent</span>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-4 py-6">{children}</main>
    </div>
  );
}
