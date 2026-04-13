import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const AdminCoaches = () => {
  const [coaches, setCoaches] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("coach_profiles").select("*, profiles!coach_profiles_user_id_fkey(full_name, country)").order("created_at", { ascending: false }).then(({ data }) => setCoaches(data || []));
  }, []);

  return (
    <DashboardLayout role="admin">
      <h1 className="text-2xl font-bold text-foreground mb-6">Coaches</h1>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full"><thead><tr className="border-b border-border bg-secondary/50">
          <th className="text-left text-xs font-medium text-muted-foreground p-3">Name</th>
          <th className="text-left text-xs font-medium text-muted-foreground p-3">Headline</th>
          <th className="text-left text-xs font-medium text-muted-foreground p-3">Rate</th>
          <th className="text-left text-xs font-medium text-muted-foreground p-3">Verified</th>
        </tr></thead><tbody>{coaches.map(c => (
          <tr key={c.id} className="border-b border-border last:border-0">
            <td className="p-3 text-sm">{c.profiles?.full_name || "—"}</td>
            <td className="p-3 text-sm">{c.headline || "—"}</td>
            <td className="p-3 text-sm font-mono">${Number(c.hourly_rate || 0).toFixed(2)}/hr</td>
            <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${c.is_verified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{c.is_verified ? "Verified" : "Pending"}</span></td>
          </tr>
        ))}</tbody></table>
      </div>
    </DashboardLayout>
  );
};
export default AdminCoaches;
