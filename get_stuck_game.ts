import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('is_smart_contract', true)
    .eq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Stuck games:');
  data.forEach(g => {
    console.log(`- DB ID: ${g.id}`);
    console.log(`  Contract Game ID (bytes32): ${g.contract_game_id}`);
    console.log(`  Stake: ${g.stake_amount}`);
    console.log('---');
  });
}

main();
