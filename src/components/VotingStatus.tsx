import React from 'react';
import { Clock, Calendar, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useVotingSchedule } from '../hooks/useVotingSchedule';

interface VotingStatusProps {
  showDetails?: boolean;
  className?: string;
}

export const VotingStatus: React.FC<VotingStatusProps> = ({ 
  showDetails = false, 
  className = '' 
}) => {
  const {
    votingStatus,
    loading,
    error,
    formatTimeRemaining,
    getStatusDisplayText,
    getStatusColor
  } = useVotingSchedule();

  if (loading) {

    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
          <span className="text-sm sm:text-base">Memuat status voting...</span>
        </div>
      </div>
    );
  }

  if (error) {

    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 ${className}`}>
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-sm sm:text-base">Error: {error}</span>
        </div>
      </div>
    );
  }


  const getStatusIcon = () => {
    switch (votingStatus.status) {
      case 'inactive':
        return <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />;
      case 'not-started':
        return <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />;
      case 'active':
        return <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />;
      case 'ended':
        return <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />;
    }
  };

  const getStatusBgColor = () => {
    switch (votingStatus.status) {
      case 'inactive':
        return 'bg-gray-50 border-gray-200';
      case 'not-started':
        return 'bg-blue-50 border-blue-200';
      case 'active':
        return 'bg-green-50 border-green-200';
      case 'ended':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };


  return (
    <div className={`border rounded-lg p-3 sm:p-4 ${getStatusBgColor()} ${className}`}>
      <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
        {getStatusIcon()}
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-sm sm:text-base ${getStatusColor()}`}>
            {getStatusDisplayText()}
          </h3>
          {votingStatus.isOpen && votingStatus.timeRemaining > 0 && (
            <div className="flex items-center gap-1 sm:gap-2 mt-1">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
              <span className="text-xs sm:text-sm text-gray-600">
                Waktu tersisa: {formatTimeRemaining(votingStatus.timeRemaining)}
              </span>
            </div>
          )}
        </div>
      </div>


      {showDetails && votingStatus.settings && (
        <div className="mt-3 sm:mt-4 pt-3 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
            <div>
              <span className="font-medium text-gray-700">Nama Voting:</span>
              <div className="text-gray-600 truncate">{votingStatus.settings.voting_name}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Status:</span>
              <div className={`font-medium ${getStatusColor()}`}>
                {votingStatus.settings.is_active ? 'Aktif' : 'Nonaktif'}
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Mulai:</span>
              <div className="text-gray-600 text-xs sm:text-sm">
                {new Date(votingStatus.settings.start_time).toLocaleString('id-ID')}
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Berakhir:</span>
              <div className="text-gray-600 text-xs sm:text-sm">
                {new Date(votingStatus.settings.end_time).toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
