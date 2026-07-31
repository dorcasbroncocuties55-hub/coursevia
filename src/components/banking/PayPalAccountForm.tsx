import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  CheckCircle2, 
  AlertCircle,
  Mail,
  Globe
} from "lucide-react";

interface PayPalAccountFormProps {
  onAccountAdded?: () => void;
  onCancel?: () => void;
}

export const PayPalAccountForm = ({ onAccountAdded, onCancel }: PayPalAccountFormProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paypalEmail, setPaypalEmail] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("Global");

  const paypalOptions = [
    { value: "Global", label: "PayPal Global", code: "PAYPAL" },
    { value: "United States", label: "PayPal US", code: "PAYPAL_US" },
    { value: "United Kingdom", label: "PayPal UK", code: "PAYPAL_UK" },
    { value: "Canada", label: "PayPal Canada", code: "PAYPAL_CA" },
    { value: "Australia", label: "PayPal Australia", code: "PAYPAL_AU" },
    { value: "Germany", label: "PayPal Germany", code: "PAYPAL_DE" },
    { value: "France", label: "PayPal France", code: "PAYPAL_FR" },
    { value: "Japan", label: "PayPal Japan", code: "PAYPAL_JP" },
    { value: "India", label: "PayPal India", code: "PAYPAL_IN" },
    { value: "Brazil", label: "PayPal Brazil", code: "PAYPAL_BR" },
    { value: "Nigeria", label: "PayPal Nigeria", code: "PAYPAL_NG" },
  ];

  const validateEmail = (email: string) => {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    if (!paypalEmail.trim()) {
      toast.error("Please enter your PayPal email address");
      return false;
    }
    if (!validateEmail(paypalEmail)) {
      toast.error("Please enter a valid email address");
      return false;
    }
    if (!accountHolderName.trim()) {
      toast.error("Please enter the account holder name");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !validateForm()) return;

    try {
      setLoading(true);

      // Try to insert into bank_accounts (primary table) first
      const { error: insertError } = await supabase
        .from("bank_accounts")
        .insert({
          user_id: user.id,
          bank_name: "PayPal",
          bank_code: "PAYPAL",
          account_name: accountHolderName.trim(),
          account_number: paypalEmail.trim(),
          country_code: "US",
          currency: "USD",
          provider: "paypal",
          verification_status: "pending",
          is_default: false,
          metadata: {
            paypal_email: paypalEmail.trim(),
            paypal_region: selectedCountry,
            account_type: "paypal",
          },
        });

      if (insertError) {
        // Fallback: try user_bank_accounts table
        const { error: fallbackError } = await supabase
          .from("user_bank_accounts")
          .insert({
            user_id: user.id,
            bank_id: null,
            account_holder_name: accountHolderName.trim(),
            account_number: paypalEmail.trim(),
            paypal_email: paypalEmail.trim(),
            account_type: "paypal",
            payout_method: "paypal",
            currency: "USD",
            country_name: selectedCountry,
            is_primary: false,
            verification_status: "pending",
          });
        if (fallbackError) throw fallbackError;
      }

      toast.success("PayPal account added successfully!");
      setPaypalEmail("");
      setAccountHolderName("");
      setSelectedCountry("Global");
      onAccountAdded?.();
    } catch (error: any) {
      console.error("Error adding PayPal account:", error);
      toast.error(error.message || "Failed to add PayPal account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-100">
            <CreditCard size={20} className="text-blue-600" />
          </div>
          Add PayPal Account
        </CardTitle>
        <CardDescription>
          Add your PayPal account for fast and secure withdrawals worldwide
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>PayPal Region</Label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
            >
              {paypalOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Select your PayPal region for faster processing
            </p>
          </div>

          <div>
            <Label>PayPal Email Address *</Label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Enter the email address associated with your PayPal account
            </p>
          </div>

          <div>
            <Label>Account Holder Name *</Label>
            <Input
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
              placeholder="Full name as it appears on your PayPal account"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Globe size={16} className="text-blue-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">PayPal Benefits</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Fast withdrawals (1-3 business days)</li>
                  <li>• Global availability in 200+ countries</li>
                  <li>• Automatic currency conversion</li>
                  <li>• Lower fees than traditional bank transfers</li>
                  <li>• Secure and trusted payment platform</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium text-amber-900 mb-1">Verification Required</h4>
                <p className="text-sm text-amber-800">
                  PayPal accounts require verification before you can receive withdrawals. 
                  You'll receive an email with verification instructions after adding your account.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Adding PayPal Account..." : "Add PayPal Account"}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};