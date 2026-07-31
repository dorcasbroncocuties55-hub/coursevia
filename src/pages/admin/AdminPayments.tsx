import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getAdminShare, getProviderShare } from "@/lib/pricingRules";

const AdminPayments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);

  const fetchPayments = async () => {
    const { data } = await supabase.from("payments").select("*, profiles!payments_payer_id_fkey(full_name)").order("created_at", { ascending: false });
    setPayments(data || []);
  };

  useEffect(() => { fetchPayments(); }, []);

  const approvePayment = async (payment: any) => {
    try {
      // 1. Update payment status
      await supabase.from("payments").update({ status: "completed" }).eq("id", payment.id);

      // 2. Grant content access
      if (payment.reference_id && (payment.payment_type === "course" || payment.payment_type === "video")) {
        const { data: existingAccess } = await supabase
          .from("content_access")
          .select("id")
          .eq("user_id", payment.payer_id)
          .eq("content_id", payment.reference_id)
          .eq("content_type", payment.payment_type)
          .maybeSingle();

        if (!existingAccess) {
          await supabase.from("content_access").insert({
            user_id: payment.payer_id,
            content_id: payment.reference_id,
            content_type: payment.payment_type,
          });
        }
      }

      // 3. Get admin wallet and creator/coach wallet
      const { data: adminWallet } = await supabase.from("wallets").select("id, balance").eq("user_id", user!.id).single();

      // Find content owner
      let ownerId: string | null = null;
      if (payment.payment_type === "course") {
        const { data: course } = await supabase.from("courses").select("creator_id").eq("id", payment.reference_id).single();
        ownerId = course?.creator_id || null;
      } else if (payment.payment_type === "video") {
        const { data: unifiedVideo } = await supabase
          .from("content_items" as any)
          .select("owner_id")
          .eq("id", payment.reference_id)
          .maybeSingle();

        if (unifiedVideo?.owner_id) {
          ownerId = unifiedVideo.owner_id;
        } else {
          const { data: video } = await supabase.from("videos").select("creator_id").eq("id", payment.reference_id).single();
          ownerId = video?.creator_id || null;
        }
      }

      const commissionAmount = getAdminShare(Number(payment.amount || 0), payment.payment_type);
      const creatorAmount = getProviderShare(Number(payment.amount || 0), payment.payment_type);

      // 4. Credit admin wallet with commission
      if (adminWallet) {
        const newAdminBalance = Number(adminWallet.balance) + commissionAmount;
        await supabase.from("wallets").update({ balance: newAdminBalance }).eq("id", adminWallet.id);
        await supabase.from("wallet_ledger").insert({
          wallet_id: adminWallet.id,
          type: "credit",
          amount: commissionAmount,
          balance_after: newAdminBalance,
          description: `Commission from ${payment.payment_type} payment`,
          reference_id: payment.id,
          reference_type: "payment",
        });
      }

      // 5. Credit owner wallet
      if (payment.payment_type !== "subscription" && ownerId && creatorAmount > 0) {
        const { data: ownerWallet } = await supabase.from("wallets").select("id, balance").eq("user_id", ownerId).single();
        if (ownerWallet) {
          const newOwnerBalance = Number(ownerWallet.balance) + creatorAmount;
          await supabase.from("wallets").update({ balance: newOwnerBalance }).eq("id", ownerWallet.id);
          await supabase.from("wallet_ledger").insert({
            wallet_id: ownerWallet.id,
            type: "credit",
            amount: creatorAmount,
            balance_after: newOwnerBalance,
            description: `Earnings from ${payment.payment_type} sale`,
            reference_id: payment.id,
            reference_type: "payment",
          });
        }
      }

      // 6. Sync optional video_purchases approval
      if (payment.payment_type === "video" && payment.reference_id) {
        const { data: existingPurchase } = await supabase
          .from("video_purchases")
          .select("id")
          .eq("user_id", payment.payer_id)
          .eq("video_id", payment.reference_id)
          .maybeSingle();

        if (existingPurchase) {
          await supabase
            .from("video_purchases")
            .update({ status: "approved" })
            .eq("id", existingPurchase.id);
        } else {
          await supabase.from("video_purchases").insert({
            user_id: payment.payer_id,
            video_id: payment.reference_id,
            amount: payment.amount,
            status: "approved",
          } as any);
        }
      }

      // 7. Notify payer
      await supabase.from("notifications").insert({
        user_id: payment.payer_id,
        title: "Payment Approved",
        message: `Your payment of $${Number(payment.amount).toFixed(2)} has been verified. Content is now unlocked!`,
        type: "payment",
      });

      toast.success("Payment approved, content unlocked, wallets updated!");
      fetchPayments();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve payment");
    }
  };

  const rejectPayment = async (id: string) => {
    await supabase.from("payments").update({ status: "rejected" }).eq("id", id);
    toast.success("Payment rejected");
    fetchPayments();
  };

  return (
    <DashboardLayout role="admin">
      <h1 className="text-2xl font-bold text-foreground mb-6">Payments</h1>
      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-border bg-secondary/50">
            <th className="text-left text-xs font-medium text-muted-foreground p-3">Date</th>
            <th className="text-left text-xs font-medium text-muted-foreground p-3">User</th>
            <th className="text-left text-xs font-medium text-muted-foreground p-3">Type</th>
            <th className="text-left text-xs font-medium text-muted-foreground p-3">Amount</th>
            <th className="text-left text-xs font-medium text-muted-foreground p-3">Method</th>
            <th className="text-left text-xs font-medium text-muted-foreground p-3">Invoice</th>
            <th className="text-left text-xs font-medium text-muted-foreground p-3">Status</th>
            <th className="text-left text-xs font-medium text-muted-foreground p-3">Actions</th>
          </tr></thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="p-3 text-sm">{format(new Date(p.created_at), "PP")}</td>
                <td className="p-3 text-sm">{(p as any).profiles?.full_name || "—"}</td>
                <td className="p-3 text-sm capitalize">{p.payment_type}</td>
                <td className="p-3 text-sm font-mono">${Number(p.amount).toFixed(2)}</td>
                <td className="p-3 text-sm capitalize">{p.payment_method || "—"}</td>
                <td className="p-3 text-sm">
                  {p.invoice_url ? (
                    <a href={p.invoice_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">View</a>
                  ) : "—"}
                </td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    p.status === "completed" ? "bg-primary/10 text-primary" :
                    p.status === "pending" ? "bg-accent/10 text-accent" :
                    "bg-destructive/10 text-destructive"
                  }`}>{p.status}</span>
                </td>
                <td className="p-3">
                  {p.status === "pending" && (
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => approvePayment(p)}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => rejectPayment(p.id)}>Reject</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payments.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">No payments yet.</div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminPayments;
