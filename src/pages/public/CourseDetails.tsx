import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useParams, Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, ChevronDown, ChevronRight, Lock, Star, Users, Globe, CheckCircle2, Play, Award, ShieldCheck } from "lucide-react";
import PaymentModal from "@/components/PaymentModal";

const CourseDetails = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [creator, setCreator] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [openCurriculum, setOpenCurriculum] = useState(true);

  useEffect(() => {
    const fetchUnified = async () => {
      if (!slug) return false;
      const { data: contentItem } = await supabase.from("content_items" as any).select("*").eq("slug", slug).eq("content_type", "course").maybeSingle();
      if (!contentItem) return false;
      setCourse(contentItem);
      const [episodesRes, creatorRes] = await Promise.all([
        supabase.from("content_episodes" as any).select("*").eq("content_id", contentItem.id).order("episode_number", { ascending: true }),
        supabase.from("profiles").select("full_name, avatar_url, profile_slug, profession, bio").eq("user_id", contentItem.owner_id).maybeSingle(),
      ]);
      setEpisodes((episodesRes.data as any[]) || []);
      setCreator(creatorRes.data);
      if (user) {
        const { data: purchase } = await supabase.from("content_purchases" as any).select("id").eq("user_id", user.id).eq("content_id", contentItem.id).maybeSingle();
        setHasAccess(!!purchase);
      }
      return true;
    };

    const fetchFallback = async () => {
      if (!slug) return;
      const { data: courseData } = await supabase.from("courses").select("*").eq("slug", slug).maybeSingle();
      if (!courseData) return;
      setCourse(courseData);
      const [creatorRes, sectionsRes] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url, profile_slug, profession, bio").eq("user_id", courseData.creator_id).maybeSingle(),
        supabase.from("course_sections").select("*, course_lessons(*)").eq("course_id", courseData.id).order("sort_order"),
      ]);
      setCreator(creatorRes.data);
      const flat = (sectionsRes.data || []).flatMap((s: any, i: number) =>
        (s.course_lessons || []).map((l: any, j: number) => ({ id: l.id, title: l.title, description: l.description, video_url: l.video_url, episode_number: i * 100 + j + 1, duration_seconds: l.duration_seconds || 0 }))
      );
      setEpisodes(flat);
      if (user) {
        const { data: access } = await supabase.from("content_access").select("id").eq("user_id", user.id).eq("content_id", courseData.id).eq("content_type", "course").maybeSingle();
        setHasAccess(!!access);
      }
    };

    (async () => { const ok = await fetchUnified(); if (!ok) await fetchFallback(); })();
  }, [slug, user]);

  const totalDuration = useMemo(() => episodes.reduce((a, e) => a + Number(e.duration_seconds || 0), 0), [episodes]);
  const hours = Math.floor(totalDuration / 3600);
  const mins = Math.floor((totalDuration % 3600) / 60);

  if (!course) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  const price = Number(course.price || 0);
  const rating = Number(course.rating || 4.5).toFixed(1);

  return (
    <div className="min-h-screen bg-[#f7f9fa]">
      <Navbar />

      {/* Hero - dark Udemy-style */}
      <div className="bg-[#1c1d1f] text-white">
        <div className="container-wide py-10">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-3">
              {course.category && (
                <span className="text-xs font-medium text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full">{course.category}</span>
              )}
              <span className="text-xs text-gray-400">Course</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-3 leading-tight">{course.title}</h1>
            <p className="text-gray-300 text-base mb-4 leading-relaxed">{course.short_description || course.description}</p>

            <div className="flex flex-wrap items-center gap-4 text-sm mb-4">
              <div className="flex items-center gap-1">
                <span className="font-bold text-amber-400">{rating}</span>
                <div className="flex">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={13} className={i <= Math.round(Number(rating)) ? "fill-amber-400 text-amber-400" : "text-gray-600"} />
                  ))}
                </div>
                <span className="text-gray-400">({course.total_students || 0} students)</span>
              </div>
              <span className="flex items-center gap-1 text-gray-400"><Users size={13} /> {course.total_students || 0} enrolled</span>
              <span className="flex items-center gap-1 text-gray-400"><Globe size={13} /> English</span>
            </div>

            {creator && (
              <p className="text-sm text-gray-400">
                Created by{" "}
                {creator.profile_slug
                  ? <Link to={`/profile/${creator.profile_slug}`} className="text-purple-400 hover:underline">{creator.full_name}</Link>
                  : <span className="text-gray-300">{creator.full_name}</span>
                }
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="container-wide py-8">
        <div className="grid lg:grid-cols-[1fr_380px] gap-8">

          {/* Left */}
          <div className="space-y-6">

            {/* What you'll learn */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">What you'll learn</h2>
              <div className="grid sm:grid-cols-2 gap-2">
                {(course.learning_outcomes || ["Practical skills you can apply immediately", "Expert-led instruction", "Lifetime access to content", "Certificate of completion"]).slice(0, 8).map((item: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 size={15} className="text-gray-900 shrink-0 mt-0.5" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Course content */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button onClick={() => setOpenCurriculum(v => !v)}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 text-left">Course content</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{episodes.length} lessons · {hours > 0 ? `${hours}h ` : ""}{mins}m total</p>
                </div>
                {openCurriculum ? <ChevronDown size={18} className="text-gray-500" /> : <ChevronRight size={18} className="text-gray-500" />}
              </button>

              {openCurriculum && (
                <div className="border-t border-gray-200 divide-y divide-gray-100">
                  {episodes.map((lesson: any) => (
                    <div key={lesson.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        {hasAccess
                          ? <Play size={14} className="text-purple-600 shrink-0" />
                          : <Lock size={14} className="text-gray-400 shrink-0" />
                        }
                        <span className="text-sm text-gray-800">
                          {lesson.episode_number}. {lesson.title}
                        </span>
                      </div>
                      {lesson.duration_seconds > 0 && (
                        <span className="text-xs text-gray-400 shrink-0 ml-4">
                          {Math.floor(lesson.duration_seconds / 60)}:{String(lesson.duration_seconds % 60).padStart(2, "0")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Instructor */}
            {creator && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Instructor</h2>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 shrink-0">
                    {creator.avatar_url
                      ? <img src={creator.avatar_url} alt={creator.full_name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xl font-bold text-gray-400">{creator.full_name?.[0]}</div>
                    }
                  </div>
                  <div>
                    {creator.profile_slug
                      ? <Link to={`/profile/${creator.profile_slug}`} className="font-bold text-purple-700 hover:underline text-lg">{creator.full_name}</Link>
                      : <p className="font-bold text-gray-900 text-lg">{creator.full_name}</p>
                    }
                    <p className="text-sm text-gray-500">{creator.profession || "Instructor"}</p>
                    {creator.bio && <p className="text-sm text-gray-600 mt-2 leading-relaxed">{creator.bio}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right - sticky card */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
              {course.thumbnail_url && (
                <div className="relative aspect-video overflow-hidden">
                  <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="bg-white rounded-full p-3 shadow-lg">
                      <Play size={24} className="text-gray-900 ml-0.5" />
                    </div>
                  </div>
                </div>
              )}
              <div className="p-6 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-gray-900">
                    {price === 0 ? <span className="text-emerald-600">Free</span> : `$${price.toFixed(2)}`}
                  </span>
                  {course.original_price > price && (
                    <span className="text-lg text-gray-400 line-through">${Number(course.original_price).toFixed(2)}</span>
                  )}
                </div>

                {!hasAccess ? (
                  <Button className="w-full h-12 text-base font-semibold bg-purple-700 hover:bg-purple-800 text-white" onClick={() => setShowPayment(true)}>
                    {price === 0 ? "Enroll for Free" : "Buy Now"}
                  </Button>
                ) : (
                  <Button className="w-full h-12 text-base font-semibold" variant="outline">
                    <CheckCircle2 size={16} className="mr-2 text-emerald-500" /> Enrolled
                  </Button>
                )}

                <p className="text-xs text-center text-gray-400">30-Day Money-Back Guarantee</p>

                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <p className="text-sm font-semibold text-gray-900">This course includes:</p>
                  {[
                    { icon: BookOpen, text: `${episodes.length} lessons` },
                    { icon: Clock, text: `${hours > 0 ? `${hours}h ` : ""}${mins}m of content` },
                    { icon: Globe, text: "Full lifetime access" },
                    { icon: Award, text: "Certificate of completion" },
                    { icon: ShieldCheck, text: "Secure payment" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-2 text-sm text-gray-600">
                      <Icon size={14} className="text-gray-400 shrink-0" />
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPayment && (
        <PaymentModal contentType="course" contentId={course.id} contentTitle={course.title}
          amount={price} onClose={() => setShowPayment(false)} onSuccess={() => setShowPayment(false)} />
      )}

      <Footer />
    </div>
  );
};

export default CourseDetails;
