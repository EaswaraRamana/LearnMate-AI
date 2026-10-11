
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function testSupabaseConnection() {
  const { error } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);

  if (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }

  console.log('Supabase connection test succeeded.');
  return true;
}
