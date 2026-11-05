import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export const getPublicMatch = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Le service des matchs est indisponible.");
    const client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
            headers.delete("Authorization");
          }
          headers.set("apikey", key);
          return fetch(input, { ...init, headers, signal: AbortSignal.timeout(15000) });
        },
      },
    });
    const result = await client.from("matches")
      .select("*, team_a:teams!matches_team_a_id_fkey(*), team_b:teams!matches_team_b_id_fkey(*), tournament:tournaments(*)")
      .eq("id", data.id).maybeSingle();
    if (result.error) throw new Error("Le match n’a pas pu être chargé. Veuillez réessayer.");
    if (result.data && (!result.data.team_a || !result.data.team_b || !result.data.tournament)) {
      throw new Error("Les informations de ce match sont incomplètes.");
    }
    return result.data;
  });