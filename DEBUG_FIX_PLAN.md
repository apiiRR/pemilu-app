# Debug Code Removal Plan for AdminDashboard.tsx

## Issues Found:

1. `showDebug` variable used but not defined
2. Debug functions imported but not all are used
3. Debug modal JSX references undefined variables
4. Debug state variables causing compilation errors

## Fix Implementation Plan:

### 1. Remove Debug Imports

- Remove: `testSupabaseConnection`, `testAddCandidate`, `debugAuth`, `runCandidateAdditionTest`

### 2. Remove Debug State Variables

- Remove: `showDebug` variable
- Remove: `debugInfo` variable (if exists)

### 3. Remove Debug Modal JSX

- Remove entire debug modal section (lines ~600-680)
- Remove modal backdrop and content

### 4. Clean Up Code Structure

- Remove any debug-related functions or handlers
- Ensure all referenced variables are defined
- Fix any syntax errors or missing imports

### 5. Test Result

- AdminDashboard should load without errors
- All core functionality should remain intact
- No debug tools visible in production

## Expected Outcome:

- Clean, error-free admin dashboard
- Functional candidate management
- Functional employee management
- Functional voter registration approval
- Functional voting settings management
