import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ScrollableContent } from "@/components/ui/scrollable-content";
import { 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  Star, 
  StarOff, 
  Building2, 
  CreditCard,
  Shield,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

interface Country {
  id: number;
  code: string;
  name: string;
  phone_code: string;
  currency_code: string;
}

interface Bank {
  id: number;
  name: string;
  code: string;
  swift_code: string;
  supports_international: boolean;
}

interface BankAccount {
  id: number;
  bank_id: number;
  account_holder_name: string;
  account_number: string;
  routing_number?: string;
  swift_code?: string;
  iban?: string;
  account_type: string;
  currency: string;
  is_primary: boolean;
  is_verified: boolean;
  is_active: boolean;
  verification_status: string;
  bank_name: string;
  bank_code: string;
  country_name: string;
  country_code: string;
  created_at: string;
}

const BankAccountManager = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);

  // Form state
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [swiftCode, setSwiftCode] = useState("");
  const [iban, setIban] = useState("");
  const [accountType, setAccountType] = useState("checking");

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (selectedCountry) {
      loadBanksByCountry(selectedCountry);
    }
  }, [selectedCountry]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load countries
      const { data: countriesData, error: countriesError } = await supabase
        .from("countries")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (countriesError) throw countriesError;
      setCountries(countriesData || []);

      // Load user's bank accounts
      await loadBankAccounts();
      
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Failed to load banking data");
    } finally {
      setLoading(false);
    }
  };

  const loadBankAccounts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("user_bank_accounts_detailed")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      console.error("Error loading bank accounts:", error);
      toast.error("Failed to load bank accounts");
    }
  };

  const loadBanksByCountry = async (countryCode: string) => {
    try {
      const { data, error } = await supabase
        .rpc("get_banks_by_country", { country_code: countryCode });

      if (error) throw error;
      setBanks(data || []);
    } catch (error: any) {
      console.error("Error loading banks:", error);
      toast.error("Failed to load banks for selected country");
    }
  };

  const resetForm = () => {
    setSelectedCountry("");
    setSelectedBank("");
    setAccountHolderName("");
    setAccountNumber("");
    setRoutingNumber("");
    setSwiftCode("");
    setIban("");
    setAccountType("checking");
    setAdding(false);
    setEditing(null);
  };

  const validateForm = () => {
    if (!selectedCountry) {
      toast.error("Please select a country");
      return false;
    }
    if (!selectedBank) {
      toast.error("Please select a bank");
      return false;
    }
    if (!accountHolderName.trim()) {
      toast.error("Please enter account holder name");
      return false;
    }
    if (!accountNumber.trim()) {
      toast.error("Please enter account number");
      return false;
    }
    return true;
  };

  const addBankAccount = async () => {
    if (!user || !validateForm()) return;

    try {
      setLoading(true);

      // Validate account using the database function
      const { data: isValid, error: validationError } = await supabase
        .rpc("validate_bank_account", {
          p_user_id: user.id,
          p_bank_id: parseInt(selectedBank),
          p_account_number: accountNumber.trim(),
          p_account_holder_name: accountHolderName.trim()
        });

      if (validationError) throw validationError;
      
      if (!isValid) {
        toast.error("This bank account already exists or is invalid");
        return;
      }

      const selectedCountryData = countries.find(c => c.code === selectedCountry);
      const selectedBankData = banks.find(b => b.id === parseInt(selectedBank));

      const { error } = await supabase
        .from("user_bank_accounts")
        .insert({
          user_id: user.id,
          bank_id: parseInt(selectedBank),
          account_holder_name: accountHolderName.trim(),
          account_number: accountNumber.trim(),
          routing_number: routingNumber.trim() || null,
          swift_code: swiftCode.trim() || selectedBankData?.swift_code || null,
          iban: iban.trim() || null,
          account_type: accountType,
          currency: selectedCountryData?.currency_code || "USD",
          country_id: selectedCountryData?.id,
          is_primary: accounts.length === 0, // First account is primary
        });

      if (error) throw error;

      toast.success("Bank account added successfully");
      resetForm();
      await loadBankAccounts();
      
    } catch (error: any) {
      console.error("Error adding bank account:", error);
      toast.error(error.message || "Failed to add bank account");
    } finally {
      setLoading(false);
    }
  };

  const setPrimaryAccount = async (accountId: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .rpc("set_primary_bank_account", {
          p_user_id: user.id,
          p_account_id: accountId
        });

      if (error) throw error;

      toast.success("Primary account updated");
      await loadBankAccounts();
      
    } catch (error: any) {
      console.error("Error setting primary account:", error);
      toast.error("Failed to update primary account");
    }
  };

  const deleteAccount = async (accountId: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_bank_accounts")
        .update({ is_active: false })
        .eq("id", accountId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Bank account removed");
      await loadBankAccounts();
      
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error("Failed to remove bank account");
    }
  };

  const getStatusBadge = (status: string, isVerified: boolean) => {
    if (isVerified) {
      return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle2 size={12} className="mr-1" />Verified</Badge>;
    }
    
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><AlertCircle size={12} className="mr-1" />Pending</Badge>;
      case "rejected":
        return <Badge variant="destructive"><X size={12} className="mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading && accounts.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading bank accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Bank Accounts</h2>
          <p className="text-muted-foreground">Manage your bank accounts for withdrawals</p>
        </div>
        <Button onClick={() => setAdding(true)} disabled={adding}>
          <Plus size={16} className="mr-2" />
          Add Bank Account
        </Button>
      </div>

      {/* Add/Edit Form */}
      {adding && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Bank Account</CardTitle>
            <CardDescription>
              Add a bank account to receive withdrawals from your earnings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Country</Label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollableContent maxHeight="max-h-48">
                      {countries.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name} ({country.currency_code})
                        </SelectItem>
                      ))}
                    </ScrollableContent>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Bank</Label>
                <Select value={selectedBank} onValueChange={setSelectedBank} disabled={!selectedCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollableContent maxHeight="max-h-48">
                      {banks.map((bank) => (
                        <SelectItem key={bank.id} value={bank.id.toString()}>
                          {bank.name} {bank.supports_international && "🌍"}
                        </SelectItem>
                      ))}
                    </ScrollableContent>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Account Holder Name</Label>
                <Input
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  placeholder="Full name as on bank account"
                />
              </div>

              <div>
                <Label>Account Number</Label>
                <Input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Bank account number"
                />
              </div>

              <div>
                <Label>Account Type</Label>
                <Select value={accountType} onValueChange={setAccountType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Routing Number (Optional)</Label>
                <Input
                  value={routingNumber}
                  onChange={(e) => setRoutingNumber(e.target.value)}
                  placeholder="Bank routing number"
                />
              </div>

              <div>
                <Label>SWIFT Code (Optional)</Label>
                <Input
                  value={swiftCode}
                  onChange={(e) => setSwiftCode(e.target.value)}
                  placeholder="International SWIFT code"
                />
              </div>

              <div>
                <Label>IBAN (Optional)</Label>
                <Input
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  placeholder="International Bank Account Number"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={addBankAccount} disabled={loading}>
                {loading ? "Adding..." : "Add Account"}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bank Accounts List */}
      <div className="space-y-4">
        {accounts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 size={48} className="text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Bank Accounts</h3>
              <p className="text-muted-foreground text-center mb-4">
                Add a bank account to receive withdrawals from your earnings
              </p>
              <Button onClick={() => setAdding(true)}>
                <Plus size={16} className="mr-2" />
                Add Your First Bank Account
              </Button>
            </CardContent>
          </Card>
        ) : (
          accounts.map((account) => (
            <Card key={account.id} className={account.is_primary ? "ring-2 ring-primary" : ""}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <CreditCard size={24} className="text-primary" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{account.bank_name}</h3>
                        {account.is_primary && (
                          <Badge variant="default" className="bg-primary">
                            <Star size={12} className="mr-1" />
                            Primary
                          </Badge>
                        )}
                        {getStatusBadge(account.verification_status, account.is_verified)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {account.account_holder_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ****{account.account_number.slice(-4)} • {account.account_type} • {account.currency}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {account.country_name} • Added {new Date(account.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!account.is_primary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPrimaryAccount(account.id)}
                      >
                        <StarOff size={14} className="mr-1" />
                        Set Primary
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteAccount(account.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                {account.swift_code && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      SWIFT: {account.swift_code}
                      {account.routing_number && ` • Routing: ${account.routing_number}`}
                      {account.iban && ` • IBAN: ${account.iban}`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {accounts.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          <Shield size={16} className="inline mr-1" />
          Your bank account information is encrypted and secure
        </div>
      )}
    </div>
  );
};

export default BankAccountManager;