import { supabase } from './src/lib/supabaseClient.js';

async function main() {
  const { data, error } = await supabase.from('check_ins').select('*').limit(1);
  console.log('check_ins_error:', error);
  console.log('check_ins_keys:', data ? Object.keys(data[0] || {}) : null);
}

main();
