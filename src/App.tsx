import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";

import ProtectedRoute from "@/components/ProtectedRoute";
import AuthDecisionGuard from "./components/AuthDecisionGuard";

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
const StaticPages = lazy(() => import("./pages/public/StaticPages"));
const SubscriptionCallback = lazy(() => import("./pages/billing/SubscriptionCallback"));

// Learner dashboard
const LearnerDashboard = lazy(() => import("./pages/dashboard/LearnerDashboard"));
const LearnerCourses = lazy(() => import("./pages/dashboard/LearnerCourses"));
const LearnerVideos = lazy(() => import("./pages/dashboard/LearnerVideos"));
const LearnerBookings = lazy(() => import("./pages/dashboard/LearnerBookings"));
const LearnerWishlist = lazy(() => import("./pages/dashboard/LearnerWishlist"));
const LearnerMessages = lazy(() => import("./pages/dashboard/Messages").then(m => ({ default: m.LearnerMessages })));
const CoachMessages = lazy(() => import("./pages/dashboard/Messages").then(m => ({ default: m.CoachMessages })));
const CreatorMessages = lazy(() => import("./pages/dashboard/Messages").then(m => ({ default: m.CreatorMessages })));
const TherapistMessages = lazy(() => import("./pages/dashboard/Messages").then(m => ({ default: m.TherapistMessages })));
const LearnerPayments = lazy(() => import("./pages/dashboard/LearnerPayments"));
const LearnerSubscription = lazy(() => import("./pages/dashboard/LearnerSubscription"));
const LearnerPaymentMethods = lazy(() => import("./pages/dashboard/LearnerPaymentMethods"));
const LearnerNotifications = lazy(() => import("./pages/dashboard/LearnerNotifications"));
const LearnerProfile = lazy(() => import("./pages/dashboard/ProfileSettings").then(m => ({ default: m.LearnerProfile })));

// Coach dashboard
const CoachDashboard = lazy(() => import("./pages/coach/CoachDashboard"));
const CoachProfile = lazy(() => import("./pages/coach/CoachProfile"));
const CoachServices = lazy(() => import("./pages/coach/CoachServices"));
const CoachCalendar = lazy(() => import("./pages/coach/CoachCalendar"));
const CoachBookings = lazy(() => import("./pages/coach/CoachBookings"));
const CoachClients = lazy(() => import("./pages/coach/CoachClients"));
const CoachSessions = lazy(() => import("./pages/coach/CoachSessions"));
const CoachReviews = lazy(() => import("./pages/coach/CoachReviews"));
const CoachContent = lazy(() => import("./pages/coach/CoachContent"));
const CoachUploadVideo = lazy(() => import("./pages/coach/CoachUploadVideo"));

// Therapist dashboard
const TherapistDashboard = lazy(() => import("./pages/therapist/TherapistDashboard"));
const TherapistProfile = lazy(() => import("./pages/therapist/TherapistProfile"));
const TherapistServices = lazy(() => import("./pages/therapist/TherapistServices"));
const TherapistCalendar = lazy(() => import("./pages/therapist/TherapistCalendar"));
const TherapistBookings = lazy(() => import("./pages/therapist/TherapistBookings"));
const TherapistClients = lazy(() => import("./pages/therapist/TherapistClients"));
const TherapistSessions = lazy(() => import("./pages/therapist/TherapistSessions"));
const TherapistContent = lazy(() => import("./pages/therapist/TherapistContent"));
const TherapistUploadVideo = lazy(() => import("./pages/therapist/TherapistUploadVideo"));

// Shared dashboard pages
const LearnerWallet = lazy(() => import("./pages/dashboard/WalletPage").then(m => ({ default: m.LearnerWallet })));
const CoachWallet = lazy(() => import("./pages/dashboard/WalletPage").then(m => ({ default: m.CoachWallet })));
const CreatorWallet = lazy(() => import("./pages/dashboard/WalletPage").then(m => ({ default: m.CreatorWallet })));
const TherapistWallet = lazy(() => import("./pages/dashboard/WalletPage").then(m => ({ default: m.TherapistWallet })));
const CoachWithdrawals = lazy(() => import("./pages/dashboard/WithdrawalsPage").then(m => ({ default: m.CoachWithdrawals })));
const CreatorWithdrawals = lazy(() => import("./pages/dashboard/WithdrawalsPage").then(m => ({ default: m.CreatorWithdrawals })));
const TherapistWithdrawals = lazy(() => import("./pages/dashboard/WithdrawalsPage").then(m => ({ default: m.TherapistWithdrawals })));
const BookingMeetingRoom = lazy(() => import("./pages/dashboard/BookingMeetingRoom"));
const ProfessionalProfileSettings = lazy(() => import("./pages/dashboard/ProfessionalProfileSettings"));
const BankAccountsPage = lazy(() => import("./pages/dashboard/BankAccountsPage"));
const LearnerKYC = lazy(() => import("./pages/dashboard/KYCPage").then(m => ({ default: m.LearnerKYC })));
const CoachKYC = lazy(() => import("./pages/dashboard/KYCPage").then(m => ({ default: m.CoachKYC })));
const TherapistKYC = lazy(() => import("./pages/dashboard/KYCPage").then(m => ({ default: m.TherapistKYC })));
const CreatorKYC = lazy(() => import("./pages/dashboard/KYCPage").then(m => ({ default: m.CreatorKYC })));

// Creator dashboard
const CreatorDashboard = lazy(() => import("./pages/creator/CreatorDashboard"));
const UploadVideo = lazy(() => import("./pages/creator/UploadVideo"));
const CreatorContent = lazy(() => import("./pages/creator/CreatorContent"));
const CreatorAnalytics = lazy(() => import("./pages/creator/CreatorAnalytics"));

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
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminKYC = lazy(() => import("./pages/admin/AdminKYC"));
const AdminRefunds = lazy(() => import("./pages/admin/AdminRefunds"));
const AdminInviteCodes = lazy(() => import("./pages/admin/AdminInviteCodes"));

// Static pages (named exports)
const Terms = lazy(() => import("./pages/public/StaticPages").then(m => ({ default: m.Terms })));
const Privacy = lazy(() => import("./pages/public/StaticPages").then(m => ({ default: m.Privacy })));
const RefundPolicy = lazy(() => import("./pages/public/StaticPages").then(m => ({ default: m.RefundPolicy })));
const Blog = lazy(() => import("./pages/public/StaticPages").then(m => ({ default: m.Blog })));
const Contact = lazy(() => import("./pages/public/StaticPages").then(m => ({ default: m.Contact })));
const HelpCenter = lazy(() => import("./pages/public/StaticPages").then(m => ({ default: m.HelpCenter })));

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <CartProvider>
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
                  path="/dashboard"
                  element={
                    <ProtectedRoute requiredRole="learner">
                      <LearnerDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/coach"
                  element={
                    <ProtectedRoute requiredRole="coach">
                      <CoachDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/therapist"
                  element={
                    <ProtectedRoute requiredRole="therapist">
                      <TherapistDashboard />
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
                      <LearnerCourses />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/videos"
                  element={
                    <ProtectedRoute requiredRole="learner">
                      <LearnerVideos />
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
                      <LearnerWishlist />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/messages"
                  element={
                    <ProtectedRoute requiredRole="learner">
                      <LearnerMessages />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/payments"
                  element={
                    <ProtectedRoute requiredRole="learner">
                      <LearnerPayments />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/subscription"
                  element={
                    <ProtectedRoute requiredRole="learner">
                      <LearnerSubscription />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/payment-methods"
                  element={
                    <ProtectedRoute requiredRole="learner">
                      <LearnerPaymentMethods />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/notifications"
                  element={
                    <ProtectedRoute requiredRole="learner">
                      <LearnerNotifications />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/profile"
                  element={
                    <ProtectedRoute requiredRole="learner">
                      <LearnerProfile />
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
                <Route
                  path="/dashboard/kyc"
                  element={
                    <ProtectedRoute requiredRole="learner">
                      <LearnerKYC />
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
                      <CoachDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coach/profile"
                  element={
                    <ProtectedRoute requiredRole="coach">
                      <CoachProfile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coach/services"
                  element={
                    <ProtectedRoute requiredRole="coach">
                      <CoachServices />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coach/calendar"
                  element={
                    <ProtectedRoute requiredRole="coach">
                      <CoachCalendar />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coach/bookings"
                  element={
                    <ProtectedRoute requiredRole="coach">
                      <CoachBookings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coach/clients"
                  element={
                    <ProtectedRoute requiredRole="coach">
                      <CoachClients />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coach/sessions"
                  element={
                    <ProtectedRoute requiredRole="coach">
                      <CoachSessions />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coach/messages"
                  element={
                    <ProtectedRoute requiredRole="coach">
                      <CoachMessages />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coach/wallet"
                  element={
                    <ProtectedRoute requiredRole="coach">
                      <CoachWallet />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coach/withdrawals"
                  element={
                    <ProtectedRoute requiredRole="coach">
                      <CoachWithdrawals />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coach/reviews"
                  element={
                    <ProtectedRoute requiredRole="coach">
                      <CoachReviews />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coach/content"
                  element={
                    <ProtectedRoute requiredRole="coach">
                      <CoachContent />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coach/upload-video"
                  element={
                    <ProtectedRoute requiredRole="coach">
                      <CoachUploadVideo />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coach/profile-settings"
                  element={
                    <ProtectedRoute requiredRole="coach">
                      <ProfessionalProfileSettings role="coach" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coach/bank-accounts"
                  element={
                    <ProtectedRoute requiredRole="coach">
                      <BankAccountsPage role="coach" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coach/kyc"
                  element={
                    <ProtectedRoute requiredRole="coach">
                      <CoachKYC />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/therapist/dashboard"
                  element={
                    <ProtectedRoute requiredRole="therapist">
                      <TherapistDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/therapist/profile"
                  element={
                    <ProtectedRoute requiredRole="therapist">
                      <TherapistProfile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/therapist/services"
                  element={
                    <ProtectedRoute requiredRole="therapist">
                      <TherapistServices />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/therapist/calendar"
                  element={
                    <ProtectedRoute requiredRole="therapist">
                      <TherapistCalendar />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/therapist/bookings"
                  element={
                    <ProtectedRoute requiredRole="therapist">
                      <TherapistBookings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/therapist/clients"
                  element={
                    <ProtectedRoute requiredRole="therapist">
                      <TherapistClients />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/therapist/sessions"
                  element={
                    <ProtectedRoute requiredRole="therapist">
                      <TherapistSessions />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/therapist/content"
                  element={
                    <ProtectedRoute requiredRole="therapist">
                      <TherapistContent />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/therapist/upload-video"
                  element={
                    <ProtectedRoute requiredRole="therapist">
                      <TherapistUploadVideo />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/therapist/messages"
                  element={
                    <ProtectedRoute requiredRole="therapist">
                      <TherapistMessages />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/therapist/wallet"
                  element={
                    <ProtectedRoute requiredRole="therapist">
                      <TherapistWallet />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/therapist/withdrawals"
                  element={
                    <ProtectedRoute requiredRole="therapist">
                      <TherapistWithdrawals />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/therapist/profile-settings"
                  element={
                    <ProtectedRoute requiredRole="therapist">
                      <ProfessionalProfileSettings role="therapist" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/therapist/bank-accounts"
                  element={
                    <ProtectedRoute requiredRole="therapist">
                      <BankAccountsPage role="therapist" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/therapist/kyc"
                  element={
                    <ProtectedRoute requiredRole="therapist">
                      <TherapistKYC />
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
                  path="/creator/upload-video"
                  element={
                    <ProtectedRoute requiredRole="creator">
                      <UploadVideo />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/creator/content"
                  element={
                    <ProtectedRoute requiredRole="creator">
                      <CreatorContent />
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
                  path="/creator/messages"
                  element={
                    <ProtectedRoute requiredRole="creator">
                      <CreatorMessages />
                    </ProtectedRoute>
                  }
                />
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
                <Route
                  path="/creator/profile-settings"
                  element={
                    <ProtectedRoute requiredRole="creator">
                      <ProfessionalProfileSettings role="creator" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/creator/bank-accounts"
                  element={
                    <ProtectedRoute requiredRole="creator">
                      <BankAccountsPage role="creator" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/creator/kyc"
                  element={
                    <ProtectedRoute requiredRole="creator">
                      <CreatorKYC />
                    </ProtectedRoute>
                  }
                />

                <Route path="/admin-login" element={<AdminLogin />} />
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
                <Route
                  path="/admin/bank-accounts"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <BankAccountsPage role={"coach" as any} />
                    </ProtectedRoute>
                  }
                />
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
                  path="/admin/kyc"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminKYC />
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

                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;