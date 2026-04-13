import DashboardLayout from "@/components/layouts/DashboardLayout";
const AdminSettings = () => (
  <DashboardLayout role="admin">
    <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>
    <div className="bg-card border border-border rounded-lg p-6">
      <p className="text-muted-foreground">Platform settings and configuration.</p>
    </div>
  </DashboardLayout>
);
export default AdminSettings;
