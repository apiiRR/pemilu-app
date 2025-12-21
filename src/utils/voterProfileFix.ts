// Utility functions untuk fix voter profile issues
import { supabase } from '../lib/supabase';

export interface VoterProfileDebugInfo {
  user_id: string;
  employee_id: string;
  email: string;
  has_profile: boolean;
  profile_active: boolean;
  can_vote: boolean;
  last_vote_at: string | null;
  registration_exists: boolean;
  registration_approved: boolean;
}

// Function untuk debug voter eligibility menggunakan RPC function
export const debugVoterEligibility = async (userId: string): Promise<VoterProfileDebugInfo[]> => {
  try {
    console.log('=== DEBUGGING VOTER ELIGIBILITY ===');
    console.log('User ID:', userId);
    
    const { data, error } = await supabase
      .rpc('debug_voter_eligibility', { user_uuid: userId });
    
    if (error) {
      console.error('Debug function error:', error);
      throw error;
    }
    
    console.log('Debug result:', data);
    return data || [];
  } catch (err) {
    console.error('Failed to debug voter eligibility:', err);
    throw err;
  }
};

// Function untuk manually fix voter profiles
export const fixVoterProfiles = async (): Promise<{ success: boolean; message: string; details?: any }> => {
  try {
    console.log('=== FIXING VOTER PROFILES ===');
    
    const { data, error } = await supabase
      .rpc('fix_voter_profiles');
    
    if (error) {
      console.error('Fix voter profiles error:', error);
      throw error;
    }
    
    console.log('Fix voter profiles result:', data);
    return { 
      success: true, 
      message: 'Voter profiles fix completed successfully',
      details: data 
    };
  } catch (err) {
    console.error('Failed to fix voter profiles:', err);
    return { 
      success: false, 
      message: `Failed to fix voter profiles: ${err instanceof Error ? err.message : 'Unknown error'}` 
    };
  }
};

// Function untuk manually create voter profile
export const createVoterProfileManual = async (
  userId: string, 
  employeeId: string, 
  email: string
): Promise<{ success: boolean; message: string; profile?: any }> => {
  try {
    console.log('=== CREATING VOTER PROFILE MANUALLY ===');
    console.log('Parameters:', { userId, employeeId, email });
    
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('voter_profiles')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();
    
    if (existingProfile) {
      console.log('Profile already exists:', existingProfile);
      
      // Update existing profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('voter_profiles')
        .update({
          user_id: userId,
          email: email,
          is_active: true,
          can_vote: true,
          updated_at: new Date().toISOString()
        })
        .eq('employee_id', employeeId)
        .select()
        .single();
      
      if (updateError) {
        console.error('Update profile error:', updateError);
        throw updateError;
      }
      
      console.log('Profile updated successfully:', updatedProfile);
      return { 
        success: true, 
        message: 'Voter profile updated successfully',
        profile: updatedProfile 
      };
    } else {
      // Create new profile
      const { data: newProfile, error: insertError } = await supabase
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
      
      if (insertError) {
        console.error('Insert profile error:', insertError);
        throw insertError;
      }
      
      console.log('New profile created successfully:', newProfile);
      return { 
        success: true, 
        message: 'Voter profile created successfully',
        profile: newProfile 
      };
    }
  } catch (err) {
    console.error('Failed to create voter profile manually:', err);
    return { 
      success: false, 
      message: `Failed to create voter profile: ${err instanceof Error ? err.message : 'Unknown error'}` 
    };
  }
};

// Function untuk re-approve voter registration
export const reApproveVoter = async (registrationId: string, approverId: string): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('=== RE-APPROVING VOTER REGISTRATION ===');
    console.log('Parameters:', { registrationId, approverId });
    
    const { error } = await supabase
      .rpc('approve_voter_registration', {
        registration_id: registrationId,
        approver_id: approverId
      });
    
    if (error) {
      console.error('Re-approve error:', error);
      throw error;
    }
    
    console.log('Voter re-approved successfully');
    return { 
      success: true, 
      message: 'Voter registration re-approved successfully' 
    };
  } catch (err) {
    console.error('Failed to re-approve voter:', err);
    return { 
      success: false, 
      message: `Failed to re-approve voter: ${err instanceof Error ? err.message : 'Unknown error'}` 
    };
  }
};

// Function untuk get voter profile status summary
export const getVoterStatusSummary = async (): Promise<any> => {
  try {
    console.log('=== GETTING VOTER STATUS SUMMARY ===');
    
    // Get voter registrations
    const { data: registrations } = await supabase
      .from('voter_registrations')
      .select('*')
      .order('registration_date', { ascending: false });
    
    // Get voter profiles
    const { data: profiles } = await supabase
      .from('voter_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    const summary = {
      registrations: {
        total: registrations?.length || 0,
        approved: registrations?.filter(r => r.is_approved).length || 0,
        pending: registrations?.filter(r => !r.is_approved && r.user_id).length || 0,
        awaiting_verification: registrations?.filter(r => !r.user_id).length || 0
      },
      profiles: {
        total: profiles?.length || 0,
        active: profiles?.filter(p => p.is_active).length || 0,
        can_vote: profiles?.filter(p => p.can_vote).length || 0,
        already_voted: profiles?.filter(p => p.last_vote_at).length || 0
      },
      mismatches: {
        approved_without_profile: registrations?.filter(r => r.is_approved && !profiles?.some(p => p.employee_id === r.employee_id)).length || 0,
        profile_without_registration: profiles?.filter(p => !registrations?.some(r => r.employee_id === p.employee_id)).length || 0
      }
    };
    
    console.log('Voter status summary:', summary);
    return summary;
  } catch (err) {
    console.error('Failed to get voter status summary:', err);
    throw err;
  }
};
