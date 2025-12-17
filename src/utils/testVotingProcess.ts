import { supabase } from '../lib/supabase';

interface TestResult {
  success: boolean;
  totalEmployees: number;
  votedCount: number;
  skippedCount: number;
  errors: string[];
  averageImageSize: number;
  totalTime: number;
}

export const testVotingProcessWithAllEmployees = async (): Promise<TestResult> => {
  const startTime = Date.now();
  const result: TestResult = {
    success: false,
    totalEmployees: 0,
    votedCount: 0,
    skippedCount: 0,
    errors: [],
    averageImageSize: 0,
    totalTime: 0
  };

  try {
    console.log('=== TESTING VOTING PROCESS WITH ALL EMPLOYEES ===');

    // 1. Get all employees
    console.log('Fetching all employees...');
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .order('created_at');

    if (employeesError) {
      throw new Error(`Failed to fetch employees: ${employeesError.message}`);
    }

    if (!employees || employees.length === 0) {
      throw new Error('No employees found in database');
    }

    result.totalEmployees = employees.length;
    console.log(`Found ${employees.length} employees`);

    // 2. Get all candidates
    console.log('Fetching candidates...');
    const { data: candidates, error: candidatesError } = await supabase
      .from('candidates')
      .select('*')
      .order('order_number');

    if (candidatesError) {
      throw new Error(`Failed to fetch candidates: ${candidatesError.message}`);
    }

    if (!candidates || candidates.length === 0) {
      throw new Error('No candidates found in database');
    }

    console.log(`Found ${candidates.length} candidates`);

    // 3. Create a compressed test selfie image
    console.log('Creating compressed test selfie...');
    const testImage = createCompressedTestImage();
    const imageSize = Math.round((testImage.length * 3) / 4); // Approximate base64 to bytes
    console.log(`Test image size: ${imageSize} bytes`);

    let totalImageSize = 0;
    let processedCount = 0;

    // 4. Process each employee
    for (const employee of employees) {
      try {
        console.log(`Processing employee: ${employee.employee_id} (${processedCount + 1}/${employees.length})`);

        if (employee.has_voted) {
          console.log(`  - Skipped: Already voted`);
          result.skippedCount++;
          continue;
        }

        // Select a random candidate
        const randomCandidate = candidates[Math.floor(Math.random() * candidates.length)];
        console.log(`  - Voting for: ${randomCandidate.name}`);

        // Submit vote
        const { data: voteData, error: voteError } = await supabase
          .from('votes')
          .insert({
            employee_id: employee.employee_id,
            candidate_id: randomCandidate.id,
            selfie_url: testImage
          })
          .select()
          .single();

        if (voteError) {
          throw new Error(`Vote insertion failed: ${voteError.message}`);
        }

        // Update employee voting status
        const { error: updateError } = await supabase
          .from('employees')
          .update({ has_voted: true })
          .eq('employee_id', employee.employee_id);

        if (updateError) {
          console.warn(`Warning: Failed to update employee status: ${updateError.message}`);
        }

        result.votedCount++;
        totalImageSize += imageSize;
        console.log(`  - Vote submitted successfully`);

      } catch (err) {
        const errorMsg = `Error processing ${employee.employee_id}: ${err instanceof Error ? err.message : 'Unknown error'}`;
        console.error(`  - ${errorMsg}`);
        result.errors.push(errorMsg);
      }

      processedCount++;

      // Add small delay to avoid overwhelming the server
      if (processedCount < employees.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // 5. Calculate results
    result.averageImageSize = result.votedCount > 0 ? Math.round(totalImageSize / result.votedCount) : 0;
    result.totalTime = Date.now() - startTime;
    result.success = result.errors.length === 0;

    console.log('\n=== TEST RESULTS ===');
    console.log(`Total employees: ${result.totalEmployees}`);
    console.log(`Successfully voted: ${result.votedCount}`);
    console.log(`Skipped (already voted): ${result.skippedCount}`);
    console.log(`Errors: ${result.errors.length}`);
    console.log(`Average image size: ${result.averageImageSize} bytes`);
    console.log(`Total time: ${result.totalTime}ms`);
    console.log(`Success rate: ${((result.votedCount / (result.totalEmployees - result.skippedCount)) * 100).toFixed(1)}%`);

    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach(error => console.log(`- ${error}`));
    }

    return result;

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Test failed:', errorMsg);
    result.errors.push(errorMsg);
    result.totalTime = Date.now() - startTime;
    return result;
  }
};

// Create a compressed test image (small red square)
const createCompressedTestImage = (): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  // Draw a simple pattern
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(0, 0, 50, 50);
  ctx.fillStyle = '#00ff00';
  ctx.fillRect(50, 0, 50, 50);
  ctx.fillStyle = '#0000ff';
  ctx.fillRect(0, 50, 50, 50);
  ctx.fillStyle = '#ffff00';
  ctx.fillRect(50, 50, 50, 50);

  // Compress with very low quality (similar to selfie compression)
  return canvas.toDataURL('image/jpeg', 0.1);
};

// Helper function to run the test from browser console
export const runVotingTest = async () => {
  try {
    const result = await testVotingProcessWithAllEmployees();
    console.log('Test completed:', result);
    return result;
  } catch (err) {
    console.error('Test execution failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
};

// Make it available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).runVotingTest = runVotingTest;
  console.log('Voting test function available as: runVotingTest()');
}
