// Provider Restriction Middleware for Court Room System
// Handles access control and Mercy Rule implementation

import React from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProviderRestriction {
  id: string;
  provider_id: string;
  case_id: string;
  restriction_type: 'full_lockout' | 'booking_disabled' | 'wallet_frozen' | 'profile_hidden';
  mercy_enabled: boolean;
  mercy_window_minutes: number;
  is_active: boolean;
  activated_at: string;
  reason: string;
}

export interface MercyWindowStatus {
  hasAccess: boolean;
  activeBooking?: {
    id: string;
    scheduled_at: string;
    duration: number;
  };
  mercyStart?: string;
  mercyEnd?: string;
  timeRemaining?: number;
}

export interface ProviderAccessStatus {
  isRestricted: boolean;
  restrictions: ProviderRestriction[];
  mercyWindow: MercyWindowStatus;
  accessLevel: 'full' | 'mercy' | 'restricted';
  message?: string;
}

/**
 * Check if provider has active restrictions
 */
export const checkProviderRestrictions = async (providerId: string): Promise<ProviderRestriction[]> => {
  const { data: restrictions, error } = await supabase
    .from('provider_restrictions')
    .select(`
      *,
      court_cases!inner(status)
    `)
    .eq('provider_id', providerId)
    .eq('is_active', true)
    .eq('court_cases.status', 'open');

  if (error) {
    console.error('Error checking provider restrictions:', error);
    return [];
  }

  return restrictions || [];
};

/**
 * Check mercy window access for provider
 */
export const checkMercyWindowAccess = async (providerId: string): Promise<MercyWindowStatus> => {
  const now = new Date();

  // Get bookings within 2-hour window (1 hour before, 1 hour after current time)
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, scheduled_at, duration')
    .eq('provider_id', providerId)
    .eq('status', 'confirmed')
    .gte('scheduled_at', new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString())
    .lte('scheduled_at', new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString())
    .order('scheduled_at', { ascending: true });

  if (error || !bookings || bookings.length === 0) {
    return { hasAccess: false };
  }

  // Check each booking for mercy window
  for (const booking of bookings) {
    const bookingStart = new Date(booking.scheduled_at);
    const bookingDuration = booking.duration || 60; // Default 60 minutes
    const bookingEnd = new Date(bookingStart.getTime() + bookingDuration * 60 * 1000);

    // 30-minute mercy window before and after
    const mercyStart = new Date(bookingStart.getTime() - 30 * 60 * 1000);
    const mercyEnd = new Date(bookingEnd.getTime() + 30 * 60 * 1000);

    if (now >= mercyStart && now <= mercyEnd) {
      const timeRemaining = Math.max(0, mercyEnd.getTime() - now.getTime());

      return {
        hasAccess: true,
        activeBooking: booking,
        mercyStart: mercyStart.toISOString(),
        mercyEnd: mercyEnd.toISOString(),
        timeRemaining: Math.ceil(timeRemaining / 1000 / 60) // minutes
      };
    }
  }

  return { hasAccess: false };
};

/**
 * Get complete provider access status
 */
export const getProviderAccessStatus = async (providerId: string): Promise<ProviderAccessStatus> => {
  const restrictions = await checkProviderRestrictions(providerId);
  const mercyWindow = await checkMercyWindowAccess(providerId);

  const isRestricted = restrictions.length > 0;

  if (!isRestricted) {
    return {
      isRestricted: false,
      restrictions: [],
      mercyWindow: { hasAccess: false },
      accessLevel: 'full'
    };
  }

  // Provider is restricted, check mercy window
  if (mercyWindow.hasAccess) {
    return {
      isRestricted: true,
      restrictions,
      mercyWindow,
      accessLevel: 'mercy',
      message: `Temporary access granted for active session. Access expires in ${mercyWindow.timeRemaining} minutes.`
    };
  }

  return {
    isRestricted: true,
    restrictions,
    mercyWindow,
    accessLevel: 'restricted',
    message: 'Dashboard access restricted due to active dispute. Access will be restored during scheduled session times.'
  };
};

/**
 * Format next mercy window time for display
 */
export const getNextMercyWindow = async (providerId: string): Promise<string | null> => {
  const now = new Date();

  // Get next upcoming booking
  const { data: nextBooking } = await supabase
    .from('bookings')
    .select('scheduled_at, duration')
    .eq('provider_id', providerId)
    .eq('status', 'confirmed')
    .gt('scheduled_at', now.toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .single();

  if (!nextBooking) {
    return null;
  }

  const bookingStart = new Date(nextBooking.scheduled_at);
  const mercyStart = new Date(bookingStart.getTime() - 30 * 60 * 1000);

  return mercyStart.toISOString();
};

/**
 * Provider access guard hook for React components
 */
export const useProviderAccessGuard = (providerId: string) => {
  const [accessStatus, setAccessStatus] = React.useState<ProviderAccessStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const checkAccess = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const status = await getProviderAccessStatus(providerId);
      setAccessStatus(status);
    } catch (err) {
      console.error('Error checking provider access:', err);
      setError(err instanceof Error ? err.message : 'Failed to check access');
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  React.useEffect(() => {
    if (providerId) {
      checkAccess();

      // Check access every 30 seconds during restrictions
      const interval = setInterval(() => {
        if (accessStatus?.isRestricted) {
          checkAccess();
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [providerId, checkAccess]);

  return {
    accessStatus,
    loading,
    error,
    refreshAccess: checkAccess
  };
};