import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { StripeProvider } from "@/contexts/StripeContext";
import { isJudgePortalDomain, getJudgePortalRedirect } from "@/utils/subdomainRouter";

import ProtectedRoute from "@/components/ProtectedRoute";
import AuthDecisionGuard from "./components/AuthDecisionGuard";
import WelcomeBanner from "@/components/WelcomeBanner";

// Public pages
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
import AuthCallback from "@/pages/AuthCallback";
const VerifyEmail = lazy(() => import("@/pages/VerifyEmail"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const WelcomePage = lazy(() => import("@/components/WelcomePage"));
const About = lazy(() => import("./pages/public/About"));
const Therapists = lazy(() => import("./pages/public/Therapists"));
const Courses = lazy(() => import("./pages/public/Courses"));
const CourseDetails = lazy(() => import("./pages/public/CourseDetails"));
const Videos = lazy(() => import("./pages/public/Videos"));
const VideoDetails = lazy(() => import("./pages/public/VideoDetails"));
const Cart = lazy(() => import("./pages/public/Cart"));
const Coaches = lazy(() => import("./pages/public/Coaches"));
const CoachDetails = lazy(() => import("./pages/public/CoachDetails"));
const Creators = lazy(() => import("./pages/public/Creators"));
const Pricing = lazy(() => import("./pages/public/Pricing"));
const AuthGate = lazy(() => import("./pages/AuthGate"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const PaymentPage = lazy(() => import("./pages/PaymentPage"));
const FAQ = lazy(() => import("./pages/public/FAQ"));
const SubscriptionCallback = lazy(() => import("./pages/billing/SubscriptionCallback"));

// Learner dashboard - LEGACY (commented out - files removed)
// const LearnerDashboard = lazy(() => import("./pages/dashboard/LearnerDashboard"));
// const LearnerCourses = lazy(() => import("./pages/dashboard/LearnerCourses"));
// const LearnerVideos = lazy(() => import("./pages/dashboard/LearnerVideos"));
const LearnerBookings = lazy(() => import("./pages/dashboard/LearnerBookings"));
// const LearnerWishlist = lazy(() => import("./pages/dashboard/LearnerWishlist"));
// const LearnerMessages = lazy(() => import("./pages/dashboard/Messages").then(m => ({ default: m.LearnerMessages })));
// const DashboardCreatorMessages = lazy(() => import("./pages/dashboard/Messages").then(m => ({ default: m.CreatorMessages })));
// const InviteFriendsPage = lazy(() => import("./pages/dashboard/InviteFriendsPage"));
// const CoachInvitePage = lazy(() => import("./pages/coach/CoachInvitePage"));
// const CreatorInvitePage = lazy(() => import("./pages/creator/CreatorInvitePage"));
// const TherapistInvitePage = lazy(() => import("./pages/therapist/TherapistInvitePage"));
// const LearnerPayments = lazy(() => import("./pages/dashboard/LearnerPayments"));
// const LearnerSubscription = lazy(() => import("./pages/dashboard/LearnerSubscription"));
// const LearnerPaymentMethods = lazy(() => import("./pages/dashboard/LearnerPaymentMethods"));
// const LearnerNotifications = lazy(() => import("./pages/dashboard/LearnerNotifications"));
// const LearnerProfile = lazy(() => import("./pages/dashboard/ProfileSettings").then(m => ({ default: m.LearnerProfile })));

// New Learner Portal Pages
const NewLearnerDashboard = lazy(() => import("./pages/learner/LearnerDashboard"));
const NewLearnerCourses = lazy(() => import("./pages/learner/LearnerCourses"));
const NewLearnerBookings = lazy(() => import("./pages/learner/LearnerBookings"));
const NewLearnerPaymentMethods = lazy(() => import("./pages/learner/LearnerPaymentMethods"));
const NewLearnerPayments = lazy(() => import("./pages/learner/LearnerPayments"));
const CourseCheckout = lazy(() => import("./pages/learner/CourseCheckout"));
const SessionCheckout = lazy(() => import("./pages/learner/SessionCheckout"));

// Coach dashboard (Figma redesign - mirrors therapist portal)
const CoachDashboard = lazy(() => import("./pages/coach/CoachDashboard"));
const CoachServicesManager = lazy(() => import("./pages/coach/CoachServicesManager"));
const AddNewCoachService = lazy(() => import("./pages/coach/AddNewCoachService"));
const CoachBookings = lazy(() => import("./pages/coach/CoachBookings"));
const CoachClients = lazy(() => import("./pages/coach/CoachClients"));
const CoachSessions = lazy(() => import("./pages/coach/CoachSessions"));
const CoachMessages = lazy(() => import("./pages/coach/CoachMessages"));
const CoachWallet = lazy(() => import("./pages/dashboard/WalletPage").then(m => ({ default: m.CoachWallet })));
const CoachPayout = lazy(() => import("./pages/coach/CoachPayout"));
const CoachSettings = lazy(() => import("./pages/coach/CoachSettings"));

// Legacy coach pages (old dashboard) - COMMENTED OUT - files removed
// const CoachProfile = lazy(() => import("./pages/coach/CoachProfile"));
// const CoachServices = lazy(() => import("./pages/coach/CoachServices"));
// const CoachCalendar = lazy(() => import("./pages/coach/CoachCalendar"));
// const CoachReviews = lazy(() => import("./pages/coach/CoachReviews"));
// const CoachContent = lazy(() => import("./pages/coach/CoachContent"));
// const CoachRefunds = lazy(() => import("./pages/coach/CoachRefunds"));
// const CoachUploadVideo = lazy(() => import("./pages/coach/CoachUploadVideo"));

// Therapist portal pages (Figma redesign)
const TherapistDashboard = lazy(() => import("./pages/therapist/TherapistDashboard"));
const TherapistClients = lazy(() => import("./pages/therapist/TherapistClients"));
const TherapistServicesManager = lazy(() => import("./pages/therapist/TherapistServicesManager"));
const AddNewService = lazy(() => import("./pages/therapist/AddNewService"));
const TherapistBookings = lazy(() => import("./pages/therapist/TherapistBookings"));
const TherapistSessions = lazy(() => import("./pages/therapist/TherapistSessions"));
const TherapistMessages = lazy(() => import("./pages/therapist/TherapistMessages"));
const TherapistSettings = lazy(() => import("./pages/therapist/TherapistSettings"));

// Shared dashboard pages
const LearnerWallet = lazy(() => import("./pages/dashboard/WalletPage").then(m => ({ default: m.LearnerWallet })));
const CreatorWallet = lazy(() => import("./pages/dashboard/WalletPage").then(m => ({ default: m.CreatorWallet })));
const TherapistWallet = lazy(() => import("./pages/dashboard/WalletPage").then(m => ({ default: m.TherapistWallet })));
const CreatorWithdrawals = lazy(() => import("./pages/dashboard/WithdrawalsPage").then(m => ({ default: m.CreatorWithdrawals })));
const TherapistWithdrawals = lazy(() => import("./pages/dashboard/WithdrawalsPage").then(m => ({ default: m.TherapistWithdrawals })));

const BookingMeetingRoom = lazy(() => import("./pages/dashboard/BookingMeetingRoom"));
// const ProfessionalProfileSettings = lazy(() => import("./pages/dashboard/ProfessionalProfileSettings"));
// const BankAccountsPage = lazy(() => import("./pages/dashboard/BankAccountsPage"));

// Creator dashboard
const CreatorDashboard = lazy(() => import("./pages/creator/CreatorDashboard"));
const CreatorCourses = lazy(() => import("./pages/creator/CreatorCourses"));
const CreateCourse = lazy(() => import("./pages/creator/CreateCourse"));
const CreatorStudents = lazy(() => import("./pages/creator/CreatorStudents"));
const CreatorAnalytics = lazy(() => import("./pages/creator/CreatorAnalytics"));
const CreatorRevenue = lazy(() => import("./pages/creator/CreatorRevenue"));
const CreatorMessages = lazy(() => import("./pages/creator/CreatorMessages"));
const CreatorSettings = lazy(() => import("./pages/creator/CreatorSettings"));
// const UploadVideo = lazy(() => import("./pages/creator/UploadVideo"));
// const CreatorContent = lazy(() => import("./pages/creator/CreatorContent"));

// Public profile preview
const ProfilePreview = lazy(() => import("./pages/public/ProfilePreview"));
const ProviderProfilePage = lazy(() => import("@/components/providers/ProviderProfilePage"));

// Admin
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminCoaches = lazy(() => import("./pages/admin/AdminCoaches"));
const AdminCreators = lazy(() => import("./pages/admin/AdminCreators"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminWallet = lazy(() => import("./pages/admin/AdminWallet"));
const AdminWithdrawals = lazy(() => import("./pages/admin/AdminWithdrawals"));
const AdminTransactions = lazy(() => import("./pages/admin/AdminTransactions"));
const AdminVerifications = lazy(() => import("./pages/admin/AdminVerifications"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminContent = lazy(() => import("./pages/admin/AdminContent"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminRefunds = lazy(() => import("./pages/admin/AdminRefunds"));
const AdminInviteCodes = lazy(() => import("./pages/admin/AdminInviteCodes"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));

// Support agent portal
const SupportAgentLogin = lazy(() => import("./pages/support/SupportAgentLogin"));
const SupportAgentDashboard = lazy(() => import("./pages/support/SupportAgentDashboard"));

// Court Room System
const CourtRoomApp = lazy(() => import("./components/court-room/CourtRoomApp"));
const JudgePortalApp = lazy(() => import("./components/judge-portal/JudgePortalApp"));

// Static pages (named exports)
const Terms = lazy(() => import("./pages/public/StaticPages").then(m => ({ default: m.Terms })));
const Privacy = lazy(() => import("./pages/public/StaticPages").then(m => ({ default: m.Privacy })));
const RefundPolicy = lazy(() => import("./pages/public/StaticPages").then(m => ({ default: m.RefundPolicy })));
const Blog = lazy(() => import("./pages/public/StaticPages").then(m => ({ default: m.Blog })));
const BlogArticle = lazy(() => import("./pages/public/BlogArticle"));
const Contact = lazy(() => import("./pages/public/StaticPages").then(m => ({ default: m.Contact })));
const HelpCenter = lazy(() => import("./pages/public/StaticPages").then(m => ({ default: m.HelpCenter })));

import PortalRestrictionGuard from "@/components/court-room/PortalRestrictionGuard";

import Preloader from "@/components/Preloader";
import VoiceAssistant from "@/components/VoiceAssistant";

// Reuse the same branded preloader for lazy-route suspense fallback
const PageLoader = () => <Preloader onDone={() => { }} />;

const queryClient = new QueryClient();

// Subdomain Router Component
const SubdomainRouter = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we're on a judge portal subdomain
    if (isJudgePortalDomain()) {
      const redirect = getJudgePortalRedirect();
      if (redirect && window.location.pathname === '/') {
        navigate(redirect);
      }
    }
  }, [navigate]);

  return <>{children}</>;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <CartProvider>
              <VoiceAssistant />
              <SubdomainRouter>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                    <Route path="/auth-gate" element={<AuthGate />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/therapists" element={<Therapists />} />
                    <Route path="/therapists/results" element={<Therapists />} />
                    <Route path="/therapists/:country" element={<Therapists />} />
                    <Route path="/therapists/:country/:city" element={<Therapists />} />
                    <Route path="/coaches" element={<Coaches />} />
                    <Route path="/coaches/results" element={<Coaches />} />
                    <Route path="/coaches/:country" element={<Coaches />} />
                    <Route path="/coaches/:country/:city" element={<Coaches />} />
                    <Route path="/coaches/profile/:id" element={<CoachDetails />} />
                    <Route path="/directory/:role/:id" element={<ProviderProfilePage />} />
                    <Route path="/creators" element={<Creators />} />
                    <Route path="/profile/:slug" element={<ProfilePreview />} />
                    <Route path="/courses" element={<Courses />} />
                    <Route path="/courses/:slug" element={<CourseDetails />} />
                    <Route path="/videos" element={<Videos />} />
                    <Route path="/videos/:slug" element={<VideoDetails />} />
                    <Route path="/video/:slug" element={<VideoDetails />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/faq" element={<FAQ />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/refund-policy" element={<RefundPolicy />} />
                    <Route path="/blog" element={<Blog />} />
                    <Route path="/blog/:slug" element={<BlogArticle />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/help" element={<HelpCenter />} />

                    <Route
                      path="/cart"
                      element={
                        <AuthDecisionGuard>
                          <CartPage />
                        </AuthDecisionGuard>
                      }
                    />

                    <Route
                      path="/checkout"
                      element={
                        <AuthDecisionGuard>
                          <CheckoutPage />
                        </AuthDecisionGuard>
                      }
                    />

                    <Route
                      path="/pay"
                      element={
                        <AuthDecisionGuard>
                          <PaymentPage />
                        </AuthDecisionGuard>
                      }
                    />

                    <Route
                      path="/subscription/callback"
                      element={<SubscriptionCallback />}
                    />
                    <Route
                      path="/billing/subscription-callback"
                      element={<SubscriptionCallback />}
                    />

                    <Route
                      path="/onboarding"
                      element={
                        <ProtectedRoute requireOnboarding={false}>
                          <Onboarding />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/welcome"
                      element={
                        <ProtectedRoute requireOnboarding={false}>
                          <WelcomePage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute requiredRole="learner">
                          <NewLearnerDashboard />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/coach"
                      element={
                        <ProtectedRoute requiredRole="coach">
                          <PortalRestrictionGuard role="coach"><CoachDashboard /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/therapist"
                      element={
                        <ProtectedRoute requiredRole="therapist">
                          <PortalRestrictionGuard role="therapist"><TherapistDashboard /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/creator"
                      element={
                        <ProtectedRoute requiredRole="creator">
                          <CreatorDashboard />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminDashboard />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/dashboard/courses"
                      element={
                        <ProtectedRoute requiredRole="learner">
                          <NewLearnerCourses />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/videos"
                      element={
                        <ProtectedRoute requiredRole="learner">
                          <NewLearnerCourses />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/bookings"
                      element={
                        <ProtectedRoute requiredRole="learner">
                          <LearnerBookings />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/wishlist"
                      element={
                        <ProtectedRoute requiredRole="learner">
                          <NewLearnerCourses />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/messages"
                      element={
                        <ProtectedRoute requiredRole="learner">
                          <NewLearnerDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/payments"
                      element={
                        <ProtectedRoute requiredRole="learner">
                          <NewLearnerPayments />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/subscription"
                      element={
                        <ProtectedRoute requiredRole="learner">
                          <NewLearnerDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/payment-methods"
                      element={
                        <ProtectedRoute requiredRole="learner">
                          <NewLearnerPaymentMethods />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/notifications"
                      element={
                        <ProtectedRoute requiredRole="learner">
                          <NewLearnerDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/profile"
                      element={
                        <ProtectedRoute requiredRole="learner">
                          <NewLearnerDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/invite"
                      element={
                        <ProtectedRoute requiredRole="learner">
                          <NewLearnerDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/wallet"
                      element={
                        <ProtectedRoute requiredRole="learner">
                          <LearnerWallet />
                        </ProtectedRoute>
                      }
                    />

                    {/* New Learner Portal Routes */}
                    <Route
                      path="/learner/dashboard"
                      element={
                        <ProtectedRoute requiredRole="learner">
                          <StripeProvider>
                            <NewLearnerDashboard />
                          </StripeProvider>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/learner/courses"
                      element={
                        <ProtectedRoute requiredRole="learner">
                          <NewLearnerCourses />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/learner/bookings"
                      element={
                        <ProtectedRoute requiredRole="learner">
                          <NewLearnerBookings />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/learner/payment-methods"
                      element={
                        <ProtectedRoute requiredRole="learner">
                          <StripeProvider>
                            <NewLearnerPaymentMethods />
                          </StripeProvider>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/learner/payments"
                      element={
                        <ProtectedRoute requiredRole="learner">
                          <NewLearnerPayments />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/learner/checkout/course"
                      element={
                        <ProtectedRoute requiredRole="learner">
                          <StripeProvider>
                            <CourseCheckout />
                          </StripeProvider>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/learner/checkout/session"
                      element={
                        <ProtectedRoute requiredRole="learner">
                          <StripeProvider>
                            <SessionCheckout />
                          </StripeProvider>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/session/:bookingId"
                      element={
                        <ProtectedRoute requireOnboarding={false}>
                          <BookingMeetingRoom />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/coach/dashboard"
                      element={
                        <ProtectedRoute requiredRole="coach">
                          <PortalRestrictionGuard role="coach"><CoachDashboard /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/coach/services"
                      element={
                        <ProtectedRoute requiredRole="coach">
                          <PortalRestrictionGuard role="coach"><CoachServicesManager /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/coach/services/new"
                      element={
                        <ProtectedRoute requiredRole="coach">
                          <PortalRestrictionGuard role="coach"><AddNewCoachService /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/coach/bookings"
                      element={
                        <ProtectedRoute requiredRole="coach">
                          <PortalRestrictionGuard role="coach"><CoachBookings /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/coach/clients"
                      element={
                        <ProtectedRoute requiredRole="coach">
                          <PortalRestrictionGuard role="coach"><CoachClients /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/coach/sessions"
                      element={
                        <ProtectedRoute requiredRole="coach">
                          <PortalRestrictionGuard role="coach"><CoachSessions /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/coach/messages"
                      element={
                        <ProtectedRoute requiredRole="coach">
                          <PortalRestrictionGuard role="coach"><CoachMessages /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/coach/wallet"
                      element={
                        <ProtectedRoute requiredRole="coach">
                          <PortalRestrictionGuard role="coach"><CoachWallet /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/coach/withdrawals"
                      element={
                        <ProtectedRoute requiredRole="coach">
                          <PortalRestrictionGuard role="coach"><CoachPayout /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/coach/settings"
                      element={
                        <ProtectedRoute requiredRole="coach">
                          <PortalRestrictionGuard role="coach"><CoachSettings /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    {/* COMMENTED OUT - BankAccountsPage component missing
                    <Route
                      path="/coach/bank-accounts"
                      element={
                        <ProtectedRoute requiredRole="coach">
                          <PortalRestrictionGuard role="coach"><BankAccountsPage role="coach" /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    */}

                    {/* Legacy coach routes (old dashboard) - COMMENTED OUT - components removed
                    <Route
                      path="/coach/profile"
                      element={
                        <ProtectedRoute requiredRole="coach">
                          <PortalRestrictionGuard role="coach"><CoachProfile /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/coach/calendar"
                      element={
                        <ProtectedRoute requiredRole="coach">
                          <PortalRestrictionGuard role="coach"><CoachCalendar /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/coach/reviews"
                      element={
                        <ProtectedRoute requiredRole="coach">
                          <PortalRestrictionGuard role="coach"><CoachReviews /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/coach/content"
                      element={
                        <ProtectedRoute requiredRole="coach">
                          <PortalRestrictionGuard role="coach"><CoachContent /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/coach/upload-video"
                      element={
                        <ProtectedRoute requiredRole="coach">
                          <PortalRestrictionGuard role="coach"><CoachUploadVideo /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    */}
                    <Route
                      path="/coach/settings"
                      element={
                        <ProtectedRoute requiredRole="coach">
                          <PortalRestrictionGuard role="coach"><CoachSettings /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    {/* COMMENTED OUT - CoachInvitePage component missing
                    <Route
                      path="/coach/invite"
                      element={
                        <ProtectedRoute requiredRole="coach">
                          <PortalRestrictionGuard role="coach"><CoachInvitePage /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    */}
                    {/* COMMENTED OUT - CoachRefunds component removed
                    <Route
                      path="/coach/refunds"
                      element={
                        <ProtectedRoute requiredRole="coach">
                          <PortalRestrictionGuard role="coach"><CoachRefunds /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    */}

                    <Route
                      path="/therapist/dashboard"
                      element={
                        <ProtectedRoute requiredRole="therapist">
                          <PortalRestrictionGuard role="therapist"><TherapistDashboard /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/therapist/services"
                      element={
                        <ProtectedRoute requiredRole="therapist">
                          <PortalRestrictionGuard role="therapist"><TherapistServicesManager /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/therapist/services/new"
                      element={
                        <ProtectedRoute requiredRole="therapist">
                          <PortalRestrictionGuard role="therapist"><AddNewService /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/therapist/bookings"
                      element={
                        <ProtectedRoute requiredRole="therapist">
                          <PortalRestrictionGuard role="therapist"><TherapistBookings /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/therapist/clients"
                      element={
                        <ProtectedRoute requiredRole="therapist">
                          <PortalRestrictionGuard role="therapist"><TherapistClients /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/therapist/sessions"
                      element={
                        <ProtectedRoute requiredRole="therapist">
                          <PortalRestrictionGuard role="therapist"><TherapistSessions /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/therapist/messages"
                      element={
                        <ProtectedRoute requiredRole="therapist">
                          <PortalRestrictionGuard role="therapist"><TherapistMessages /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/therapist/wallet"
                      element={
                        <ProtectedRoute requiredRole="therapist">
                          <PortalRestrictionGuard role="therapist"><TherapistWallet /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/therapist/withdrawals"
                      element={
                        <ProtectedRoute requiredRole="therapist">
                          <PortalRestrictionGuard role="therapist"><TherapistWithdrawals /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    {/* COMMENTED OUT - BankAccountsPage component missing
                    <Route
                      path="/therapist/bank-accounts"
                      element={
                        <ProtectedRoute requiredRole="therapist">
                          <PortalRestrictionGuard role="therapist"><BankAccountsPage role="therapist" /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />
                    */}
                    <Route
                      path="/therapist/settings"
                      element={
                        <ProtectedRoute requiredRole="therapist">
                          <PortalRestrictionGuard role="therapist"><TherapistSettings /></PortalRestrictionGuard>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/creator/dashboard"
                      element={
                        <ProtectedRoute requiredRole="creator">
                          <CreatorDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/creator/courses"
                      element={
                        <ProtectedRoute requiredRole="creator">
                          <CreatorCourses />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/creator/create-course"
                      element={
                        <ProtectedRoute requiredRole="creator">
                          <CreateCourse />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/creator/students"
                      element={
                        <ProtectedRoute requiredRole="creator">
                          <CreatorStudents />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/creator/analytics"
                      element={
                        <ProtectedRoute requiredRole="creator">
                          <CreatorAnalytics />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/creator/revenue"
                      element={
                        <ProtectedRoute requiredRole="creator">
                          <CreatorRevenue />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/creator/messages"
                      element={
                        <ProtectedRoute requiredRole="creator">
                          <CreatorMessages />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/creator/settings"
                      element={
                        <ProtectedRoute requiredRole="creator">
                          <CreatorSettings />
                        </ProtectedRoute>
                      }
                    />
                    {/* COMMENTED OUT - UploadVideo component missing
                    <Route
                      path="/creator/upload-video"
                      element={
                        <ProtectedRoute requiredRole="creator">
                          <UploadVideo />
                        </ProtectedRoute>
                      }
                    />
                    */}
                    {/* COMMENTED OUT - CreatorContent component missing
                    <Route
                      path="/creator/content"
                      element={
                        <ProtectedRoute requiredRole="creator">
                          <CreatorContent />
                        </ProtectedRoute>
                      }
                    />
                    */}
                    <Route
                      path="/creator/wallet"
                      element={
                        <ProtectedRoute requiredRole="creator">
                          <CreatorWallet />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/creator/withdrawals"
                      element={
                        <ProtectedRoute requiredRole="creator">
                          <CreatorWithdrawals />
                        </ProtectedRoute>
                      }
                    />
                    {/* COMMENTED OUT - ProfessionalProfileSettings component missing
                    <Route
                      path="/creator/profile-settings"
                      element={
                        <ProtectedRoute requiredRole="creator">
                          <ProfessionalProfileSettings role="creator" />
                        </ProtectedRoute>
                      }
                    />
                    */}
                    {/* COMMENTED OUT - CreatorInvitePage component missing
                    <Route
                      path="/creator/invite"
                      element={
                        <ProtectedRoute requiredRole="creator">
                          <CreatorInvitePage />
                        </ProtectedRoute>
                      }
                    />
                    */}
                    {/* COMMENTED OUT - BankAccountsPage component missing
                    <Route
                      path="/creator/bank-accounts"
                      element={
                        <ProtectedRoute requiredRole="creator">
                          <BankAccountsPage role="creator" />
                        </ProtectedRoute>
                      }
                    />
                    */}
                    <Route path="/admin-login" element={<AdminLogin />} />
                    <Route path="/support-agent" element={<SupportAgentLogin />} />
                    <Route path="/support-agent/dashboard" element={<SupportAgentDashboard />} />
                    <Route
                      path="/admin/dashboard"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/users"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminUsers />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/coaches"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminCoaches />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/creators"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminCreators />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/payments"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminPayments />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/wallet"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminWallet />
                        </ProtectedRoute>
                      }
                    />
                    {/* COMMENTED OUT - BankAccountsPage component missing
                    <Route
                      path="/admin/bank-accounts"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <BankAccountsPage role={"coach" as any} />
                        </ProtectedRoute>
                      }
                    />
                    */}
                    <Route
                      path="/admin/withdrawals"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminWithdrawals />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/transactions"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminTransactions />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/verifications"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminVerifications />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/reports"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminReports />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/content"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminContent />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/categories"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminCategories />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/settings"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminSettings />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/refunds"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminRefunds />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/invite-codes"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminInviteCodes />
                        </ProtectedRoute>
                      }
                    />

                    {/* Court Room System Routes */}
                    <Route
                      path="/court-room/:caseId"
                      element={
                        <ProtectedRoute>
                          <CourtRoomApp />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/judge-portal/*"
                      element={<JudgePortalApp />}
                    />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </SubdomainRouter>
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;