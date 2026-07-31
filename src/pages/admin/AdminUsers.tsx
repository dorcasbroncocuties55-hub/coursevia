import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";

const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("profiles").select("*, user_roles(role)").order("created_at", { ascending: false }).then(({ data }) => setUsers(data || []));
  }, []);

  return (
    <DashboardLayout role="admin">
      <h1 className="text-2xl font-bold text-foreground mb-6">Users</h1>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left text-xs font-medium text-muted-foreground p-3">Name</th>
              <th className="text-left text-xs font-medium text-muted-foreground p-3">Roles</th>
              <th className="text-left text-xs font-medium text-muted-foreground p-3">Country</th>
              <th className="text-left text-xs font-medium text-muted-foreground p-3">Onboarded</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="p-3 text-sm text-foreground">{u.full_name || "—"}</td>
                <td className="p-3 text-sm text-foreground">{u.user_roles?.map((r: any) => r.role).join(", ") || "—"}</td>
                <td className="p-3 text-sm text-foreground">{u.country || "—"}</td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${u.onboarding_completed ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{u.onboarding_completed ? "Yes" : "No"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
};
export default AdminUsers;
