/**
 * TransfersPage — Simple bank-style direct transfers
 * Users can transfer money instantly to their bank account
 * No approval needed - works like real bank transfers
 */
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Wallet, Send, CheckCircle2, Download, Share2, Copy,
  ArrowLeft, Building2, User as UserIcon, CreditCard, Globe
} from "lucide-react";

type Step = "amount" | "details" | "review" | "receipt";

type Receipt = {
  reference: string;
  amount: number;
  currency: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  date: string;
  time: string;
  status: string;
};

const TransfersPage = ({ role }: { role: "coach" | "creator" | "therapist" }) => {
  const { user } = useAuth();
  
  const [step, setStep] = useState<Step>("amount");
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState<any>(null);
  
  // Form state
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [country, setCountry] = useState("");
  
  // Receipt state
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setWallet(data));
  }, [user?.id]);

  const available = Number(wallet?.available_balance || wallet?.balance || 0);
  const amountNum = Number(amount || 0);

  const handleAmountNext = () => {
    if (!amountNum || amountNum <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (amountNum > available) {
      toast.error(`Maximum available: ${currency} ${available.toFixed(2)}`);
      return;
    }
    setStep("details");
  };

  const handleDetailsNext = () => {
    if (!accountName.trim()) {
      toast.error("Enter account holder name");
      return;
    }
    if (!accountNumber.trim()) {
      toast.error("Enter account number");
      return;
    }
    if (!bankName.trim()) {
      toast.error("Enter bank name");
      return;
    }
    setStep("review");
  };

  const handleConfirm = async () => {
    setLoading(true);
    
    try {
      // Call backend Paddle payout endpoint
      const BACKEND = import.meta.env.VITE_BACKEND_URL || "https://coursevia-backend.onrender.com";
      
      const response = await fetch(`${BACKEND}/api/paddle/create-payout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user!.id,
          amount: amountNum,
          currency,
          account_name: accountName,
          account_number: accountNumber,
          bank_name: bankName,
          country_code: country || undefined,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Transfer failed");
      }

      // Update local wallet state
      const { data: updatedWallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      
      setWallet(updatedWallet);

      // Generate receipt from response
      const now = new Date();
      setReceipt({
        reference: data.transfer.reference,
        amount: amountNum,
        currency,
        accountName,
        accountNumber,
        bankName,
        date: now.toLocaleDateString("en-US", { 
          year: "numeric", 
          month: "long", 
          day: "numeric" 
        }),
        time: now.toLocaleTimeString("en-US", { 
          hour: "2-digit", 
          minute: "2-digit" 
        }),
        status: "Processing",
      });
      
      setStep("receipt");
      toast.success("Transfer initiated successfully! Processing within 2-7 business days.");
      
    } catch (error: any) {
      console.error("Transfer error:", error);
      toast.error(error?.message || "Transfer failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNewTransfer = () => {
    setStep("amount");
    setAmount("");
    setAccountName("");
    setAccountNumber("");
    setBankName("");
    setCountry("");
    setReceipt(null);
  };

  const copyReference = () => {
    if (receipt) {
      navigator.clipboard.writeText(receipt.reference);
      toast.success("Reference copied!");
    }
  };

  const downloadReceipt = () => {
    toast.info("Receipt download feature coming soon!");
  };

  const shareReceipt = () => {
    if (receipt && navigator.share) {
      navigator.share({
        title: "Transfer Receipt",
        text: `Transfer completed\nReference: ${receipt.reference}\nAmount: ${receipt.currency} ${receipt.amount}`,
      }).catch(() => toast.error("Sharing failed"));
    } else {
      toast.info("Sharing not supported on this device");
    }
  };

  return (
    <DashboardLayout role={role}>
      <div className="max-w-2xl mx-auto py-8 px-4">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Transfer Money</h1>
          <p className="text-muted-foreground mt-2">
            Send money directly to your bank account
          </p>
        </div>

        {/* Wallet Balance */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Wallet className="h-4 w-4" />
            <span>Available Balance</span>
          </div>
          <div className="text-4xl font-bold text-foreground">
            {currency} {available.toFixed(2)}
          </div>
        </div>

        {/* Step 1: Enter Amount */}
        {step === "amount" && (
          <div className="bg-card border border-border rounded-2xl p-8">
            <h2 className="text-xl font-semibold mb-6">How much do you want to transfer?</h2>
            
            <div className="space-y-6">
              <div>
                <Label>Amount</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-muted-foreground">
                    {currency}
                  </span>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-20 text-3xl font-bold h-16"
                    step="0.01"
                    min="0"
                    max={available}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Maximum: {currency} {available.toFixed(2)}
                </p>
              </div>

              <div>
                <Label>Currency</Label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="NGN">NGN - Nigerian Naira</option>
                  <option value="GHS">GHS - Ghanaian Cedi</option>
                  <option value="KES">KES - Kenyan Shilling</option>
                </select>
              </div>

              <Button 
                onClick={handleAmountNext}
                className="w-full h-12 text-base"
                size="lg"
              >
                Continue
                <Send className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Bank Details */}
        {step === "details" && (
          <div className="bg-card border border-border rounded-2xl p-8">
            <Button
              variant="ghost"
              onClick={() => setStep("amount")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <h2 className="text-xl font-semibold mb-6">Where should we send the money?</h2>
            
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  Account Holder Name
                </Label>
                <Input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="John Doe"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Account Number
                </Label>
                <Input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="1234567890"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Bank Name
                </Label>
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Bank of America"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Country (Optional)
                </Label>
                <Input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="United States"
                  className="mt-1"
                />
              </div>

              <Button 
                onClick={handleDetailsNext}
                className="w-full h-12 text-base mt-6"
                size="lg"
              >
                Review Transfer
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === "review" && (
          <div className="bg-card border border-border rounded-2xl p-8">
            <Button
              variant="ghost"
              onClick={() => setStep("details")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <h2 className="text-xl font-semibold mb-6">Review Your Transfer</h2>
            
            <div className="space-y-4 mb-8">
              {/* Amount */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Transfer Amount</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {currency} {amountNum.toFixed(2)}
                </p>
              </div>

              {/* Account Details */}
              <div className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Account Holder</span>
                  <span className="text-sm font-medium">{accountName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Account Number</span>
                  <span className="text-sm font-mono">{accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Bank</span>
                  <span className="text-sm font-medium">{bankName}</span>
                </div>
                {country && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Country</span>
                    <span className="text-sm font-medium">{country}</span>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="border border-border rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Transfer Fee</span>
                  <span className="font-medium">{currency} 0.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Processing Time</span>
                  <span className="font-medium">Instant</span>
                </div>
                <div className="border-t border-border pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-lg">{currency} {amountNum.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleConfirm}
              disabled={loading}
              className="w-full h-12 text-base"
              size="lg"
            >
              {loading ? "Processing..." : "Confirm Transfer"}
              {!loading && <CheckCircle2 className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        )}

        {/* Step 4: Receipt */}
        {step === "receipt" && receipt && (
          <div className="bg-card border border-border rounded-2xl p-8">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-center mb-2">Transfer Successful!</h2>
            <p className="text-center text-muted-foreground mb-8">
              Your money is on the way
            </p>

            {/* Receipt Details */}
            <div className="border border-border rounded-lg p-6 space-y-4 mb-6">
              <div className="text-center pb-4 border-b border-border">
                <p className="text-sm text-muted-foreground mb-1">Amount Transferred</p>
                <p className="text-3xl font-bold text-foreground">
                  {receipt.currency} {receipt.amount.toFixed(2)}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Reference</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-medium">{receipt.reference}</span>
                    <button onClick={copyReference} className="text-primary hover:text-primary/80">
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className="text-sm font-medium text-amber-600">{receipt.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Date</span>
                  <span className="text-sm font-medium">{receipt.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Time</span>
                  <span className="text-sm font-medium">{receipt.time}</span>
                </div>
                <div className="border-t border-border pt-3 mt-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">To</span>
                    <span className="text-sm font-medium text-right max-w-[200px]">{receipt.accountName}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-sm text-muted-foreground">Account</span>
                    <span className="text-sm font-mono">{receipt.accountNumber}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-sm text-muted-foreground">Bank</span>
                    <span className="text-sm font-medium text-right max-w-[200px]">{receipt.bankName}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
              <Button variant="outline" onClick={downloadReceipt} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" onClick={shareReceipt} className="flex-1">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>

            <Button 
              onClick={handleNewTransfer}
              className="w-full h-12 text-base"
              size="lg"
            >
              Make Another Transfer
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export const CoachTransfers = () => <TransfersPage role="coach" />;
export const TherapistTransfers = () => <TransfersPage role="therapist" />;
export const CreatorTransfers = () => <TransfersPage role="creator" />;

export default TransfersPage;
