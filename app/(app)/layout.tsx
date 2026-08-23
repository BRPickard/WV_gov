import Link from "next/link";
import SignOutButton from "@/components/sign-out-button";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link href="/folders" className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-semibold text-white">
                WV
              </span>
              <span className="text-sm font-semibold tracking-tight text-ink">Document Library</span>
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              <Link href="/folders" className="btn btn-ghost">
                Folders
              </Link>
              {user.role === "admin" && (
                <Link href="/admin" className="btn btn-ghost">
                  Admin
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight text-ink">{user.name}</p>
              <p className="text-xs leading-tight text-muted">
                {user.role === "admin" ? "Administrator" : user.email}
              </p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
