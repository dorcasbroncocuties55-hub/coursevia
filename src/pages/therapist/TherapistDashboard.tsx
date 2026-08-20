import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
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
  Plus
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface TherapistStats {
  total_sessions: number;
  upcoming_sessions: number;
  total_patients: number;
  unread_messages: number;
  wallet_balance: number;
  active_services: number;
}

interface TodaysSession {
  id: string;
  time: string;
  patient_name: string;
  session_type: string;
  status: 'confirmed' | 'pending' | 'completed';
  session_mode: 'virtual' | 'in-person';
}

const TherapistDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<TherapistStats>({
    total_sessions: 0,
    upcoming_sessions: 0,
    total_patients: 0,
    unread_messages: 0,
    wallet_balance: 0,
    active_services: 0
  });
  const [todaysSessions, setTodaysSessions] = useState<TodaysSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Get therapist profile
      const { data: therapistProfile } = await supabase
        .from('therapist_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (therapistProfile) {
        // Get today's sessions
        const today = new Date().toISOString().split('T')[0];
        const { data: sessionsData } = await supabase
          .from('bookings')
          .select(`
            id,
            scheduled_at,
            status,
            service_delivery_mode,
            learner_id,
            profiles!bookings_learner_id_fkey(full_name, avatar_url)
          `)
          .eq('therapist_id', therapistProfile.id)
          .gte('scheduled_at', `${today}T00:00:00`)
          .lt('scheduled_at', `${today}T23:59:59`)
          .order('scheduled_at');

        // Get total bookings count
        const { count: totalSessions } = await supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('therapist_id', therapistProfile.id)
          .eq('status', 'completed');

        // Get unique patients count
        const { data: patientsData } = await supabase
          .from('bookings')
          .select('learner_id')
          .eq('therapist_id', therapistProfile.id);

        const uniquePatients = new Set(patientsData?.map(b => b.learner_id) || []).size;

        // Get wallet balance
        const { data: walletData } = await supabase
          .from('wallets')
          .select('available_balance')
          .eq('user_id', user?.id)
          .single();

        // Get unread messages count
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', user?.id)
          .eq('is_read', false);

        // Format today's sessions
        const formattedSessions: TodaysSession[] = sessionsData?.map(session => ({
          id: session.id,
          time: new Date(session.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          patient_name: (session.profiles as any)?.full_name || 'Patient',
          session_type: 'Cognitive Behavioral Therapy (CBT)',
          status: session.status as any,
          session_mode: session.service_delivery_mode === 'online' ? 'virtual' : 'in-person'
        })) || [];

        setStats({
          total_sessions: totalSessions || 0,
          upcoming_sessions: formattedSessions.length,
          total_patients: uniquePatients,
          unread_messages: unreadCount || 0,
          wallet_balance: walletData?.available_balance || 0,
          active_services: 3 // This would come from therapist_services table
        });

        setTodaysSessions(formattedSessions);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Signed out successfully');
    navigate('/');
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
            <Link to="/therapist/dashboard" className="flex items-center px-4 py-3 text-sm font-medium text-primary bg-primary/10 rounded-lg">
              <Home className="h-5 w-5 mr-3" />
              Dashboard
            </Link>
            <Link to="/therapist/patients" className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
              <Users className="h-5 w-5 mr-3" />
              Patients
            </Link>
            <Link to="/therapist/books" className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
              <BookOpen className="h-5 w-5 mr-3" />
              Books
            </Link>
            <Link to="/therapist/session-notes" className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
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
            <Link to="/therapist/payout" className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
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
            {/* Mobile Menu Button & Search */}
            <div className="flex items-center flex-1 max-w-lg">
              <Button variant="ghost" size="sm" className="lg:hidden mr-3">
                <Home className="h-5 w-5" />
              </Button>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search platform preferences..."
                  className="pl-10 bg-gray-50 border-gray-200"
                />
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-2 lg:space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <Button className="bg-primary hover:bg-primary/90 text-white hidden sm:flex">
                <Plus className="h-4 w-4 mr-2" />
                New Session
              </Button>
              <Button className="bg-primary hover:bg-primary/90 text-white sm:hidden" size="sm">
                <Plus className="h-4 w-4" />
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
          {/* Welcome Section */}
          <div className="mb-6">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">
              Welcome, Dr. {profile?.full_name?.split(' ')[0] || 'Therapist'}
            </h1>
            <p className="text-sm lg:text-base text-gray-600">
              You have {stats.upcoming_sessions} sessions scheduled today ({stats.upcoming_sessions} virtual, 0 in-person).
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Today's Sessions */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Today's Books</CardTitle>
                  <Link to="/therapist/books" className="text-teal-600 text-sm hover:underline">
                    View Full Schedule
                  </Link>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {todaysSessions.length === 0 ? (
                      <div className="text-center py-8">
                        <CalendarDays className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No sessions scheduled for today</p>
                      </div>
                    ) : (
                      todaysSessions.map((session) => (
                        <div key={session.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-gray-200 rounded-lg space-y-3 sm:space-y-0">
                          <div className="flex items-center space-x-3 sm:space-x-4">
                            <div className="text-sm font-medium text-gray-900 w-12 sm:w-16">{session.time}</div>
                            <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                              <AvatarFallback className="bg-gray-100 text-gray-600 text-xs sm:text-sm">
                                {session.patient_name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{session.patient_name}</div>
                              <div className="text-xs text-gray-500">{session.session_type}</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end space-x-3">
                            <Badge
                              variant={session.session_mode === 'virtual' ? 'secondary' : 'outline'}
                              className={`text-xs ${session.session_mode === 'virtual' ? 'bg-blue-100 text-blue-800' : ''}`}
                            >
                              {session.session_mode.toUpperCase()}
                            </Badge>
                            <Button size="sm" className="bg-primary hover:bg-primary/90">
                              Start
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Availability Widget */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Availability (Weekly)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { day: 'MON', date: 16, sessions: 4 },
                      { day: 'TUE', date: 17, sessions: 5 },
                      { day: 'WED', date: 18, sessions: 2 },
                      { day: 'THU', date: 19, sessions: 0 },
                      { day: 'FRI', date: 20, sessions: 4 }
                    ].map((item) => (
                      <div key={item.day} className="flex items-center justify-between py-2">
                        <div className="flex items-center space-x-3">
                          <div className="text-sm font-medium text-gray-900 w-8">{item.day}</div>
                          <div className="text-sm text-gray-500">{item.date}</div>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${item.sessions > 0 ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600'}`}
                        >
                          {item.sessions} sessions
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="mt-6 space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{stats.total_patients}</div>
                      <div className="text-sm text-gray-500">Total Patients</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">${stats.wallet_balance.toFixed(2)}</div>
                      <div className="text-sm text-gray-500">Wallet Balance</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-around">
          <Link to="/therapist/dashboard" className="flex flex-col items-center py-1 px-2 text-primary">
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
          <Link to="/therapist/messages" className="flex flex-col items-center py-1 px-2 text-gray-500 relative">
            <MessageSquare className="h-5 w-5" />
            <span className="text-xs mt-1">Messages</span>
            {stats.unread_messages > 0 && (
              <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[18px] h-4 flex items-center justify-center rounded-full">
                {stats.unread_messages}
              </Badge>
            )}
          </Link>
          <Link to="/therapist/settings" className="flex flex-col items-center py-1 px-2 text-gray-500">
            <Settings className="h-5 w-5" />
            <span className="text-xs mt-1">Settings</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TherapistDashboard;