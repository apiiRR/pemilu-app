import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Candidate {
  id: string;
  name: string;
  photo_url: string | null;
  description: string | null;
  order_number: number;
  created_at: string;
}

export interface Employee {
  id: string;
  employee_id: string;
  employee_name: string | null;
  has_voted: boolean;
  has_voter_account?: boolean;
  voter_profile_id?: string;
  created_at: string;
}

export interface VoterRegistration {
  id: string;
  employee_id: string;
  email: string;
  face_photo_url?: string;
  registration_date: string;
  is_approved: boolean;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface VoterProfile {
  id: string;
  user_id: string;
  employee_id: string;
  email: string;
  face_photo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vote {
  id: string;
  employee_id: string;
  candidate_id: string;
  selfie_url: string;
  voted_at: string;
}


export interface VoteResult {
  id: string;
  name: string;
  photo_url: string | null;
  description: string | null;
  order_number: number;
  vote_count: number;
  percentage: number;
}

export interface VotingSettings {
  id: string;
  voting_name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VotingStatus {
  isOpen: boolean;
  isActive: boolean;
  timeRemaining: number; // in milliseconds
  status: 'not-started' | 'active' | 'ended' | 'inactive';
  settings: VotingSettings | null;
}

// Voting schedule functions
export const checkVotingStatus = async (): Promise<VotingStatus> => {
  try {
    // Get the most recent voting settings
    const { data: settings, error } = await supabase
      .from('voting_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !settings) {
      return {
        isOpen: false,
        isActive: false,
        timeRemaining: 0,
        status: 'inactive',
        settings: null
      };
    }

    const now = new Date();
    const startTime = new Date(settings.start_time);
    const endTime = new Date(settings.end_time);
    const timeRemaining = endTime.getTime() - now.getTime();

    let status: VotingStatus['status'];
    let isOpen = false;
    let isActive = settings.is_active;

    if (!isActive) {
      status = 'inactive';
    } else if (now < startTime) {
      status = 'not-started';
    } else if (now > endTime) {
      status = 'ended';
    } else {
      status = 'active';
      isOpen = true;
    }

    return {
      isOpen,
      isActive,
      timeRemaining: Math.max(0, timeRemaining),
      status,
      settings
    };
  } catch (error) {
    console.error('Error checking voting status:', error);
    return {
      isOpen: false,
      isActive: false,
      timeRemaining: 0,
      status: 'inactive',
      settings: null
    };
  }
};

export const updateVotingSettings = async (settings: {
  start_time: string;
  end_time: string;
  is_active: boolean;
  voting_name?: string;
}) => {
  const { data, error } = await supabase
    .from('voting_settings')
    .insert({
      voting_name: settings.voting_name || 'Pemilihan Ketua Serikat Pekerja',
      start_time: settings.start_time,
      end_time: settings.end_time,
      is_active: settings.is_active
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update voting settings: ${error.message}`);
  }

  return data;
};

export const getVotingSettings = async (): Promise<VotingSettings | null> => {
  const { data, error } = await supabase
    .from('voting_settings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
};

// Function to check voter eligibility (email verified + admin approved)
export const checkVoterEligibility = async (userId: string) => {
  try {
    console.log('=== CHECKING VOTER ELIGIBILITY ===');
    console.log('User ID:', userId);
    
    // First, get detailed debug info
    const { data: debugInfo, error: debugError } = await supabase
      .rpc('debug_voter_eligibility', { user_uuid: userId });
    
    if (debugError) {
      console.warn('Debug function error (continuing anyway):', debugError);
    } else {
      console.log('Debug info:', debugInfo);
    }
    
    const { data: profile, error } = await supabase
      .from('voter_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    console.log('Profile query result:', { profile, error });

    if (error) {
      console.error('Error checking voter eligibility:', error);
      return { 
        eligible: false, 
        error: 'Error checking voter status. Silakan coba lagi atau hubungi admin.' 
      };
    }

    if (!profile) {
      console.warn('No voter profile found for user:', userId);
      
      // Try to get any profile (even inactive) for debugging
      const { data: anyProfile } = await supabase
        .from('voter_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
        
      if (anyProfile) {
        console.log('Found inactive profile:', anyProfile);
        return { 
          eligible: false, 
          error: `Akun Anda ditemukan tetapi tidak aktif. Status: is_active=${anyProfile.is_active}. Silakan hubungi admin.` 
        };
      }
      
      return { 
        eligible: false, 
        error: 'Akun Anda belum diaktivasi atau belum diapprove oleh admin. Silakan hubungi admin.' 
      };
    }

    // Check if user has already voted by checking employees table
    console.log('Checking employees table for has_voted status...');
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('has_voted')
      .eq('employee_id', profile.employee_id)
      .maybeSingle();

    if (employeeError) {
      console.error('Error checking employee status:', employeeError);
      return { 
        eligible: false, 
        error: 'Error checking employee voting status. Silakan coba lagi atau hubungi admin.' 
      };
    }

    if (!employee) {
      console.warn('No employee record found for employee_id:', profile.employee_id);
      return { 
        eligible: false, 
        error: 'Data employee tidak ditemukan. Silakan hubungi admin.' 
      };
    }

    if (employee.has_voted) {
      console.log('User already voted (from employees table):', employee.has_voted);
      return { 
        eligible: false, 
        error: 'Anda sudah melakukan voting sebelumnya. Setiap voter hanya dapat voting sekali.',
        profile 
      };
    }

    // Double-check: also verify no vote exists in votes table
    console.log('Checking votes table for existing vote...');
    const { data: existingVote, error: voteError } = await supabase
      .from('votes')
      .select('id, voted_at')
      .eq('employee_id', profile.employee_id)
      .maybeSingle();

    if (voteError) {
      console.warn('Error checking votes table:', voteError);
      // Continue with other checks
    } else if (existingVote) {
      console.log('Found existing vote in votes table:', existingVote);
      return { 
        eligible: false, 
        error: 'Anda sudah melakukan voting sebelumnya. Data vote ditemukan di sistem.',
        profile 
      };
    }

    console.log('User is eligible to vote:', profile);
    return { eligible: true, profile };
  } catch (err) {
    console.error('Unexpected error checking voter eligibility:', err);
    return { 
      eligible: false, 
      error: 'Terjadi kesalahan saat memeriksa status voter. Silakan coba lagi.' 
    };
  }
};

// Function to manually create voter profile (for debugging)
export const createVoterProfile = async (userId: string, employeeId: string, email: string) => {
  try {
    console.log('=== CREATING VOTER PROFILE ===');
    console.log('Creating profile for:', { userId, employeeId, email });
    
    const { data, error } = await supabase
      .from('voter_profiles')
      .insert({
        user_id: userId,
        employee_id: employeeId,
        email: email,
        is_active: true,
        can_vote: true
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error creating voter profile:', error);
      throw error;
    }
    
    console.log('Voter profile created successfully:', data);
    return { success: true, profile: data };
  } catch (err) {
    console.error('Failed to create voter profile:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
};

// Function to update voter vote status after voting
export const updateVoterVoteStatus = async (voterProfileId: string) => {
  try {
    console.log('=== UPDATING VOTER VOTE STATUS ===');
    console.log('Voter Profile ID:', voterProfileId);
    
    // First, get the voter profile to get the employee_id
    const { data: voterProfile, error: profileError } = await supabase
      .from('voter_profiles')
      .select('*')
      .eq('id', voterProfileId)
      .single();

    if (profileError) {
      throw new Error(`Failed to fetch voter profile: ${profileError.message}`);
    }

    console.log('Voter profile found:', voterProfile);
    
    // Update employees table to set has_voted = true
    console.log('Updating employees table...');
    const { error: employeeError } = await supabase
      .from('employees')
      .update({ has_voted: true })
      .eq('employee_id', voterProfile.employee_id);

    if (employeeError) {
      throw new Error(`Failed to update employees table: ${employeeError.message}`);
    }

    console.log('Employees table updated successfully');
    console.log('=== VOTER VOTE STATUS UPDATE COMPLETED ===');
  } catch (error) {
    console.error('Error updating voter vote status:', error);
    throw new Error(`Failed to update voter status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Function to delete employee and all related data
export const deleteEmployee = async (employeeId: string) => {
  try {
    console.log('Starting employee deletion for:', employeeId);

    // First, get voter_profile if exists
    const { data: voterProfile } = await supabase
      .from('voter_profiles')
      .select('id, user_id')
      .eq('employee_id', employeeId)
      .single();

    // Delete votes first (if any)
    console.log('Deleting votes for employee:', employeeId);
    const { error: votesError } = await supabase
      .from('votes')
      .delete()
      .eq('employee_id', employeeId);

    if (votesError) {
      console.warn('Error deleting votes:', votesError);
      // Continue with deletion even if votes deletion fails
    }

    // Delete voter profile if exists
    if (voterProfile) {
      console.log('Deleting voter profile:', voterProfile.id);
      const { error: profileError } = await supabase
        .from('voter_profiles')
        .delete()
        .eq('id', voterProfile.id);

      if (profileError) {
        console.warn('Error deleting voter profile:', profileError);
        // Continue with deletion even if profile deletion fails
      }

      // Note: We don't delete the auth user here as it might be used for other purposes
      // The auth user deletion should be handled separately if needed
    }

    // Delete voter registration if exists
    console.log('Deleting voter registration for employee:', employeeId);
    const { error: registrationError } = await supabase
      .from('voter_registrations')
      .delete()
      .eq('employee_id', employeeId);

    if (registrationError) {
      console.warn('Error deleting voter registration:', registrationError);
      // Continue with deletion even if registration deletion fails
    }

    // Finally, delete the employee
    console.log('Deleting employee:', employeeId);
    const { error: employeeError } = await supabase
      .from('employees')
      .delete()
      .eq('employee_id', employeeId);

    if (employeeError) {
      console.error('Error deleting employee:', employeeError);
      throw new Error(`Failed to delete employee: ${employeeError.message}`);
    }

    console.log('Employee deletion completed successfully');
    return { success: true, message: 'Employee dan data terkait berhasil dihapus' };

  } catch (error: any) {
    console.error('Unexpected error in deleteEmployee:', error);
    return { success: false, error: error.message || 'Terjadi kesalahan saat menghapus employee' };
  }
};

// Function to delete vote and reset user voting status
export const deleteVoteAndResetStatus = async (employeeId: string) => {
  try {
    console.log('=== DELETING VOTE AND RESETTING STATUS ===');
    console.log('Employee ID:', employeeId);

    // Delete the vote record
    console.log('Deleting vote record...');
    const { error: voteError } = await supabase
      .from('votes')
      .delete()
      .eq('employee_id', employeeId);

    if (voteError) {
      throw new Error(`Failed to delete vote: ${voteError.message}`);
    }

    console.log('Vote record deleted successfully');

    // Reset has_voted status in employees table
    console.log('Resetting has_voted status in employees table...');
    const { error: employeeError } = await supabase
      .from('employees')
      .update({ has_voted: false })
      .eq('employee_id', employeeId);

    if (employeeError) {
      console.error('Failed to reset employee status:', employeeError);
      throw new Error(`Failed to reset employee status: ${employeeError.message}`);
    }

    console.log('Employee has_voted status reset to false');

    console.log('=== VOTE DELETION AND STATUS RESET COMPLETED ===');
    return { success: true, message: 'Vote berhasil dihapus dan status voting direset' };

  } catch (error: any) {
    console.error('Error in deleteVoteAndResetStatus:', error);
    return { success: false, error: error.message || 'Terjadi kesalahan saat menghapus vote' };
  }
};

// Function to bulk delete votes and reset multiple users
export const bulkDeleteVotesAndResetStatus = async (employeeIds: string[]) => {
  try {
    console.log('=== BULK DELETING VOTES AND RESETTING STATUS ===');
    console.log('Employee IDs:', employeeIds);

    if (!employeeIds || employeeIds.length === 0) {
      throw new Error('Daftar employee ID tidak boleh kosong');
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each employee ID
    for (const employeeId of employeeIds) {
      try {
        console.log(`Processing employee ID: ${employeeId}`);
        
        // Delete vote record
        const { error: voteError } = await supabase
          .from('votes')
          .delete()
          .eq('employee_id', employeeId);

        if (voteError) {
          console.warn(`Error deleting vote for ${employeeId}:`, voteError);
        }

        // Reset employee status
        const { error: employeeError } = await supabase
          .from('employees')
          .update({ has_voted: false })
          .eq('employee_id', employeeId);

        if (employeeError) {
          console.warn(`Error resetting employee status for ${employeeId}:`, employeeError);
        }

        successCount++;
        results.push({ employeeId, success: true });

      } catch (error: any) {
        console.error(`Error processing employee ${employeeId}:`, error);
        errorCount++;
        results.push({ employeeId, success: false, error: error.message });
      }
    }

    console.log(`=== BULK OPERATION COMPLETED ===`);
    console.log(`Success: ${successCount}, Errors: ${errorCount}`);

    const message = `Berhasil memproses ${successCount} user, ${errorCount} error`;
    
    return { 
      success: true, 
      message,
      successCount,
      errorCount,
      results
    };

  } catch (error: any) {
    console.error('Error in bulkDeleteVotesAndResetStatus:', error);
    return { 
      success: false, 
      error: error.message || 'Terjadi kesalahan saat bulk delete votes',
      successCount: 0,
      errorCount: employeeIds?.length || 0,
      results: []
    };
  }
};
