import { supabase } from '../lib/supabase';

export const runCandidateAdditionTest = async () => {
  console.log('=== CANDIDATE ADDITION DIAGNOSTIC TEST ===\n');

  const results = {
    env: { url: false, key: false },
    connection: false,
    auth: false,
    insert: false,
    select: false,
    cleanup: false,
    errors: [] as string[]
  };

  try {
    // 1. Check environment variables
    console.log('1. Checking environment variables...');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    results.env.url = !!supabaseUrl;
    results.env.key = !!supabaseAnonKey;
    
    console.log(`   - VITE_SUPABASE_URL: ${results.env.url ? '✓ Set' : '✗ Missing'}`);
    console.log(`   - VITE_SUPABASE_ANON_KEY: ${results.env.key ? '✓ Set' : '✗ Missing'}`);
    
    if (!results.env.url || !results.env.key) {
      results.errors.push('Missing environment variables');
      console.log('   ✗ FAILED: Environment variables missing\n');
      return results;
    }
    console.log('   ✓ PASSED\n');

    // 2. Test database connection
    console.log('2. Testing database connection...');
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('count')
        .limit(1);
      
      if (error) {
        results.errors.push(`Connection error: ${error.message}`);
        console.log(`   ✗ FAILED: ${error.message}\n`);
        return results;
      }
      
      results.connection = true;
      console.log('   ✓ PASSED: Database connection successful\n');
    } catch (err) {
      results.errors.push(`Connection exception: ${err instanceof Error ? err.message : 'Unknown'}`);
      console.log(`   ✗ FAILED: ${err instanceof Error ? err.message : 'Unknown error'}\n`);
      return results;
    }

    // 3. Check authentication
    console.log('3. Checking authentication...');
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        results.errors.push(`Auth error: ${authError.message}`);
        console.log(`   ✗ FAILED: ${authError.message}\n`);
        return results;
      }
      
      results.auth = !!user;
      console.log(`   - User: ${user ? user.email : 'Not authenticated'}`);
      console.log(`   ${results.auth ? '✓ PASSED' : '✗ WARNING: Not authenticated (required for inserts)'}\n`);
      
    } catch (err) {
      results.errors.push(`Auth exception: ${err instanceof Error ? err.message : 'Unknown'}`);
      console.log(`   ✗ FAILED: ${err instanceof Error ? err.message : 'Unknown error'}\n`);
      return results;
    }

    // 4. Test candidate insertion
    console.log('4. Testing candidate insertion...');
    const testCandidate = {
      name: `Test Candidate ${Date.now()}`,
      description: 'Test description for diagnostic',
      order_number: Math.floor(Math.random() * 1000)
    };
    
    console.log('   Inserting test candidate:', testCandidate);
    
    try {
      const { data, error } = await supabase
        .from('candidates')
        .insert(testCandidate)
        .select();
      
      if (error) {
        results.errors.push(`Insert error: ${error.message}`);
        console.log(`   ✗ FAILED: ${error.message}`);
        console.log(`   Error code: ${error.code}`);
        console.log(`   Error details: ${error.details}`);
        console.log(`   Error hint: ${error.hint}\n`);
        return results;
      }
      
      results.insert = true;
      console.log('   ✓ PASSED: Candidate inserted successfully');
      console.log('   Inserted data:', data);
      
      // Store ID for cleanup
      const insertedId = data?.[0]?.id;
      if (insertedId) {
        console.log('   Candidate ID for cleanup:', insertedId);
        
        // 5. Test candidate retrieval
        console.log('\n5. Testing candidate retrieval...');
        const { data: retrievedData, error: selectError } = await supabase
          .from('candidates')
          .select('*')
          .eq('id', insertedId)
          .single();
        
        if (selectError) {
          results.errors.push(`Select error: ${selectError.message}`);
          console.log(`   ✗ FAILED: ${selectError.message}\n`);
        } else {
          results.select = true;
          console.log('   ✓ PASSED: Candidate retrieved successfully');
          console.log('   Retrieved data:', retrievedData);
        }
        
        // 6. Cleanup test data
        console.log('\n6. Cleaning up test data...');
        const { error: deleteError } = await supabase
          .from('candidates')
          .delete()
          .eq('id', insertedId);
        
        if (deleteError) {
          results.errors.push(`Delete error: ${deleteError.message}`);
          console.log(`   ✗ WARNING: Could not delete test data: ${deleteError.message}`);
        } else {
          results.cleanup = true;
          console.log('   ✓ PASSED: Test data cleaned up');
        }
      }
      
    } catch (err) {
      results.errors.push(`Insert exception: ${err instanceof Error ? err.message : 'Unknown'}`);
      console.log(`   ✗ FAILED: ${err instanceof Error ? err.message : 'Unknown error'}\n`);
      return results;
    }

    console.log('\n=== TEST SUMMARY ===');
    console.log(`Environment: ${results.env.url && results.env.key ? '✓' : '✗'}`);
    console.log(`Connection: ${results.connection ? '✓' : '✗'}`);
    console.log(`Authentication: ${results.auth ? '✓' : '⚠️'}`);
    console.log(`Insert: ${results.insert ? '✓' : '✗'}`);
    console.log(`Select: ${results.select ? '✓' : '✗'}`);
    console.log(`Cleanup: ${results.cleanup ? '✓' : '⚠️'}`);
    
    if (results.errors.length > 0) {
      console.log('\nErrors encountered:');
      results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    const success = results.connection && results.insert;
    console.log(`\nOverall result: ${success ? '✓ SUCCESS' : '✗ FAILED'}`);
    
    if (success) {
      console.log('Candidate addition should work. If it\'s still not working in the UI, check:');
      console.log('1. Form validation on the client side');
      console.log('2. User interface state management');
      console.log('3. Browser console for JavaScript errors');
    }
    
    return results;
    
  } catch (err) {
    results.errors.push(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}`);
    console.log('\n=== TEST FAILED ===');
    console.log('Unexpected error:', err);
    return results;
  }
};
