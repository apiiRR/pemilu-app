# Voting System Revision Plan

## Objective

Revise the voting system to remove `can_vote` column from `voter_profiles` table and use `has_voted` column from `employees` table for voting eligibility checking.

## Current State Analysis

### Current Database Structure:

1. **voter_profiles table:**

   - Has `can_vote` column (to be removed)
   - Has `last_vote_at` column
   - Used for tracking voting status

2. **employees table:**

   - Already has `has_voted` column
   - Currently not used for voting eligibility checking

3. **Voting Logic:**
   - Checks email verification ✓
   - Checks admin approval ✓
   - Checks `can_vote` from voter_profiles (to be changed)
   - Will check `has_voted` from employees (new approach)

## Revision Plan

### 1. Database Schema Changes

- **Remove `can_vote` column from `voter_profiles` table**
- **Remove `last_vote_at` column from `voter_profiles` table** (tracking moved to votes table)
- Keep `has_voted` column in `employees` table for eligibility checking

### 2. Code Changes Required

#### A. Database Migration

- Create new migration to remove `can_vote` column from voter_profiles

#### B. Supabase Functions Updates (`src/lib/supabase.ts`)

1. **Update `checkVoterEligibility` function:**

   - Remove `can_vote` check from voter_profiles
   - Add `has_voted` check from employees table
   - Keep email verification and admin approval checks

2. **Update `updateVoterVoteStatus` function:**

   - Update employees table `has_voted = true`
   - Update voter_profiles `last_vote_at` (keep for historical data)
   - Remove `can_vote = false` update

3. **Update TypeScript interfaces:**
   - Remove `can_vote` from VoterProfile interface
   - Update Employee interface to ensure `has_voted` is present

#### C. Frontend Updates

- Review any hardcoded references to `can_vote` in components
- Ensure voting flow works with new eligibility logic

### 3. Files to Modify

#### Core Files:

- `supabase/migrations/` - New migration to remove can_vote column
- `src/lib/supabase.ts` - Update voting eligibility functions

#### Potential Additional Files (to be confirmed during implementation):

- Any React components that reference `can_vote`
- Any database views or queries using `can_vote`

### 4. Updated Voting Flow

1. **Email Verification Check** - Via Supabase Auth
2. **Admin Approval Check** - Via voter_profiles `is_active = true`
3. **Already Voted Check** - Via employees `has_voted = false`
4. **Proceed with voting** if all checks pass

### 5. Testing Requirements

- Test email verification flow
- Test admin approval process
- Test voting eligibility with new logic
- Test voting process updates both tables correctly
- Test that already voted users are properly blocked

### 6. Migration Steps

1. Create database migration to remove can_vote column
2. Update Supabase TypeScript functions
3. Test the complete voting flow
4. Deploy changes

### 7. Benefits of This Change

- Simplified voting eligibility logic
- Single source of truth for voting status (employees.has_voted)
- Cleaner database schema
- More consistent with business logic

## Implementation Status

- [ ] Create database migration
- [ ] Update checkVoterEligibility function
- [ ] Update updateVoterVoteStatus function
- [ ] Update TypeScript interfaces
- [ ] Test complete voting flow
- [ ] Deploy changes
