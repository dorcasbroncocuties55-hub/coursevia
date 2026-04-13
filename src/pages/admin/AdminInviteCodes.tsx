import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Plus, Trash2, Clock } from "lucide-react";

type InviteCode = {
  id: string;
  code: string;
  is_active: boolean;
  used_by?: string;
  used_at?: string;
  expires_at?: string;
  created_at: string;
};

const AdminInviteCodes = () => {
  const [codes, setCodes]       = useState<InviteCode[]>([]);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [hours, setHours]       = useState(48);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("admin_invite_codes" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setCodes((data as InviteCode[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.rpc("create_admin_invite_code" as any, { p_expires_hours: hours });
      if (error) throw error;
      toast.success(`Invite code created: ${data}`);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Failed to create code.");
    } finally {
      setCreating(false);
    }
  };

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied.");
  };

  const deactivate = async (id: string) => {
    await supabase.from("admin_invite_codes" as any).update({ is_active: false }).eq("id", id);
    toast.success("Code deactivated.");
    await load();
  };

  return (
    <DashboardLayout role="admin">
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Invite Codes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate codes to invite new admin accounts. Each code can only be used once.
            </p>
          </div>
        </div>

        {/* Create */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <p className="font-semibold text-foreground">Generate new code</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
              <Clock size={14} className="text-muted-foreground" />
              <input
                type="number"
                min={1}
                max={720}
                value={hours}
                onChange={e => setHours(Number(e.target.value))}
                className="w-16 bg-transparent text-sm outline-none"
              />
              <span className="text-sm text-muted-foreground">hours</span>
            </div>
            <Button onClick={create} disabled={creating}>
              <Plus size={15} className="mr-1.5" />
              {creating ? "Generating…" : "Generate code"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Share the code with the new admin. They enter it during signup at /admin-signup.
          </p>
        </div>

        {/* List */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">Code</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">Expires</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">Used</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : codes.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No codes yet.</td></tr>
              ) : codes.map(c => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="p-3">
                    <span className="font-mono font-bold text-foreground tracking-widest">{c.code}</span>
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {c.expires_at ? new Date(c.expires_at).toLocaleString() : "Never"}
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      c.used_by ? "bg-slate-100 text-slate-500" :
                      c.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                      "bg-red-50 text-red-600"
                    }`}>
                      {c.used_by ? "Used" : c.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {c.used_at ? new Date(c.used_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      {!c.used_by && c.is_active && (
                        <>
                          <button onClick={() => copy(c.code)} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground transition" title="Copy">
                            <Copy size={13} />
                          </button>
                          <button onClick={() => deactivate(c.id)} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive transition" title="Deactivate">
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminInviteCodes;
