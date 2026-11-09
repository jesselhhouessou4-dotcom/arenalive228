import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { officialsForSport, readOfficials, type Officials } from "@/lib/officials";
import type { Team } from "@/lib/sports";

export function OfficialsFields({ sport, value, onChange }: { sport: string; value: Officials; onChange: (v: Officials) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {officialsForSport(sport).map((role) => (
        <div key={role} className="space-y-1">
          <Label className="text-xs">{role}</Label>
          <Input value={value[role] ?? ""} placeholder="Nom (facultatif)" onChange={(e) => onChange({ ...value, [role]: e.target.value })} />
        </div>
      ))}
    </div>
  );
}

export function OfficialsView({ sport, officials, teams }: { sport: string; officials: unknown; teams: Pick<Team, "id" | "name" | "coach" | "assistant_coach">[] }) {
  const o = readOfficials(officials);
  const roles = officialsForSport(sport).filter((r) => o[r]);
  const coaches = teams.filter((t) => t.coach || t.assistant_coach);
  if (!roles.length && !coaches.length) return null;
  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4 text-sm">
      {coaches.length > 0 && (
        <div className="space-y-1">
          <h3 className="font-display font-bold uppercase">Coachs</h3>
          {coaches.map((t) => (
            <p key={t.id}>
              <span className="text-muted-foreground">{t.name} :</span> {t.coach ?? "—"}
              {t.assistant_coach && <span className="text-muted-foreground"> (adj. {t.assistant_coach})</span>}
            </p>
          ))}
        </div>
      )}
      {roles.length > 0 && (
        <div className="space-y-1">
          <h3 className="font-display font-bold uppercase">Officiels</h3>
          {roles.map((r) => (
            <p key={r}><span className="text-muted-foreground">{r} :</span> {o[r]}</p>
          ))}
        </div>
      )}
    </div>
  );
}
