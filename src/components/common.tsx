import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import type { Team, Player } from "@/lib/sports";
import { periodLabel } from "@/lib/sports";
import type { MatchWithTeams } from "@/lib/queries";
import { Skeleton } from "@/components/ui/skeleton";

export function Logo({ className }: { className?: string }) {
  if (BRAND.logoUrl) return <img src={BRAND.logoUrl} alt={BRAND.name} className={cn("h-8", className)} />;
  return (
    <span className={cn("font-display text-2xl font-extrabold uppercase italic tracking-tight", className)}>
      <span className="text-primary">{BRAND.name.slice(0, 5)}</span>
      <span className="text-accent">{BRAND.name.slice(5)}</span>
    </span>
  );
}

export function TeamBadge({ team, size = 40 }: { team: Pick<Team, "name" | "short_name" | "logo_url" | "color">; size?: number }) {
  if (team.logo_url)
    return (
      <img
        src={team.logo_url}
        alt={team.name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover ring-2 ring-border"
      />
    );
  return (
    <span
      style={{ width: size, height: size, background: team.color, fontSize: size * 0.32 }}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold text-background ring-2 ring-border"
    >
      {(team.short_name ?? team.name).slice(0, 3).toUpperCase()}
    </span>
  );
}

export function PlayerAvatar({ player, size = 48, className }: { player: Pick<Player, "name" | "photo_url">; size?: number; className?: string }) {
  const initials = player.name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2);
  return player.photo_url ? (
    <img
      src={player.photo_url}
      alt={player.name}
      loading="lazy"
      style={{ width: size, height: size }}
      className={cn("rounded-full object-cover", className)}
    />
  ) : (
    <span
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={cn("inline-flex items-center justify-center rounded-full bg-secondary font-display font-bold text-muted-foreground", className)}
    >
      {initials}
    </span>
  );
}

export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex h-2.5 w-2.5", className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-live" />
    </span>
  );
}

function fmtElapsed(from: string | null) {
  if (!from) return "00:00";
  const s = Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Chrono depuis le début de la période en cours. */
export function LiveClock({ from, className }: { from: string | null; className?: string }) {
  const [, tick] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className={cn("tabular", className)}>{mounted ? fmtElapsed(from) : "--:--"}</span>;
}

export function elapsedMinute(from: string | null) {
  if (!from) return 0;
  return Math.floor((Date.now() - new Date(from).getTime()) / 60000) + 1;
}

export function formatDate(d: string | null, withTime = true) {
  if (!d) return "Date à définir";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(d));
}

export function MatchCard({ match, admin }: { match: MatchWithTeams; admin?: boolean }) {
  const live = match.status === "en_cours";
  const done = match.status === "termine";
  const winA = done && match.score_a > match.score_b;
  const winB = done && match.score_b > match.score_a;
  return (
    <Link
      to={admin ? "/admin/matchs/$id" : "/match/$id"}
      params={{ id: match.id }}
      className={cn(
        "block rounded-2xl border bg-card p-4 transition active:scale-[0.99]",
        live && "border-live/50 shadow-[0_0_0_1px_var(--live)]",
      )}
    >
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate">
          {match.tournament?.name} · {match.phase}
          {match.group_name ? ` ${match.group_name}` : ""}
        </span>
        {live ? (
          <span className="flex items-center gap-1.5 font-bold uppercase text-live">
            <LiveDot /> {periodLabel(match.tournament?.sport_id ?? "", match.current_period)}
          </span>
        ) : done ? (
          <span className="font-semibold uppercase">Terminé</span>
        ) : (
          <span>{formatDate(match.scheduled_at)}</span>
        )}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <TeamBadge team={match.team_a} size={36} />
          <span className={cn("truncate font-semibold", done && !winA && "text-muted-foreground")}>{match.team_a.name}</span>
        </div>
        <div className="font-display text-3xl font-bold tabular">
          {match.status === "a_venir" ? (
            <span className="text-lg text-muted-foreground">VS</span>
          ) : (
            <>
              <span className={cn(winA && "text-primary")}>{match.score_a}</span>
              <span className="mx-1 text-muted-foreground">-</span>
              <span className={cn(winB && "text-primary")}>{match.score_b}</span>
            </>
          )}
        </div>
        <div className="flex min-w-0 items-center justify-end gap-2">
          <span className={cn("truncate text-right font-semibold", done && !winB && "text-muted-foreground")}>{match.team_b.name}</span>
          <TeamBadge team={match.team_b} size={36} />
        </div>
      </div>
    </Link>
  );
}

export function Section({ title, action, children, className }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function LoadingList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Chargement">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin", className)} />;
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : "Erreur inconnue";
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
      <div className="flex-1">
        <p className="font-semibold">Impossible de charger les données</p>
        <p className="text-muted-foreground">{msg}</p>
        {onRetry && (
          <button onClick={onRetry} className="mt-2 font-semibold text-primary underline-offset-2 hover:underline">
            Réessayer
          </button>
        )}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">{children}</div>;
}
