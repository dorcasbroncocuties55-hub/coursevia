import { Navigate } from "react-router-dom";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { InviteFriends } from "@/components/dashboard/InviteFriends";
import { PageLoading } from "@/components/LoadingSpinner";

const TherapistInvitePage = () => {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) return <PageLoading />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <DashboardLayout role="therapist">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invite Friends</h1>
          <p className="text-muted-foreground mt-2">
            Share Coursevia with colleagues and potential clients
          </p>
        </div>
        <InviteFriends />
      </div>
    </DashboardLayout>
  );
};

export default TherapistInvitePage;
