import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { site } from "@/lib/site";
import { currentAdmin, sessionClient } from "@/lib/supabase/server";
import { signOut } from "../actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  const { count: newSuggestions } = await (await sessionClient())
    .from("suggestions")
    .select("id", { count: "exact", head: true });

  return (
    <div className="flex-1 bg-surface">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-6">
            <Link href="/admin" className="shrink-0 font-semibold tracking-tight">
              {site.name}
              <span className="text-spark">.</span> <span className="font-serif font-normal italic">admin</span>
            </Link>
            <nav className="flex min-w-0 gap-4 overflow-x-auto whitespace-nowrap text-sm text-muted [scrollbar-width:none]">
              <Link href="/admin" className="hover:text-ink">Places</Link>
              <Link href="/admin?tab=journal" className="hover:text-ink">Journal</Link>
              <Link href="/admin?tab=lists" className="hover:text-ink">Lists</Link>
              <Link href="/admin?tab=areas" className="hover:text-ink">Areas</Link>
              <Link href="/admin?tab=subscribers" className="hover:text-ink">Subscribers</Link>
              <Link href="/admin?tab=suggestions" className="hover:text-ink">
                Suggestions{newSuggestions ? <span className="ml-1 bg-ink px-1.5 text-xs text-paper">{newSuggestions}</span> : null}
              </Link>
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
