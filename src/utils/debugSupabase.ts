

import { supabase } from '../lib/supabase';

export const testSupabaseConnection = async () => {
  try {
    console.log('=== SUPABASE CONNECTION TEST ===');
    
    // Check environment variables
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    console.log('Environment check:');
    console.log('- VITE_SUPABASE_URL:', supabaseUrl ? 'Set ✓' : 'Missing ✗');
    console.log('- VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set ✓' : 'Missing ✗');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return { 
        success: false, 
        error: 'Missing environment variables',
        env: { url: !!supabaseUrl, key: !!supabaseAnonKey }
      };
    }
    
    // Test basic connection
    const { data, error, count } = await supabase
      .from('candidates')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase connection error:', error);
      return { success: false, error: error.message, details: error };
    }
    
    console.log('Supabase connection successful. Total candidates:', count);
    return { success: true, count, env: { url: !!supabaseUrl, key: !!supabaseAnonKey } };
    
  } catch (err) {
    console.error('Unexpected error testing Supabase:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
};

export const testAddCandidate = async () => {
  try {
    console.log('Testing candidate addition...');
    
    const testCandidate = {
      name: 'Test Candidate ' + Date.now(),
      description: 'Test description',
      order_number: Math.floor(Math.random() * 1000)
    };
    
    console.log('Attempting to insert:', testCandidate);
    
    const { data, error } = await supabase
      .from('candidates')
      .insert(testCandidate)
      .select();
    
    if (error) {
      console.error('Add candidate error:', error);
      return { success: false, error: error.message, details: error };
    }
    
    console.log('Candidate added successfully:', data);
    
    // Clean up test data
    if (data && data[0]) {
      await supabase.from('candidates').delete().eq('id', data[0].id);
      console.log('Test candidate cleaned up');
    }
    
    return { success: true, data };
    
  } catch (err) {
    console.error('Unexpected error adding test candidate:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
};

export const debugAuth = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Auth error:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Current user:', user);
    return { success: true, user };
    
  } catch (err) {
    console.error('Unexpected error getting auth:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
};
