import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, Shield, Clock, Globe, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { initializeCheckout, verifyCheckout } from "@/lib/paymentGateway";
import { openSecureCheckoutWindow } from "@/lib/checkoutWindow";

const CoachDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [coach, setCoach] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [bookingService, setBookingService] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from("coach_profiles").select("*").eq("id", id).single().then(async ({ data }) => {
      if (data) {
        const { data: profile } = await supabase.from("profiles").select("full_name, avatar_url, bio").eq("user_id", data.user_id).single();
        setCoach({ ...data, profile });
      }
    });
    supabase.from("coach_services").select("*").eq("coach_id", id).eq("is_active", true).then(({ data }) => setServices(data || []));
    supabase.from("reviews").select("*, profiles:reviewer_id(full_name)").eq("reviewable_id", id).eq("reviewable_type", "coach").order("created_at", { ascending: false }).limit(10)
      .then(({ data }) => setReviews(data || []));
  }, [id]);

  const handleBooking = async () => {
    if (!user || !bookingService || !bookingDate) {
      toast.error("Please select a date and time");
      return;
    }
    setBookingLoading(true);
    try {
      const { data: booking, error } = await supabase.from("bookings").insert({
        coach_id: bookingService.coach_id,
        learner_id: user.id,
        service_id: bookingService.id,
        scheduled_at: new Date(bookingDate).toISOString(),
        duration_minutes: bookingService.duration_minutes,
        notes: bookingNotes,
        status: "pending",
        meeting_url: `https://meet.jit.si/coursevia-${crypto.randomUUID()}`,
      }).select().single();
      if (error) throw error;

      if (Number(bookingService.price) > 0) {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser?.email) {
          throw new Error("A valid learner email is required before starting payment.");
        }

        const checkout = await initializeCheckout({
          email: authUser.email,
          user_id: user.id,
          type: "booking",
          amount: Number(bookingService.price),
          content_id: booking.id,
          content_title: `Coaching: ${bookingService.title}`,
        });

        const opened = openSecureCheckoutWindow({
          url: checkout.authorization_url || checkout.redirect_url || "",
          reference: checkout.reference,
          onOpened: () => toast.success("Booking created. Secure payment window opened."),
          onBlocked: () => {
            toast.error("Popup was blocked. Opening secure checkout in this tab instead.");
            window.location.assign(checkout.authorization_url || checkout.redirect_url || "");
          },
          onComplete: async () => {
            const result = await verifyCheckout(checkout.reference);
            toast.success(result.message || "Booking payment verified successfully.");
            window.location.assign(result.redirectTo || "/dashboard/bookings");
          },
        });

        if (!opened) return;
        return;
      }

      toast.success("Booking created! Awaiting confirmation.");
      setBookingService(null);
      setBookingDate("");
      setBookingNotes("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBookingLoading(false);
    }
  };

  if (!coach) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container-wide section-spacing">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Coach Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                {coach.profile?.full_name?.[0]?.toUpperCase() || "C"}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{coach.profile?.full_name}</h1>
                <p className="text-muted-foreground">{coach.headline || "Coach"}</p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1">
                    <Star size={14} className="text-accent fill-accent" />
                    <span className="text-sm font-medium">{Number(coach.rating || 0).toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">({coach.total_reviews || 0} reviews)</span>
                  </div>
                  {coach.is_verified && (
                    <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      <Shield size={12} /> Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            {coach.profile?.bio && (
              <p className="text-muted-foreground leading-relaxed mb-6">{coach.profile.bio}</p>
            )}

            {/* Skills & Languages */}
            <div className="flex flex-wrap gap-4 mb-8">
              {coach.skills?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {coach.skills.map((s: string) => (
                      <span key={s} className="text-xs bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {coach.languages?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Languages</p>
                  <div className="flex items-center gap-1.5">
                    <Globe size={14} className="text-muted-foreground" />
                    <span className="text-sm text-foreground">{coach.languages.join(", ")}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Services */}
            <h2 className="text-xl font-bold text-foreground mb-4">Services & Packages</h2>
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground">No services listed yet.</p>
            ) : (
              <div className="space-y-3 mb-8">
                {services.map(s => (
                  <div key={s.id} className="bg-card border border-border rounded-lg p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-foreground">{s.title}</p>
                        {s.description && <p className="text-sm text-muted-foreground mt-1">{s.description}</p>}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock size={12} /> {s.duration_minutes} min
                          </span>
                          <span className="text-sm font-mono font-bold text-foreground">${Number(s.price).toFixed(2)}</span>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => {
                        if (!user) { toast.info("Please sign in to book"); return; }
                        setBookingService(s);
                      }}>
                        Book Now
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reviews */}
            <h2 className="text-xl font-bold text-foreground mb-4">Reviews</h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            ) : (
              <div className="space-y-3">
                {reviews.map(r => (
                  <div key={r.id} className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {[1,2,3,4,5].map(star => (
                          <Star key={star} size={14} className={star <= r.rating ? "text-accent fill-accent" : "text-muted-foreground"} />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{(r as any).profiles?.full_name || "Anonymous"}</span>
                    </div>
                    {r.comment && <p className="text-sm text-foreground">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <div className="bg-card border border-border rounded-xl p-6 sticky top-24">
              <p className="text-sm text-muted-foreground">Starting at</p>
              <span className="text-3xl font-bold text-foreground font-mono block mb-1">
                ${Number(coach.hourly_rate || 0).toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground">per hour</span>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Students</span>
                  <span className="text-foreground font-medium">{coach.total_students}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reviews</span>
                  <span className="text-foreground font-medium">{coach.total_reviews}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {bookingService && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Book: {bookingService.title}</h2>
            <div className="space-y-4">
              <div>
                <Label>Select Date & Time</Label>
                <Input type="datetime-local" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} min={new Date().toISOString().slice(0, 16)} />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Textarea value={bookingNotes} onChange={(e) => setBookingNotes(e.target.value)} placeholder="What would you like to discuss?" rows={3} />
              </div>
              <div className="bg-secondary/50 rounded-lg p-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span>{bookingService.duration_minutes} min</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-mono font-bold">${Number(bookingService.price).toFixed(2)}</span></div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleBooking} disabled={bookingLoading}>
                  {bookingLoading ? "Booking..." : "Confirm Booking"}
                </Button>
                <Button variant="outline" onClick={() => setBookingService(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default CoachDetails;
