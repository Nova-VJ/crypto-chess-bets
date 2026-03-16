import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MASTERS: Record<string, { lichessName: string; coachId: string }> = {
  fischer:    { lichessName: "Fischer, Robert J.", coachId: "fischer" },
  tal:        { lichessName: "Tal, Mihail",        coachId: "tal" },
  capablanca: { lichessName: "Capablanca, Jose Raul", coachId: "capablanca" },
  kasparov:   { lichessName: "Kasparov, Garry",    coachId: "kasparov" },
  carlsen:    { lichessName: "Carlsen, Magnus",    coachId: "carlsen" },
};

interface MasterGame {
  white: string;
  black: string;
  result: string;
  opening: string | null;
  eco: string | null;
  event: string | null;
  date: string | null;
  coach_id: string;
  pgn: string | null;
  fen_list: string[];
}

async function fetchMasterGamesFromLichess(playerName: string, coachId: string): Promise<MasterGame[]> {
  const games: MasterGame[] = [];
  const seenKeys = new Set<string>();

  // The Lichess Masters explorer API: https://explorer.lichess.ovh/masters
  // Returns topGames and recentGames arrays with {id, winner, speed, white:{name,rating}, black:{name,rating}, year, month}
  // We need to try different positions/moves to get more games
  
  const plays = [
    "", // starting position
    "e2e4", "d2d4", "c2c4", "g1f3",
    "e2e4,e7e5", "e2e4,c7c5", "e2e4,e7e6", "e2e4,c7c6", "e2e4,d7d5",
    "d2d4,d7d5", "d2d4,g8f6", "d2d4,e7e6", "d2d4,f7f5",
    "c2c4,e7e5", "c2c4,g8f6", "c2c4,c7c5",
    "e2e4,e7e5,g1f3", "e2e4,c7c5,g1f3", "d2d4,d7d5,c2c4",
    "e2e4,e7e5,g1f3,b8c6", "e2e4,c7c5,g1f3,d7d6",
    "d2d4,g8f6,c2c4,g7g6", "d2d4,g8f6,c2c4,e7e6",
    "e2e4,e7e5,g1f3,b8c6,f1b5", // Ruy Lopez
    "e2e4,c7c5,g1f3,d7d6,d2d4", // Sicilian Open
  ];

  for (const play of plays) {
    if (games.length >= 250) break;

    try {
      const params = new URLSearchParams({
        player: playerName,
        topGames: "15",
        recentGames: "0",
      });
      if (play) params.set("play", play);

      const url = `https://explorer.lichess.ovh/masters?${params.toString()}`;
      const resp = await fetch(url, { headers: { Accept: "application/json" } });

      if (!resp.ok) {
        console.warn(`Lichess ${resp.status} for play=${play}`);
        continue;
      }

      const data = await resp.json();
      const topGames = data.topGames || [];

      for (const g of topGames) {
        // Create unique key from player names + year
        const key = `${g.white?.name || ""}_${g.black?.name || ""}_${g.year || ""}_${g.month || ""}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        const winner = g.winner;
        const result = winner === "white" ? "1-0" : winner === "black" ? "0-1" : "1/2-1/2";

        games.push({
          white: g.white?.name || "Unknown",
          black: g.black?.name || "Unknown",
          result,
          opening: data.opening?.name || null,
          eco: data.opening?.eco || null,
          event: g.year ? `Masters ${g.year}` : "Masters OTB",
          date: g.year && g.month ? `${g.year}.${String(g.month).padStart(2, "0")}` : (g.year ? `${g.year}` : null),
          coach_id: coachId,
          pgn: null,
          fen_list: [],
        });
      }

      // Small delay to be nice to the API
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      console.warn(`Error for play=${play}:`, e);
    }
  }

  return games;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: Record<string, number> = {};
    let totalInserted = 0;

    for (const [key, master] of Object.entries(MASTERS)) {
      const { count } = await supabase
        .from("master_games")
        .select("id", { count: "exact", head: true })
        .eq("coach_id", master.coachId);

      if ((count || 0) >= 200) {
        results[key] = count || 0;
        console.log(`${key} already has ${count} games, skipping.`);
        continue;
      }

      console.log(`Fetching games for ${key} (${master.lichessName})...`);
      const games = await fetchMasterGamesFromLichess(master.lichessName, master.coachId);
      console.log(`Found ${games.length} unique games for ${key}`);

      if (games.length > 0) {
        for (let i = 0; i < games.length; i += 50) {
          const batch = games.slice(i, i + 50);
          const { error } = await supabase.from("master_games").insert(batch);
          if (error) console.error(`Insert error for ${key} batch ${i}:`, error);
        }
        totalInserted += games.length;
      }

      results[key] = (count || 0) + games.length;
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Seeded ${totalInserted} new master games`,
      counts: results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("seed-master-games error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
