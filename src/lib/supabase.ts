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
  has_voted: boolean;
  created_at: string;
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
