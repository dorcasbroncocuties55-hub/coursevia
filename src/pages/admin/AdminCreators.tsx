import DashboardLayout from "@/components/layouts/DashboardLayout";
const AdminCreators = () => (
  <DashboardLayout role="admin">
    <h1 className="text-2xl font-bold text-foreground mb-6">Creators</h1>
    <div className="bg-card border border-border rounded-lg p-8 text-center"><p className="text-muted-foreground">Creator management is available here. Review creator accounts, monitor publishing readiness, and manage platform quality from one place.</p></div>
  </DashboardLayout>
);
export default AdminCreators;
