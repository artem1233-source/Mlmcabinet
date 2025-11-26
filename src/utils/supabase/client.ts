import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

const supabaseUrl = `https://${projectId}.supabase.co`;

// Create a singleton Supabase client
export const supabase = createSupabaseClient(supabaseUrl, publicAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

/**
 * Get the current access token from localStorage or Supabase session
 * @returns The access token or null if no token exists
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    // 1️⃣ First check localStorage (our primary source for custom server tokens)
    const storedToken = localStorage.getItem('access_token');
    if (storedToken) {
      console.log('✅ Token found in localStorage');
      return storedToken;
    }
    
    // 2️⃣ If not in localStorage, try to get from Supabase session (fallback)
    console.log('ℹ️ No token in localStorage, checking Supabase session...');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      console.log('✅ Token found in Supabase session, saving to localStorage');
      // Save to localStorage for future use
      localStorage.setItem('access_token', session.access_token);
      return session.access_token;
    }
    
    console.log('ℹ️ No token found in localStorage or Supabase session');
    return null;
  } catch (error) {
    console.error('Error in getAccessToken:', error);
    return null;
  }
}

/**
 * Refresh the current session and get a new access token
 */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Error refreshing session:', error);
      return null;
    }
    
    if (session?.access_token) {
      localStorage.setItem('access_token', session.access_token);
      console.log('✅ Token refreshed and saved to localStorage');
      return session.access_token;
    }
    
    return null;
  } catch (error) {
    console.error('Error in refreshAccessToken:', error);
    return null;
  }
}

/**
 * Sign out and clear all tokens
 */
export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
    localStorage.removeItem('access_token');
    localStorage.removeItem('userId');
    console.log('✅ Signed out and cleared tokens');
  } catch (error) {
    console.error('Error signing out:', error);
  }
}