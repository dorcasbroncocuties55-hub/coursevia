import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const AdminTransactions = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("transactions").select("*").order("created_at", { ascending: false }).then(({ data }) => setTransactions(data || []));
  }, []);

  return (
    <DashboardLayout role="admin">
      <h1 className="text-2xl font-bold text-foreground mb-6">Transactions</h1>
      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-border bg-secondary/50">
            <th className="text-left text-xs font-medium text-muted-foreground p-3">Type</th>
            <th className="text-left text-xs font-medium text-muted-foreground p-3">Amount</th>
            <th className="text-left text-xs font-medium text-muted-foreground p-3">Commission</th>
            <th className="text-left text-xs font-medium text-muted-foreground p-3">Status</th>
          </tr></thead>
          <tbody>{transactions.map(t => (
            <tr key={t.id} className="border-b border-border last:border-0">
              <td className="p-3 text-sm capitalize">{t.type}</td>
              <td className="p-3 text-sm font-mono">${Number(t.amount).toFixed(2)}</td>
              <td className="p-3 text-sm font-mono">${Number(t.commission_amount).toFixed(2)}</td>
              <td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">{t.status}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </DashboardLayout>
  );
};
export default AdminTransactions;
