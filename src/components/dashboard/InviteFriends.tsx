import { useState } from "react";
import { Copy, Check, Mail, Share2, Gift, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface InviteFriendsProps {
  className?: string;
}

export const InviteFriends = ({ className = "" }: InviteFriendsProps) => {
  const { user, profile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  // Generate referral link (you can customize this based on your referral system)
  const referralCode = user?.id?.slice(0, 8).toUpperCase() || "COURSEVIA";
  const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Referral link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSending(true);
    try {
      // TODO: Call your backend API to send invitation email
      // For now, we'll simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`Invitation sent to ${email}!`);
      setEmail("");
    } catch (err) {
      toast.error("Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: "Join me on Coursevia!",
      text: `I'm using Coursevia for learning and professional growth. Join me using my referral link and get started!`,
      url: referralLink,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success("Shared successfully!");
      } catch (err) {
        // User cancelled share or error occurred
        if ((err as Error).name !== "AbortError") {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Gift className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">Invite Friends & Get Rewards</CardTitle>
              <CardDescription className="mt-1">
                Share Coursevia with friends and earn rewards when they sign up!
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-background p-4 border">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-xs text-muted-foreground">Friends Invited</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-background p-4 border">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                  <Sparkles className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">$0</p>
                  <p className="text-xs text-muted-foreground">Rewards Earned</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-background p-4 border">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                  <Gift className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">$10</p>
                  <p className="text-xs text-muted-foreground">Per Referral</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral Link Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Referral Link</CardTitle>
          <CardDescription>
            Share this link with friends to invite them to Coursevia
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={referralLink}
                readOnly
                className="pr-10 font-mono text-sm"
              />
            </div>
            <Button onClick={handleCopyLink} variant="outline" className="shrink-0">
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
            <Button onClick={handleShare} className="shrink-0">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>

          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Your referral code:</strong>{" "}
              <span className="font-mono text-foreground">{referralCode}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Send Email Invitation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Send Email Invitation</CardTitle>
          <CardDescription>
            Invite friends directly via email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendInvite} className="flex gap-2">
            <Input
              type="email"
              placeholder="friend@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={sending}>
              <Mail className="mr-2 h-4 w-4" />
              {sending ? "Sending..." : "Send Invite"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                1
              </div>
              <div>
                <h4 className="font-medium">Share Your Link</h4>
                <p className="text-sm text-muted-foreground">
                  Send your unique referral link to friends via email, social media, or messaging apps.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                2
              </div>
              <div>
                <h4 className="font-medium">Friend Signs Up</h4>
                <p className="text-sm text-muted-foreground">
                  Your friend creates an account using your referral link and completes onboarding.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                3
              </div>
              <div>
                <h4 className="font-medium">Earn Rewards</h4>
                <p className="text-sm text-muted-foreground">
                  You both receive $10 in credits when they make their first purchase! Credits are automatically added to your wallet.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Terms */}
      <div className="rounded-lg bg-muted/30 p-4">
        <p className="text-xs text-muted-foreground">
          <strong>Terms & Conditions:</strong> Rewards are credited after your referred friend completes their first purchase of $25 or more. 
          Credits can be used towards any purchase on Coursevia. Referral program terms subject to change. 
          See our{" "}
          <a href="/terms" className="text-primary hover:underline">
            Terms of Service
          </a>{" "}
          for full details.
        </p>
      </div>
    </div>
  );
};
