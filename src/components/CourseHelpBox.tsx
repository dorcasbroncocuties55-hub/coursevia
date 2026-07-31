import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function CourseHelpBox({
  contentId,
  ownerId,
}: {
  contentId: string;
  ownerId: string;
}) {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const submitHelp = async () => {
    if (!user) {
      toast.error("Please sign in to ask for help.");
      return;
    }
    if (!message.trim()) {
      toast.error("Please describe the help you need.");
      return;
    }

    try {
      setSending(true);
      const { error } = await supabase.from("content_feedback_requests" as any).insert({
        content_id: contentId,
        learner_id: user.id,
        owner_id: ownerId,
        subject: subject.trim() || null,
        message: message.trim(),
        status: "open",
      } as any);

      if (error) throw error;

      toast.success("Your help request has been sent.");
      setSubject("");
      setMessage("");
    } catch (error: any) {
      toast.error(error?.message || "Failed to send request.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border p-5 space-y-4 bg-card">
      <div>
        <h3 className="text-xl font-bold text-foreground">Need help with this course?</h3>
        <p className="text-sm text-muted-foreground">
          If you have bought this course and need guidance, ask the instructor here.
        </p>
      </div>

      <Input
        placeholder="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />
      <Textarea
        placeholder="Tell the instructor what you need help with"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
      />
      <Button onClick={submitHelp} disabled={sending}>
        {sending ? "Sending..." : "Send Request"}
      </Button>
    </div>
  );
}
