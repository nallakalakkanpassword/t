import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Set current user for RLS policies
export const setCurrentUser = async (username: string) => {
  const { error } = await supabase.rpc('set_config', {
    setting_name: 'app.current_user',
    setting_value: username,
    is_local: true
  });
  
  if (error) {
    console.error('Error setting current user:', error);
    throw error;
  }
  
  return true;
};