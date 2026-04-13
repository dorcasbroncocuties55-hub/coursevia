import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const AdminContent = () => {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("content_items" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems((data as any[]) || []));
  }, []);

  return (
    <DashboardLayout role="admin">
      <h1 className="text-2xl font-bold text-foreground mb-6">Unified Content Manager</h1>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left text-xs font-medium text-muted-foreground p-3">Title</th>
              <th className="text-left text-xs font-medium text-muted-foreground p-3">Type</th>
              <th className="text-left text-xs font-medium text-muted-foreground p-3">Price</th>
              <th className="text-left text-xs font-medium text-muted-foreground p-3">Published</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <td className="p-3 text-sm">{item.title}</td>
                <td className="p-3 text-sm capitalize">{String(item.content_type).replace("_", " ")}</td>
                <td className="p-3 text-sm font-mono">${Number(item.price || 0).toFixed(2)}</td>
                <td className="p-3 text-sm">{item.is_published ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
};

export default AdminContent;
