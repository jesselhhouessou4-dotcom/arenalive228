import { useEffect } from "react";
import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Match, Team, Tables } from "./sports";
import { getPublicMatch } from "./match.functions";

function unwrap<R extends { data: unknown; error: { message: string } | null }>(res: R): NonNullable<R["data"]> {
  if (res.error) throw new Error(res.error.message);
  return res.data as NonNullable<R["data"]>;
}

export type MatchWithTeams = Match & {
  team_a: Team;
  team_b: Team;
  tournament: Tables<"tournaments">;
};

const MATCH_SELECT = "*, team_a:teams!matches_team_a_id_fkey(*), team_b:teams!matches_team_b_id_fkey(*), tournament:tournaments(*)";

export const tournamentsQuery = () =>
  queryOptions({
    queryKey: ["tournaments"],
    queryFn: async () => unwrap(await supabase.from("tournaments").select("*").order("start_date", { ascending: false })),
  });

export const tournamentQuery = (id: string) =>
  queryOptions({
    queryKey: ["tournament", id],
    queryFn: async () => unwrap(await supabase.from("tournaments").select("*").eq("id", id).single()),
  });

export const teamsQuery = (tournamentId: string) =>
  queryOptions({
    queryKey: ["teams", tournamentId],
    queryFn: async () => unwrap(await supabase.from("teams").select("*").eq("tournament_id", tournamentId).order("name")),
  });

export const teamQuery = (id: string) =>
  queryOptions({
    queryKey: ["team", id],
    queryFn: async () =>
      unwrap(await supabase.from("teams").select("*, tournament:tournaments(*)").eq("id", id).single()),
  });

export const playersQuery = (teamId: string) =>
  queryOptions({
    queryKey: ["players", teamId],
    queryFn: async () =>
      unwrap(await supabase.from("players").select("*").eq("team_id", teamId).order("jersey_number", { nullsFirst: false })),
  });

export const playerQuery = (id: string) =>
  queryOptions({
    queryKey: ["player", id],
    queryFn: async () =>
      unwrap(
        await supabase.from("players").select("*, team:teams(*, tournament:tournaments(*))").eq("id", id).single(),
      ),
  });

export const playerEventsQuery = (id: string) =>
  queryOptions({
    queryKey: ["player-events", id],
    queryFn: async () => unwrap(await supabase.from("match_events").select("*").eq("player_id", id)),
  });

export const matchesQuery = (filter: { tournamentId?: string; teamId?: string; status?: string } = {}) =>
  queryOptions({
    queryKey: ["matches", filter],
    queryFn: async () => {
      let q = supabase.from("matches").select(MATCH_SELECT).order("scheduled_at", { ascending: true });
      if (filter.tournamentId) q = q.eq("tournament_id", filter.tournamentId);
      if (filter.teamId) q = q.or(`team_a_id.eq.${filter.teamId},team_b_id.eq.${filter.teamId}`);
      if (filter.status) q = q.eq("status", filter.status as Match["status"]);
      return unwrap(await q) as unknown as MatchWithTeams[];
    },
  });

export const matchQuery = (id: string) =>
  queryOptions({
    queryKey: ["match", id],
    queryFn: async () => await getPublicMatch({ data: { id } }) as MatchWithTeams | null,
    retry: false,
  });

export const matchEventsQuery = (id: string) =>
  queryOptions({
    queryKey: ["match-events", id],
    queryFn: async () =>
      unwrap(await supabase.from("match_events").select("*").eq("match_id", id).order("created_at", { ascending: true })),
  });

export const lineupsQuery = (matchId: string) =>
  queryOptions({
    queryKey: ["lineups", matchId],
    queryFn: async () => unwrap(await supabase.from("lineups").select("*, player:players(*)").eq("match_id", matchId)),
  });

export const matchPlayersQuery = (teamA: string, teamB: string) =>
  queryOptions({
    queryKey: ["match-players", teamA, teamB],
    queryFn: async () =>
      unwrap(await supabase.from("players").select("*").in("team_id", [teamA, teamB]).order("jersey_number")),
  });

/** Abonnement temps réel : invalide les requêtes quand la table change. */
export function useRealtime(table: "matches" | "match_events" | "lineups", filter: string | undefined, keys: unknown[][]) {
  const qc = useQueryClient();
  const keyStr = JSON.stringify(keys);
  useEffect(() => {
    const channel = supabase
      .channel(`${table}-${filter ?? "all"}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table, ...(filter ? { filter } : {}) }, () => {
        for (const k of JSON.parse(keyStr) as unknown[][]) qc.invalidateQueries({ queryKey: k });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, keyStr, qc]);
}

export async function compressImage(file: File, max = 640, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Compression impossible"))), "image/jpeg", quality),
  );
}

/** Envoie une image compressée dans le stockage et renvoie une URL longue durée. */
export async function uploadPhoto(file: File, folder: string): Promise<string> {
  const blob = await compressImage(file);
  const path = `${folder}/${crypto.randomUUID()}.jpg`;
  const up = await supabase.storage.from("player-photos").upload(path, blob, { contentType: "image/jpeg" });
  if (up.error) throw new Error(up.error.message);
  const signed = await supabase.storage.from("player-photos").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (signed.error) throw new Error(signed.error.message);
  return signed.data.signedUrl;
}
