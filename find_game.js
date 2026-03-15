
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function findStuckGame() {
  const { data, error } = await supabase
    .from('lobby_games')
    .select('id, contract_game_id, wager_amount, status')
    .eq('wager_amount', 0.00001)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Recent 0.00001 games:');
  console.log(JSON.stringify(data, null, 2));
}

findStuckGame();
