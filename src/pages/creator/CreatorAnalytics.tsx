import DashboardLayout from "@/components/layouts/DashboardLayout";
const CreatorAnalytics = () => (
  <DashboardLayout role="creator">
    <h1 className="text-2xl font-bold text-foreground mb-6">Analytics</h1>
    <div className="bg-card border border-border rounded-lg p-8 text-center">
      <p className="text-muted-foreground">Analytics data will appear here as your content gets views and sales.</p>
    </div>
  </DashboardLayout>
);
export default CreatorAnalytics;
