import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getUserBankAccounts, type BankAccountDetailed } from "@/lib/bankingApi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Plus,
  CreditCard,
  Globe
} from "lucide-react";
import { formatAccountNumber } from "@/lib/bankingApi";
import { DatabaseSetupNotice } from "@/components/ui/database-setup-notice";

interface BankAccountSelectorProps {
  value?: string;
  onValueChange: (accountId: string) => void;
  onAddAccount?: () => void;
  showAddButton?: boolean;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const BankAccountSelector = ({
  value,
  onValueChange,
  onAddAccount,
  showAddButton = true,
  className,
  placeholder = "Select bank account",
  disabled = false,
}: BankAccountSelectorProps) => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccountDetailed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadBankAccounts();
    }
  }, [user]);

  const loadBankAccounts = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      // Try the detailed view first, fallback to basic table if view doesn't exist
      let { data, error } = await supabase
        .from("user_bank_accounts_detailed")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: false });

      // If the view doesn't exist (404), try the basic table with joins
      if (error && error.code === "PGRST106") {
        const { data: basicData, error: basicError } = await supabase
          .from("user_bank_accounts")
          .select(`
            *,
            banks!inner(name, code, swift_code, supports_international),
            countries!inner(name, code, phone_code, currency_code)
          `)
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("is_primary", { ascending: false })
          .order("created_at", { ascending: false });

        if (basicError) throw basicError;
        
        // Transform the data to match the detailed view structure
        data = basicData?.map(account => ({
          ...account,
          bank_name: account.banks.name,
          bank_code: account.banks.code,
          bank_swift_code: account.banks.swift_code,
          supports_international: account.banks.supports_international,
          country_name: account.countries.name,
          country_code: account.countries.code,
          country_phone_code: account.countries.phone_code,
          country_currency: account.countries.currency_code,
        })) || [];
      } else if (error) {
        throw error;
      }

      setAccounts(data || []);
      
      // Auto-select primary account if no value is set
      if (!value && data && data.length > 0) {
        const primaryAccount = data.find(acc => acc.is_primary) || data[0];
        onValueChange(primaryAccount.id.toString());
      }
    } catch (err: any) {
      console.error("Error loading bank accounts:", err);
      if (err.code === "PGRST106" || err.message?.includes("404")) {
        setError("Banking system not fully configured. Please run the global banking system SQL script.");
      } else {
        setError(err.message || "Failed to load bank accounts");
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (account: BankAccountDetailed) => {
    if (account.is_verified) {
      return <CheckCircle2 size={14} className="text-green-600" />;
    }
    if (account.verification_status === "pending") {
      return <AlertCircle size={14} className="text-amber-600" />;
    }
    return <AlertCircle size={14} className="text-red-600" />;
  };

  const getStatusBadge = (account: BankAccountDetailed) => {
    if (account.is_verified) {
      return <Badge variant="default" className="bg-green-100 text-green-800 text-xs">Verified</Badge>;
    }
    if (account.verification_status === "pending") {
      return <Badge variant="secondary" className="text-xs">Pending</Badge>;
    }
    return <Badge variant="destructive" className="text-xs">Unverified</Badge>;
  };

  if (loading) {
    return (
      <div className={`animate-pulse bg-muted rounded-md h-10 ${className}`} />
    );
  }

  if (error) {
    if (error.includes("Banking system not fully configured")) {
      return <DatabaseSetupNotice />;
    }
    
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (accounts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <CreditCard size={24} className="text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-2">No Bank Accounts</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add a bank account to receive withdrawals
          </p>
          {showAddButton && onAddAccount && (
            <Button onClick={onAddAccount} size="sm" className="gap-2">
              <Plus size={16} />
              Add Bank Account
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-w-md">
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id.toString()}>
              <div className="flex items-center justify-between w-full min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-muted-foreground shrink-0" />
                    {account.supports_international && (
                      <Globe size={12} className="text-blue-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{account.bank_name}</span>
                      {account.is_primary && (
                        <Badge variant="outline" className="text-xs">Primary</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatAccountNumber(account.account_number)}</span>
                      <span>•</span>
                      <span>{account.currency}</span>
                      <span>•</span>
                      <span className="truncate">{account.country_name}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {getStatusIcon(account)}
                  {getStatusBadge(account)}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Selected Account Details */}
      {value && (
        <div className="mt-3">
          {(() => {
            const selectedAccount = accounts.find(acc => acc.id.toString() === value);
            if (!selectedAccount) return null;

            return (
              <Card className="border-muted">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Building2 size={16} className="text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{selectedAccount.bank_name}</span>
                          {selectedAccount.is_primary && (
                            <Badge variant="outline" className="text-xs">Primary</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {selectedAccount.account_holder_name} • {selectedAccount.country_name}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(selectedAccount)}
                      <div className="text-xs text-muted-foreground mt-1">
                        {selectedAccount.account_type} • {selectedAccount.currency}
                      </div>
                    </div>
                  </div>
                  
                  {!selectedAccount.is_verified && (
                    <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-amber-900">
                            Account Verification Required
                          </p>
                          <p className="text-xs text-amber-700 mt-1">
                            This account needs to be verified before you can receive withdrawals. 
                            Verification typically takes 1-2 business days.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </div>
      )}

      {/* Add Account Button */}
      {showAddButton && onAddAccount && (
        <Button 
          variant="outline" 
          onClick={onAddAccount} 
          className="w-full gap-2 border-dashed"
          size="sm"
        >
          <Plus size={16} />
          Add Another Bank Account
        </Button>
      )}
    </div>
  );
};