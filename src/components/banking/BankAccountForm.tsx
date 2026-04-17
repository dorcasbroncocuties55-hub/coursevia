import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PayPalAccountForm } from "@/components/banking/PayPalAccountForm";
import { StripeConnectButton } from "@/components/banking/StripeConnectButton";
import {
  Building2, CreditCard, Globe, CheckCircle2,
  AlertCircle, Plus, X, Trash2, Star, Loader2,
} from "lucide-react";

interface Country {
  id: string;
  code: string;
  name: string;
  currency_code: string;
}

interface Bank {
  id: string;
  name: string;
  code: string;
  swift_code: string;
  supports_international: boolean;
}

interface BankAccount {
  id: string;
  account_holder_name: string;
  account_number: string;
  routing_number?: string;
  swift_code?: string;
  iban?: string;
  account_type: string;
  currency: string;
  is_primary: boolean;
  is_verified: boolean;
  verification_status: string;
  bank_name: string;
  country_name: string;
  created_at: string;
}

const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking" },
  { value: "savings",  label: "Savings" },
  { value: "business", label: "Business" },
];

export const BankAccountForm = ({ role = "coach" }: { role?: "coach" | "therapist" | "creator" }) => {
  const { user } = useAuth();

  const [countries, setCountries]   = useState<Country[]>([]);
  const [banks, setBanks]           = useState<Bank[]>([]);
  const [accounts, setAccounts]     = useState<BankAccount[]>([]);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [showPayPal, setShowPayPal] = useState(false);
  const [dbMissing, setDbMissing]   = useState(false);

  // form fields
  const [country, setCountry]   = useState("");
  const [bank, setBank]         = useState("");
  const [holder, setHolder]     = useState("");
  const [accNum, setAccNum]     = useState("");
  const [routing, setRouting]   = useState("");
  const [swift, setSwift]       = useState("");
  const [iban, setIban]         = useState("");
  const [accType, setAccType]   = useState("checking");

  useEffect(() => { 
    if (user) init(); 
  }, []);

  useEffect(() => {
    if (country) loadBanks(country);
    else { setBanks([]); setBank(""); }
  }, [country]);

  const init = async () => {
    setLoadingPage(true);
    await Promise.all([loadCountries(), loadAccounts()]);
    setLoadingPage(false);
  };

  const loadCountries = async () => {
    try {
      const { data, error } = await supabase
        .from("banking_countries")
        .select("id, code, name, currency_code")
        .eq("is_active", true)
        .order("name");

      if (error) {
        // Table doesn't exist — use fallback manual entry mode
        console.warn("banking_countries not found, using manual mode");
        setDbMissing(true);
        return;
      }
      setCountries(data || []);
    } catch {
      setDbMissing(true);
    }
  };

  const loadBanks = async (countryName: string) => {
    setLoadingBanks(true);
    setBank("");
    try {
      const { data, error } = await supabase.rpc("get_banks_by_country", {
        country_input: countryName,
      });
      if (error) throw error;
      setBanks(data || []);
    } catch (err) {
      // RPC missing — just allow manual bank name entry
      console.warn("get_banks_by_country RPC not found, using manual mode");
      setBanks([]);
    } finally {
      setLoadingBanks(false);
    }
  };

  const loadAccounts = async () => {
    if (!user) return;
    try {
      // Try bank_accounts table (matches backend)
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error && (error.code === "PGRST106" || error.code === "42P01")) {
        // Fallback: try user_bank_accounts table
        const { data: basic, error: e2 } = await supabase
          .from("user_bank_accounts")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("is_primary", { ascending: false });
        if (e2) throw e2;
        setAccounts((basic || []).map((a: any) => ({
          ...a,
          bank_name: a.bank_name || "Bank",
          country_name: a.country_name || "",
        })));
        return;
      }
      if (error) throw error;
      
      // Map bank_accounts table to expected interface
      setAccounts((data || []).map((a: any) => ({
        id: a.id,
        account_holder_name: a.account_name || "",
        account_number: a.account_number || "",
        routing_number: a.metadata?.routing_number,
        swift_code: a.metadata?.swift_code,
        iban: a.metadata?.iban,
        account_type: a.metadata?.account_type || "checking",
        currency: a.currency || "USD",
        is_primary: a.is_default || false,
        is_verified: a.verification_status === "verified",
        verification_status: a.verification_status || "pending",
        bank_name: a.bank_name || "Bank",
        country_name: a.country_code || "",
        created_at: a.created_at,
      })));
    } catch (e: any) {
      console.error("loadAccounts:", e);
    }
  };

  const resetForm = () => {
    setCountry(""); setBank(""); setHolder(""); setAccNum("");
    setRouting(""); setSwift(""); setIban(""); setAccType("checking");
    setShowForm(false);
  };

  // manual text fields used when DB tables are missing
  const [manualCountry, setManualCountry] = useState("");
  const [manualBank, setManualBank]       = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const effectiveCountry = dbMissing ? manualCountry.trim() : country;
    const effectiveBank    = dbMissing ? manualBank.trim()    : bank;

    if (!effectiveCountry) { toast.error("Enter your country"); return; }
    if (!effectiveBank)    { toast.error("Enter your bank name"); return; }
    if (!holder.trim())    { toast.error("Enter account holder name"); return; }
    if (accNum.trim().length < 5) { toast.error("Enter a valid account number"); return; }

    setSaving(true);
    try {
      const selectedCountry = countries.find(c => c.name === effectiveCountry);
      const selectedBank    = banks.find(b => b.name === effectiveBank);

      const { error } = await supabase.from("bank_accounts").insert({
        user_id: user.id,
        bank_name: effectiveBank,
        bank_code: selectedBank?.code || effectiveBank,
        account_name: holder.trim(),
        account_number: accNum.trim(),
        country_code: selectedCountry?.code || effectiveCountry.slice(0, 2).toUpperCase(),
        currency: selectedCountry?.currency_code || "USD",
        provider: "manual",
        verification_status: "pending",
        is_default: accounts.length === 0,
        metadata: {
          routing_number: routing.trim() || null,
          swift_code: swift.trim() || selectedBank?.swift_code || null,
          iban: iban.trim() || null,
          account_type: accType,
          bank_id: selectedBank?.id || null,
        },
      });

      if (error) throw error;

      toast.success("Bank account added!");
      resetForm();
      setManualCountry("");
      setManualBank("");
      await loadAccounts();
    } catch (e: any) {
      toast.error(e.message || "Failed to add bank account.");
    } finally {
      setSaving(false);
    }
  };

  const setPrimary = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc("set_primary_bank_account", {
        p_user_id: user.id,
        p_account_id: id,
      });
      if (error) throw error;
      toast.success("Primary account updated.");
      await loadAccounts();
    } catch (e: any) {
      toast.error(e.message || "Failed to update primary account.");
    }
  };

  const deleteAccount = async (id: string) => {
    if (!user || !confirm("Delete this bank account?")) return;
    try {
      const { error } = await supabase
        .from("bank_accounts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Account removed.");
      await loadAccounts();
    } catch (e: any) {
      toast.error(e.message || "Failed to remove account.");
    }
  };

  if (loadingPage) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  // dbMissing just means we use manual text inputs — don't block the whole page

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Stripe Connect — primary payout method */}
      <StripeConnectButton role={role} />

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-border" />
        <span className="text-xs text-muted-foreground">or add manually</span>
        <div className="flex-1 border-t border-border" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bank Accounts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage payout accounts for withdrawals</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => { setShowPayPal(v => !v); setShowForm(false); }}
          >
            {showPayPal ? <X size={14} className="mr-1" /> : <CreditCard size={14} className="mr-1" />}
            {showPayPal ? "Cancel" : "PayPal"}
          </Button>
          <Button
            size="sm"
            onClick={() => { setShowForm(v => !v); setShowPayPal(false); }}
          >
            {showForm ? <X size={14} className="mr-1" /> : <Plus size={14} className="mr-1" />}
            {showForm ? "Cancel" : "Add Bank"}
          </Button>
        </div>
      </div>

      {/* PayPal form */}
      {showPayPal && (
        <PayPalAccountForm
          onAccountAdded={() => { setShowPayPal(false); loadAccounts(); }}
          onCancel={() => setShowPayPal(false)}
        />
      )}

      {/* Add bank form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 size={18} /> New Bank Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Country */}
                <div>
                  <Label>Country *</Label>
                  {dbMissing || countries.length === 0 ? (
                    <Input
                      className="mt-1"
                      value={manualCountry}
                      onChange={e => setManualCountry(e.target.value)}
                      placeholder="e.g. Nigeria, United States"
                    />
                  ) : (
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {countries.map(c => (
                          <SelectItem key={c.id} value={c.name}>
                            <span className="flex items-center gap-2">
                              <Globe size={13} /> {c.name} ({c.currency_code})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Bank */}
                <div>
                  <Label>Bank *</Label>
                  {dbMissing || banks.length === 0 ? (
                    <Input
                      className="mt-1"
                      value={dbMissing ? manualBank : bank}
                      onChange={e => dbMissing ? setManualBank(e.target.value) : setBank(e.target.value)}
                      placeholder="e.g. Access Bank, Chase"
                    />
                  ) : (
                    <Select value={bank} onValueChange={setBank} disabled={!country || loadingBanks}>
                      <SelectTrigger className="mt-1">
                        {loadingBanks
                          ? <span className="flex items-center gap-2 text-muted-foreground"><Loader2 size={13} className="animate-spin" /> Loading…</span>
                          : <SelectValue placeholder={country ? "Select bank" : "Select country first"} />
                        }
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {banks.map(b => (
                          <SelectItem key={b.id} value={b.name}>
                            <span className="flex items-center gap-2">
                              <Building2 size={13} /> {b.name}
                              {b.supports_international && <Globe size={11} className="text-blue-500" />}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Account holder */}
              <div>
                <Label>Account Holder Name *</Label>
                <Input
                  className="mt-1"
                  value={holder}
                  onChange={e => setHolder(e.target.value)}
                  placeholder="Full name as on bank account"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Account number */}
                <div>
                  <Label>Account Number *</Label>
                  <Input
                    className="mt-1"
                    value={accNum}
                    onChange={e => setAccNum(e.target.value)}
                    placeholder="Your account number"
                  />
                </div>

                {/* Account type */}
                <div>
                  <Label>Account Type</Label>
                  <Select value={accType} onValueChange={setAccType}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Optional fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Routing Number</Label>
                  <Input className="mt-1" value={routing} onChange={e => setRouting(e.target.value)} placeholder="Optional" />
                </div>
                <div>
                  <Label>SWIFT Code</Label>
                  <Input className="mt-1" value={swift} onChange={e => setSwift(e.target.value)} placeholder="Optional" />
                </div>
                <div>
                  <Label>IBAN</Label>
                  <Input className="mt-1" value={iban} onChange={e => setIban(e.target.value)} placeholder="Optional" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? <><Loader2 size={14} className="animate-spin mr-2" />Saving…</> : "Add Bank Account"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Saved accounts */}
      {accounts.length > 0 ? (
        <div className="space-y-3">
          {accounts.map(acc => (
            <Card key={acc.id} className={acc.is_primary ? "ring-2 ring-primary" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 mt-0.5">
                      {acc.bank_name?.toLowerCase().includes("paypal")
                        ? <CreditCard size={18} className="text-primary" />
                        : <Building2 size={18} className="text-primary" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">{acc.bank_name}</p>
                        {acc.is_primary && (
                          <Badge className="text-xs"><Star size={10} className="mr-1" />Primary</Badge>
                        )}
                        {acc.is_verified
                          ? <Badge className="bg-emerald-100 text-emerald-800 text-xs"><CheckCircle2 size={10} className="mr-1" />Verified</Badge>
                          : <Badge variant="secondary" className="text-xs"><AlertCircle size={10} className="mr-1" />Pending</Badge>
                        }
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {acc.account_holder_name} · ****{acc.account_number.slice(-4)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {acc.country_name} · {acc.account_type} · {acc.currency}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!acc.is_primary && (
                      <Button variant="outline" size="sm" onClick={() => setPrimary(acc.id)}>
                        Set primary
                      </Button>
                    )}
                    <Button
                      variant="outline" size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteAccount(acc.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !showForm && !showPayPal ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <CreditCard size={22} className="text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No payout accounts yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add a bank account or PayPal to receive withdrawals.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={() => setShowPayPal(true)}>
                <CreditCard size={14} className="mr-1" /> Add PayPal
              </Button>
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus size={14} className="mr-1" /> Add Bank Account
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};
