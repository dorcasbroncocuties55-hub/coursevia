import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import {
  Mail, Clock, Briefcase, HelpCircle, CheckCircle2,
  Loader2, Paperclip, X, ShieldCheck, Zap, Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SUPPORT_EMAIL = "support@coursevia.com";

const subjectOptions = [
  { value: "Support",          label: "Support" },
  { value: "Billing",          label: "Billing" },
  { value: "Technical Issue",  label: "Technical Issue" },
  { value: "Partnership",      label: "Partnership" },
  { value: "Other",            label: "Other" },
];

const infoCards = [
  {
    icon: HelpCircle,
    title: "Customer Support",
    desc: "Need help with your account, purchases, or technical issues?",
    detail: "support@coursevia.com",
    sub: "Response within 24 hours",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Briefcase,
    title: "Business Inquiries",
    desc: "For partnerships, collaborations, or business opportunities:",
    detail: "business@coursevia.com",
    sub: null,
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Mail,
    title: "General Inquiries",
    desc: "For anything else related to Coursevia:",
    detail: "hello@coursevia.com",
    sub: null,
    color: "bg-violet-50 text-violet-600",
  },
  {
    icon: Clock,
    title: "Support Hours",
    desc: "Our team is available:",
    detail: "Monday – Friday",
    sub: "9:00 AM – 6:00 PM (UTC)",
    color: "bg-amber-50 text-amber-600",
  },
];

const trustPoints = [
  { icon: Zap,        text: "Fast response — within 24 hours" },
  { icon: Users,      text: "Real human support, not bots" },
  { icon: ShieldCheck, text: "Professional, secure communication" },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.4, delay },
});

const Contact = () => {
  const { user, profile } = useAuth();

  const [fullName,    setFullName]    = useState("");
  const [email,       setEmail]       = useState("");
  const [subject,     setSubject]     = useState("");
  const [message,     setMessage]     = useState("");
  const [attachment,  setAttachment]  = useState<File | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [sent,        setSent]        = useState(false);

  // Auto-fill for logged-in users
  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
    if (user?.email)        setEmail(user.email);
  }, [user, profile]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB");
      return;
    }
    setAttachment(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim())  { toast.error("Please enter your name");    return; }
    if (!email.trim())     { toast.error("Please enter your email");   return; }
    if (!subject)          { toast.error("Please choose a subject");   return; }
    if (!message.trim())   { toast.error("Please enter your message"); return; }

    setLoading(true);

    try {
      // 1. Save to support_conversations so agents can see it in the dashboard
      const { data: conv, error: convError } = await supabase
        .from("support_conversations" as any)
        .insert({
          user_id: user?.id || null,
          user_name: fullName.trim(),
          user_email: email.trim(),
          status: "open",
          priority: "normal",
          subject: `[${subject}] ${fullName.trim()}`,
          department: subject.toLowerCase().replace(/\s+/g, "_"),
          tags: [subject.toLowerCase()],
        })
        .select("id")
        .single();

      if (convError) throw convError;

      // 2. Save the message
      if (conv?.id) {
        await supabase.from("support_messages" as any).insert({
          conversation_id: conv.id,
          sender_name: fullName.trim(),
          role: "user",
          text: `From: ${email.trim()}\nSubject: ${subject}\n\n${message.trim()}`,
          read: false,
        });
      }

      // 3. Also try sending via backend email notification (non-blocking)
      try {
        await fetch(`${import.meta.env.VITE_BACKEND_URL || "https://coursevia-backend.onrender.com"}/api/notifications/contact`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fullName.trim(),
            email: email.trim(),
            subject,
            message: message.trim(),
          }),
        });
      } catch { /* email is optional — don't block */ }

      setSent(true);
      setMessage("");
      setSubject("");
      setAttachment(null);
      toast.success("Message sent! We'll get back to you within 24 hours.");
    } catch (err: any) {
      console.error("Contact form error:", err);
      // Fallback: even if Supabase fails, show success and log it
      toast.error("Failed to send message. Please email us directly at " + SUPPORT_EMAIL);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/5 via-background to-background border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <motion.div {...fadeUp()}>
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-5">
              Contact Us
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-3">
              We're here to help — quickly and professionally
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Have a question, need support, or want to work with us? Reach out and our team will respond as soon as possible.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Two-column body */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-14">
        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-10">

          {/* LEFT — info cards */}
          <div className="space-y-4">
            {infoCards.map(({ icon: Icon, title, desc, detail, sub, color }, i) => (
              <motion.div key={title} {...fadeUp(i * 0.08)}
                className="flex gap-4 p-5 rounded-2xl border border-border bg-white dark:bg-card shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
              >
                <div className={`shrink-0 h-10 w-10 flex items-center justify-center rounded-xl ${color}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm mb-0.5">{title}</p>
                  <p className="text-xs text-muted-foreground mb-1">{desc}</p>
                  <p className="text-sm font-medium text-foreground">{detail}</p>
                  {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
                </div>
              </motion.div>
            ))}

            {/* Trust block */}
            <motion.div {...fadeUp(0.35)}
              className="p-5 rounded-2xl border border-border bg-primary/5"
            >
              <p className="font-semibold text-foreground text-sm mb-3">We're Here for You</p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                At Coursevia, we prioritize fast, clear, and helpful communication. Whether you're a learner or a creator, our support team is ready to assist you every step of the way.
              </p>
              <ul className="space-y-2">
                {trustPoints.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-2 text-xs text-foreground">
                    <Icon size={13} className="text-primary shrink-0" />
                    {text}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* RIGHT — contact form */}
          <motion.div {...fadeUp(0.1)}
            className="rounded-2xl border border-border bg-white dark:bg-card shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-7"
          >
            {sent ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 size={32} className="text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Message Sent!</h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  Your message has been sent. We'll get back to you within 24 hours.
                </p>
                <Button variant="outline" size="sm" onClick={() => setSent(false)} className="mt-2">
                  Send another message
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-foreground mb-1">Send Us a Message</h2>
                <p className="text-sm text-muted-foreground mb-6">Fill in the form and we'll get back to you shortly.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="Your full name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Subject</Label>
                    <Select value={subject} onValueChange={setSubject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjectOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Describe your issue or question in detail..."
                      rows={5}
                      className="resize-none"
                      required
                    />
                  </div>

                  {/* File attachment */}
                  <div>
                    <Label>Attach File <span className="text-muted-foreground font-normal">(optional — screenshots, errors)</span></Label>
                    {attachment ? (
                      <div className="mt-1.5 flex items-center gap-2 p-3 rounded-xl border border-border bg-muted/40 text-sm">
                        <Paperclip size={14} className="text-primary shrink-0" />
                        <span className="flex-1 truncate text-foreground">{attachment.name}</span>
                        <button type="button" onClick={() => setAttachment(null)} className="text-muted-foreground hover:text-destructive">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="mt-1.5 flex items-center gap-2 p-3 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition text-sm text-muted-foreground">
                        <Paperclip size={14} />
                        <span>Click to attach a file (max 5MB)</span>
                        <input type="file" className="hidden" accept="image/*,.pdf,.txt" onChange={handleFile} />
                      </label>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin" /> Sending...
                      </span>
                    ) : "Send Message"}
                  </Button>
                </form>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <motion.div {...fadeUp()}>
            <h2 className="text-3xl font-bold mb-3">Need Immediate Help?</h2>
            <p className="text-primary-foreground/80 mb-8 max-w-md mx-auto">
              You can also access support directly from your dashboard for faster assistance.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" asChild className="rounded-full px-8 bg-white text-primary hover:bg-white/90">
                <Link to="/dashboard">Open Support Dashboard</Link>
              </Button>
              <Button size="lg" asChild className="rounded-full px-8 border-white/30 text-white hover:bg-white/10 bg-transparent border">
                <Link to="/help">Explore Help Center</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;
