import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { site } from "@/lib/site";
import { currentAdmin } from "@/lib/supabase/server";
import { signOut } from "../actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div className="flex-1 bg-surface">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-semibold tracking-tight">
              {site.name}
              <span className="text-spark">.</span> <span className="font-serif font-normal italic">admin</span>
            </Link>
            <nav className="flex gap-4 text-sm text-muted">
              <Link href="/admin" className="hover:text-ink">Places</Link>
              <Link href="/admin?tab=journal" className="hover:text-ink">Journal</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" target="_blank" className="hidden text-muted hover:text-ink sm:inline">View site ↗</Link>
            <span className="hidden text-muted md:inline">{admin.email}</span>
            <ThemeToggle />
            <form action={signOut}>
              <button className="text-muted underline hover:text-ink">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">{children}</div>
    </div>
  );
}
