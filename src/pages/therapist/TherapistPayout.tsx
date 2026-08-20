import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  CalendarDays, 
  Wallet, 
  Users, 
  MessageSquare, 
  HeartHandshake, 
  Settings, 
  User, 
  Shield, 
  Video,
  Home,
  BookOpen,
  FileText,
  CreditCard,
  Bell,
  Search,
  LogOut,
  Plus,
  Download,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Calendar,
  ArrowRight
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface PayoutRequest {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requested_at: string;
  processed_at?: string;
  stripe_transfer_id?: string;
  stripe_payout_id?: string;
  estimated_arrival?: string;
  rejection_reason?: string;
}

interface StripeConnectStatus {
  connected: boolean;
  verified: boolean;
  payouts_enabled: boolean;
  charges_enabled: boolean;
  requirements: string[];
  onboarding_url?: string;
}

const TherapistPayout = () => {
  const { user, profile } = useAuth();
  const [walletBalance, setWalletBalance] = useState(0);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);

  useEffect(() => {
    if (user) {
      loadPayoutData();
      checkStripeConnectStatus();
    }
  }, [user]);

  const loadPayoutData = async () => {
    try {
      // Get wallet balance
      const { data: walletData } = await supabase
        .from('wallets')
        .select('available_balance')
        .eq('user_id', user?.id)
        .single();

      if (walletData) {
        setWalletBalance(walletData.available_balance || 0);
      }

      // Get payout requests
      const { data: payoutData } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('user_id', user?.id)
        .order('requested_at', { ascending: false })
        .limit(10);

      if (payoutData) {
        setPayoutRequests(payoutData);
      }
    } catch (error) {
      console.error('Error loading payout data:', error);
      toast.error('Failed to load payout data');
    } finally {
      setIsLoading(false);
    }
  };

  const checkStripeConnectStatus = async () => {
    try {
      const response = await fetch(`/api/connect/status?user_id=${user?.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const status = await response.json();
        setStripeStatus(status);
      }
    } catch (error) {
      console.error('Error checking Stripe status:', error);
    }
  };

  const handleStripeOnboarding = async () => {
    try {
      const response = await fetch('/api/connect/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user?.email,
          userId: user?.id,
          role: 'therapist',
          country: 'US', // You can make this dynamic based on profile
        }),
      });

      const result = await response.json();

      if (result.onboardingUrl) {
        window.location.href = result.onboardingUrl;
      } else if (result.needsOnboarding === false) {
        toast.success('Stripe account already set up!');
        checkStripeConnectStatus();
      }
    } catch (error) {
      console.error('Error setting up Stripe:', error);
      toast.error('Failed to set up payout account');
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > walletBalance) {
      toast.error('Insufficient balance');
      return;
    }

    if (!stripeStatus?.payouts_enabled) {
      toast.error('Please complete your Stripe account setup first');
      return;
    }

    setIsWithdrawing(true);
    try {
      const response = await fetch('/api/stripe-connect/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          amount: amount,
          role: 'therapist'
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Withdrawal request submitted successfully!');
        setShowWithdrawDialog(false);
        setWithdrawAmount("");
        loadPayoutData();
        checkStripeConnectStatus();
      } else {
        toast.error(result.message || 'Withdrawal failed');
      }
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      toast.error('Failed to process withdrawal');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Signed out successfully');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - 260px on desktop, hidden on mobile */}
      <div className="hidden lg:flex w-[260px] bg-white shadow-lg flex-shrink-0">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <HeartHandshake className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">mindwell</h1>
              <p className="text-xs text-gray-500">portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-4">
          <div className="space-y-1">
            <Link to="/therapist/dashboard" className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
              <Home className="h-5 w-5 mr-3" />
              Dashboard
            </Link>
            <Link to="/therapist/clients" className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
              <Users className="h-5 w-5 mr-3" />
              Patients
            </Link>
            <Link to="/therapist/bookings" className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
              <BookOpen className="h-5 w-5 mr-3" />
              Books
            </Link>
            <Link to="/therapist/sessions" className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
              <FileText className="h-5 w-5 mr-3" />
              Session Notes
            </Link>
            <Link to="/therapist/messages" className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
              <MessageSquare className="h-5 w-5 mr-3" />
              Messages
            </Link>
            <Link to="/therapist/wallet" className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
              <Wallet className="h-5 w-5 mr-3" />
              Wallet
            </Link>
            <Link to="/therapist/payout" className="flex items-center px-4 py-3 text-sm font-medium text-primary bg-primary/10 rounded-lg">
              <CreditCard className="h-5 w-5 mr-3" />
              Payout
            </Link>
            <Link to="/therapist/settings" className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
              <Settings className="h-5 w-5 mr-3" />
              Settings
            </Link>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Page Title */}
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Payout</h1>
              <p className="text-sm lg:text-base text-gray-600">Manage your earnings and bank transfers</p>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              
              {/* User Profile */}
              <div className="flex items-center space-x-2 lg:space-x-3">
                <Avatar className="h-8 w-8 lg:h-10 lg:w-10">
                  <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'T'}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" onClick={handleSignOut} className="hidden sm:flex">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
                <Button variant="outline" onClick={handleSignOut} size="sm" className="sm:hidden">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading payout information...</p>
            </div>
          ) : (
            <div className="max-w-6xl space-y-6">
              {/* Balance & Stripe Status */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Available Balance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <span>Available Balance</span>
                    </CardTitle>
                    <CardDescription>
                      Your current earnings available for withdrawal
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary mb-4">
                      ${walletBalance.toFixed(2)}
                    </div>
                    {stripeStatus?.payouts_enabled ? (
                      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
                        <DialogTrigger asChild>
                          <Button 
                            className="w-full bg-primary hover:bg-primary/90"
                            disabled={walletBalance <= 0}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Withdraw Funds
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Withdraw Funds</DialogTitle>
                            <DialogDescription>
                              Enter the amount you'd like to withdraw to your bank account
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="amount">Amount (USD)</Label>
                              <Input
                                id="amount"
                                type="number"
                                placeholder="0.00"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                max={walletBalance}
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Available: ${walletBalance.toFixed(2)}
                              </p>
                            </div>
                            <Button
                              onClick={handleWithdraw}
                              disabled={isWithdrawing}
                              className="w-full bg-primary hover:bg-primary/90"
                            >
                              {isWithdrawing ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                              ) : (
                                <Download className="h-4 w-4 mr-2" />
                              )}
                              {isWithdrawing ? 'Processing...' : 'Withdraw'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <Button 
                        onClick={handleStripeOnboarding}
                        className="w-full bg-primary hover:bg-primary/90"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Set Up Bank Account
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Stripe Connect Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <span>Payout Account Status</span>
                    </CardTitle>
                    <CardDescription>
                      Secure bank account verification via Stripe
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Account Connected</span>
                      {stripeStatus?.connected ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Account Verified</span>
                      {stripeStatus?.verified ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Payouts Enabled</span>
                      {stripeStatus?.payouts_enabled ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>

                    {stripeStatus && !stripeStatus.payouts_enabled && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Complete your account setup to enable withdrawals
                        </AlertDescription>
                      </Alert>
                    )}

                    {stripeStatus?.requirements && stripeStatus.requirements.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-red-600">Required Information:</p>
                        <ul className="text-xs text-red-600 space-y-1">
                          {stripeStatus.requirements.map((req, index) => (
                            <li key={index}>• {req.replace('_', ' ')}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Recent Payout Requests */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <span>Recent Withdrawals</span>
                  </CardTitle>
                  <CardDescription>
                    Your withdrawal history and status updates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {payoutRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No withdrawal requests yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {payoutRequests.map((request) => (
                        <div key={request.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-gray-200 rounded-lg space-y-3 sm:space-y-0">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <DollarSign className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-semibold">${request.amount.toFixed(2)}</div>
                              <div className="text-sm text-gray-500">
                                {formatDate(request.requested_at)}
                              </div>
                              {request.estimated_arrival && (
                                <div className="text-xs text-gray-400">
                                  Est. arrival: {formatDate(request.estimated_arrival)}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge className={getStatusColor(request.status)}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </Badge>
                            {request.stripe_payout_id && (
                              <span className="text-xs text-gray-400 font-mono">
                                {request.stripe_payout_id}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-around">
          <Link to="/therapist/dashboard" className="flex flex-col items-center py-1 px-2 text-gray-500">
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Dashboard</span>
          </Link>
          <Link to="/therapist/clients" className="flex flex-col items-center py-1 px-2 text-gray-500">
            <Users className="h-5 w-5" />
            <span className="text-xs mt-1">Patients</span>
          </Link>
          <Link to="/therapist/bookings" className="flex flex-col items-center py-1 px-2 text-gray-500">
            <BookOpen className="h-5 w-5" />
            <span className="text-xs mt-1">Books</span>
          </Link>
          <Link to="/therapist/messages" className="flex flex-col items-center py-1 px-2 text-gray-500">
            <MessageSquare className="h-5 w-5" />
            <span className="text-xs mt-1">Messages</span>
          </Link>
          <Link to="/therapist/payout" className="flex flex-col items-center py-1 px-2 text-primary">
            <CreditCard className="h-5 w-5" />
            <span className="text-xs mt-1">Payout</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TherapistPayout;