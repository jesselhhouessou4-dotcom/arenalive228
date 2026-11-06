import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { positionsForSport } from "@/lib/positions";

export function PositionSelect({ sport, value, onChange, label, className }: {
  sport: string;
  value: string | null;
  onChange: (position: string) => void;
  label: string;
  className?: string;
}) {
  const positions = positionsForSport(sport);
  return (
    <Select value={value || "__none"} onValueChange={(v) => onChange(v === "__none" ? "" : v)}>
      <SelectTrigger aria-label={label} className={className}>
        <SelectValue placeholder="Sans poste">{value || "Sans poste"}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none">Sans poste</SelectItem>
        {positions.map((position) => <SelectItem key={position} value={position}>{position}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}