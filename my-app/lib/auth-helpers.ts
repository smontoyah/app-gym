import { supabase } from './supabase';

export async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('No authenticated user');
  return session.user.id;
}
