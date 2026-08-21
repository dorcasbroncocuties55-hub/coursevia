import DashboardLayout from "@/components/layouts/DashboardLayout";

const AdminVerifications = () => {
  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Verifications</h1>
          <p className="text-muted-foreground mt-1">Provider verification management</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
          Verification management coming soon.
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminVerifications;
