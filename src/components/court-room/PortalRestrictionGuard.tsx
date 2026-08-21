/**
 * PortalRestrictionGuard
 *
 * Wraps all /coach/* and /therapist/* routes.
 * On every mount it calls the restrictions API. If the provider has an active
 * court case AND no temporary access (mercy window OR judge-granted), it shows
 * CourtRoomLockdown full-screen instead of rendering the portal page.
 *
 * Two bypass conditions:
 *  1. mercyWindow.hasAccess  — auto 30-min window before/after a booking
 *  2. judgeGrantedAccess.hasAccess — judge explicitly unlocked evidence gathering
 *
 * When either is active the portal renders normally and a dismissible banner
 * is shown at the top of the page.
 */

import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import CourtRoomLockdown from "@/components/court-room/CourtRoomLockdown";
import { PageLoading } from "@/components/LoadingSpinner";
import { Clock, Gavel } from "lucide-react";

interface Props {
  role: "coach" | "therapist";
  children: ReactNode;
}

interface RestrictionState {
  checked: boolean;
  isRestricted: boolean;
  hasMercy: boolean;
  hasJudgeAccess: boolean;
  judgeAccessExpiry: string | null;
  judgeAccessReason: string | null;
  mercyExpiry: string | null;
}

export default function PortalRestrictionGuard({ role, children }: Props) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<RestrictionState>({
    checked: false,
    isRestricted: false,
    hasMercy: false,
    hasJudgeAccess: false,
    judgeAccessExpiry: null,
    judgeAccessReason: null,
    mercyExpiry: null,
  });

  useEffect(() => {
    if (!user?.id || authLoading) return;

    let cancelled = false;

    const check = async () => {
      try {
        const res  = await fetch(`/api/court/provider/restrictions/${user.id}`, {
          headers: { "x-user-id": user.id },
        });

        // If backend unreachable / not configured — don't block the portal
        if (!res.ok) {
          if (!cancelled) setState(s => ({ ...s, checked: true }));
          return;
        }

        const data = await res.json();

        if (!cancelled) {
          setState({
            checked: true,
            isRestricted:      !!data.isRestricted,
            hasMercy:          !!data.mercyWindow?.hasAccess,
            hasJudgeAccess:    !!data.judgeGrantedAccess?.hasAccess,
            judgeAccessExpiry: data.judgeGrantedAccess?.expiresAt ?? null,
            judgeAccessReason: data.judgeGrantedAccess?.reason ?? null,
            mercyExpiry:       data.mercyWindow?.accessEnd ?? null,
          });
        }
      } catch {
        // Network error — don't block portal
        if (!cancelled) setState(s => ({ ...s, checked: true }));
      }
    };

    check();

    // Re-check every 60 s so access changes are picked up automatically
    const interval = setInterval(check, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user?.id, authLoading]);

  // Still waiting for auth or first restriction check
  if (authLoading || !state.checked) return <PageLoading />;

  // No active restriction — render portal normally
  if (!state.isRestricted) return <>{children}</>;

  // Restricted BUT mercy window is active — render portal + mercy banner
  if (state.hasMercy) {
    const expiryStr = state.mercyExpiry
      ? new Date(state.mercyExpiry).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : null;
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-900 px-4 py-2 flex items-center justify-between text-sm font-medium shadow">
          <div className="flex items-center gap-2">
            <Clock size={15} />
            Mercy Window Active — temporary portal access for your upcoming session
          </div>
          {expiryStr && (
            <span className="font-mono text-xs bg-amber-600 text-white px-2 py-0.5 rounded-full">
              Closes at {expiryStr}
            </span>
          )}
        </div>
        <div className="pt-9">{children}</div>
      </>
    );
  }

  // Restricted BUT judge granted access — render portal + judge banner
  if (state.hasJudgeAccess) {
    const expiryStr = state.judgeAccessExpiry
      ? new Date(state.judgeAccessExpiry).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : null;
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white px-4 py-2 flex items-center justify-between text-sm font-medium shadow">
          <div className="flex items-center gap-2">
            <Gavel size={15} />
            Judge has granted you temporary portal access to gather evidence
            {state.judgeAccessReason && (
              <span className="font-normal opacity-80 hidden sm:inline">— {state.judgeAccessReason}</span>
            )}
          </div>
          {expiryStr && (
            <span className="font-mono text-xs bg-blue-700 px-2 py-0.5 rounded-full">
              Expires at {expiryStr}
            </span>
          )}
        </div>
        <div className="pt-9">{children}</div>
      </>
    );
  }

  // Fully restricted — show court room lockdown, portal is inaccessible
  return <CourtRoomLockdown userId={user!.id} role={role} onMercyWindow={() => {
    // When mercy fires, re-check so the guard re-renders with the portal
    setState(s => ({ ...s, hasMercy: true }));
  }} />;
}
