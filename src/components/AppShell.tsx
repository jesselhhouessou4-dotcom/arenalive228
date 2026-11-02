import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Trophy, Shield, LogIn } from "lucide-react";
import { Logo } from "@/components/common";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isAdmin, isScorer } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isLive = path.startsWith("/admin/live");

  const nav = [
    { to: "/", label: "Accueil", icon: Home, active: path === "/" },
    { to: "/tournois", label: "Tournois", icon: Trophy, active: path.startsWith("/tournoi") },
    user && (isAdmin || isScorer)
      ? { to: "/admin", label: "Espace admin", icon: Shield, active: path.startsWith("/admin") }
      : { to: "/auth", label: "Connexion", icon: LogIn, active: path.startsWith("/auth") },
  ] as const;

  return (
    <div className="min-h-screen bg-background bg-hero bg-no-repeat">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link to="/" aria-label="Accueil">
            <Logo />
          </Link>
          <nav className="hidden gap-1 sm:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground",
                  n.active && "bg-secondary text-foreground",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className={cn("mx-auto max-w-3xl px-4 py-5", !isLive && "pb-28 sm:pb-10")}>{children}</main>
      {!isLive && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg sm:hidden">
          <div className="grid grid-cols-3">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-muted-foreground",
                  n.active && "text-primary",
                )}
              >
                <n.icon className="h-5 w-5" />
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
