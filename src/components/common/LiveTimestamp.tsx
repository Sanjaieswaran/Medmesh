import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface LiveTimestampProps {
  timestamp?: string | number | Date;
  showVerificationStatus?: boolean;
  showStatus?: boolean;
  verificationStatus?: 'Verified' | 'Pending' | 'Flagged';
  className?: string;
  compact?: boolean;
}

export const LiveTimestamp: React.FC<LiveTimestampProps> = ({
  timestamp,
  showVerificationStatus,
  showStatus,
  verificationStatus = 'Verified',
  className = '',
  compact = false
}) => {
  const displayStatus = showStatus !== undefined ? showStatus : (showVerificationStatus !== undefined ? showVerificationStatus : true);
  const [, setTick] = useState(0);

  // Re-calculate relative time every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(prev => prev + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const formatRelativeTime = (): string => {
    if (!timestamp) return 'Updated Just Now';

    // Parse timestamp
    let dateObj: Date;
    if (typeof timestamp === 'string') {
      // Check if it's already an ISO date
      const parsed = Date.parse(timestamp);
      if (!isNaN(parsed)) {
        dateObj = new Date(parsed);
      } else {
        // Humanized string like "Just now", "4 mins ago", etc.
        return timestamp;
      }
    } else if (typeof timestamp === 'number') {
      dateObj = new Date(timestamp);
    } else {
      dateObj = timestamp;
    }

    const now = Date.now();
    const diffSeconds = Math.max(0, Math.floor((now - dateObj.getTime()) / 1000));

    if (diffSeconds < 10) {
      return 'Updated Just Now';
    } else if (diffSeconds < 60) {
      return `Updated ${diffSeconds}s ago`;
    } else if (diffSeconds < 120) {
      return 'Last Updated: 1 minute ago';
    } else if (diffSeconds < 3600) {
      return `Last Updated: ${Math.floor(diffSeconds / 60)} minutes ago`;
    } else if (diffSeconds < 7200) {
      return 'Last Updated: 1 hour ago';
    } else {
      return `Last Updated: ${Math.floor(diffSeconds / 3600)} hours ago`;
    }
  };

  const isJustNow = formatRelativeTime() === 'Updated Just Now';

  if (compact) {
    return (
      <div className={`inline-flex items-center space-x-2 text-xs ${className}`}>
        <span className="flex items-center space-x-1 text-slate-500">
          <Clock className={`w-3.5 h-3.5 ${isJustNow ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
          <span className={isJustNow ? 'font-black text-emerald-700' : 'font-medium'}>
            {formatRelativeTime()}
          </span>
        </span>
        {displayStatus && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-2.5 h-2.5 mr-0.5 text-emerald-600" />
            Verified
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs ${className}`}>
      <div className="flex items-center space-x-1.5 text-slate-500">
        <Clock className={`w-3.5 h-3.5 ${isJustNow ? 'text-emerald-500 animate-spin-slow' : 'text-slate-400'}`} />
        <span className={isJustNow ? 'font-black text-emerald-700' : 'font-medium text-slate-600'}>
          {formatRelativeTime()}
        </span>
      </div>

      {displayStatus && (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>Verification Status: {verificationStatus}</span>
        </span>
      )}
    </div>
  );
};
