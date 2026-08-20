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
    Clock,
    MapPin,
    ChevronLeft,
    ChevronRight,
    Filter,
    Calendar,
    Eye,
    Edit,
    X
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface BookingSession {
    id: string;
    scheduled_at: string;
    status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
    service_delivery_mode: 'online' | 'in_person';
    duration: number;
    patient_name: string;
    patient_avatar?: string;
    service_name: string;
    price: number;
    notes?: string;
    created_at: string;
}

const TherapistBookings = () => {
    const { user, profile } = useAuth();
    const [bookings, setBookings] = useState<BookingSession[]>([]);
    const [filteredBookings, setFilteredBookings] = useState<BookingSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        if (user) {
            loadBookings();
        }
    }, [user]);

    useEffect(() => {
        filterBookings();
    }, [statusFilter, bookings]);

    const loadBookings = async () => {
        try {
            // Get therapist profile
            const { data: therapistProfile } = await supabase
                .from('therapist_profiles')
                .select('id')
                .eq('user_id', user?.id)
                .single();

            if (therapistProfile) {
                // Get all bookings for this therapist
                const { data: bookingsData } = await supabase
                    .from('bookings')
                    .select(`
            id,
            scheduled_at,
            status,
            service_delivery_mode,
            duration,
            price,
            notes,
            created_at,
            learner_id,
            service_id,
            profiles!bookings_learner_id_fkey(
              full_name,
              avatar_url
            ),
            therapist_services!bookings_service_id_fkey(
              service_name
            )
          `)
                    .eq('therapist_id', therapistProfile.id)
                    .order('scheduled_at', { ascending: true });

                if (bookingsData) {
                    const formattedBookings: BookingSession[] = bookingsData.map(booking => ({
                        id: booking.id,
                        scheduled_at: booking.scheduled_at,
                        status: booking.status as any,
                        service_delivery_mode: booking.service_delivery_mode as any,
                        duration: booking.duration || 60,
                        patient_name: (booking.profiles as any)?.full_name || 'Unknown Patient',
                        patient_avatar: (booking.profiles as any)?.avatar_url,
                        service_name: (booking.therapist_services as any)?.service_name || 'Therapy Session',
                        price: booking.price || 0,
                        notes: booking.notes,
                        created_at: booking.created_at
                    }));

                    setBookings(formattedBookings);
                }
            }
        } catch (error) {
            console.error('Error loading bookings:', error);
            toast.error('Failed to load bookings');
        } finally {
            setIsLoading(false);
        }
    };

    const filterBookings = () => {
        let filtered = bookings;

        if (statusFilter !== "all") {
            filtered = filtered.filter(booking => booking.status === statusFilter);
        }

        setFilteredBookings(filtered);
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        toast.success('Signed out successfully');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'completed': return 'bg-blue-100 text-blue-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString(),
            time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
    };

    const getTodayBookings = () => {
        const today = new Date().toDateString();
        return filteredBookings.filter(booking =>
            new Date(booking.scheduled_at).toDateString() === today
        );
    };

    const getUpcomingBookings = () => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return filteredBookings.filter(booking => {
            const bookingDate = new Date(booking.scheduled_at);
            return bookingDate >= tomorrow;
        });
    };

    if (!user) {
        return <Navigate to="/auth" replace />;
    }

    const todayBookings = getTodayBookings();
    const upcomingBookings = getUpcomingBookings();

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar - 260px */}
            <div className="w-[260px] bg-white shadow-lg flex-shrink-0">
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
                        <Link to="/therapist/bookings" className="flex items-center px-4 py-3 text-sm font-medium text-primary bg-primary/10 rounded-lg">
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
                <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        {/* Page Title */}
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Books</h1>
                            <p className="text-gray-600">Manage your appointments and session schedule</p>
                        </div>

                        {/* Header Actions */}
                        <div className="flex items-center space-x-4">
                            <Button variant="ghost" size="sm">
                                <Bell className="h-4 w-4" />
                            </Button>
                            <Button className="bg-primary hover:bg-primary/90 text-white">
                                <Plus className="h-4 w-4 mr-2" />
                                Block Time
                            </Button>

                            {/* User Profile */}
                            <div className="flex items-center space-x-3">
                                <Avatar>
                                    <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                                    <AvatarFallback className="bg-primary/10 text-primary">
                                        {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'T'}
                                    </AvatarFallback>
                                </Avatar>
                                <Button variant="outline" onClick={handleSignOut}>
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Sign Out
                                </Button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6">
                    {/* View Controls */}
                    <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
                        <div className="flex items-center space-x-4">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-48">
                                    <Filter className="h-4 w-4 mr-2" />
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Bookings</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="confirmed">Confirmed</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                            <Button
                                variant={viewMode === 'list' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('list')}
                                className={viewMode === 'list' ? 'bg-white shadow-sm' : ''}
                            >
                                List View
                            </Button>
                            <Button
                                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('calendar')}
                                className={viewMode === 'calendar' ? 'bg-white shadow-sm' : ''}
                            >
                                <Calendar className="h-4 w-4 mr-2" />
                                Calendar
                            </Button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                            <p className="text-gray-500 mt-4">Loading bookings...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            {/* Today's Sessions */}
                            <Card className="xl:col-span-2">
                                <CardHeader>
                                    <CardTitle className="text-lg font-semibold">Today's Sessions</CardTitle>
                                    <CardDescription>
                                        {todayBookings.length} session{todayBookings.length !== 1 ? 's' : ''} scheduled
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {todayBookings.length === 0 ? (
                                            <div className="text-center py-8">
                                                <CalendarDays className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                                <p className="text-gray-500">No sessions scheduled for today</p>
                                            </div>
                                        ) : (
                                            todayBookings.map((booking) => {
                                                const { date, time } = formatDate(booking.scheduled_at);
                                                return (
                                                    <div key={booking.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                                                        <div className="flex items-center space-x-4">
                                                            <div className="text-sm font-medium text-gray-900 w-16">{time}</div>
                                                            <Avatar className="h-10 w-10">
                                                                <AvatarImage src={booking.patient_avatar} alt={booking.patient_name} />
                                                                <AvatarFallback className="bg-gray-100 text-gray-600 text-sm">
                                                                    {booking.patient_name.split(' ').map(n => n[0]).join('')}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900">{booking.patient_name}</div>
                                                                <div className="text-xs text-gray-500">{booking.service_name}</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center space-x-3">
                                                            <Badge
                                                                variant="secondary"
                                                                className={booking.service_delivery_mode === 'online' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                                                            >
                                                                {booking.service_delivery_mode === 'online' ? 'VIRTUAL' : 'IN-PERSON'}
                                                            </Badge>
                                                            <Badge className={getStatusColor(booking.status)}>
                                                                {booking.status.toUpperCase()}
                                                            </Badge>
                                                            <Button size="sm" variant="outline">
                                                                <Eye className="h-4 w-4 mr-2" />
                                                                View
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Upcoming Sessions */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg font-semibold">Upcoming Sessions</CardTitle>
                                    <CardDescription>Next 7 days</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {upcomingBookings.slice(0, 5).map((booking) => {
                                            const { date, time } = formatDate(booking.scheduled_at);
                                            return (
                                                <div key={booking.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{booking.patient_name}</div>
                                                        <div className="text-xs text-gray-500">{date} at {time}</div>
                                                    </div>
                                                    <Badge className={getStatusColor(booking.status)} variant="secondary">
                                                        {booking.status}
                                                    </Badge>
                                                </div>
                                            );
                                        })}
                                        {upcomingBookings.length === 0 && (
                                            <div className="text-center py-8">
                                                <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                                <p className="text-sm text-gray-500">No upcoming sessions</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* All Sessions List */}
                    {!isLoading && filteredBookings.length > 0 && (
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold">All Sessions</CardTitle>
                                <CardDescription>
                                    {filteredBookings.length} session{filteredBookings.length !== 1 ? 's' : ''} found
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {filteredBookings.map((booking) => {
                                        const { date, time } = formatDate(booking.scheduled_at);
                                        return (
                                            <div key={booking.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                                                <div className="flex items-center space-x-4">
                                                    <div className="text-sm font-medium text-gray-900 w-24">
                                                        <div>{date}</div>
                                                        <div className="text-primary">{time}</div>
                                                    </div>
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage src={booking.patient_avatar} alt={booking.patient_name} />
                                                        <AvatarFallback className="bg-gray-100 text-gray-600 text-sm">
                                                            {booking.patient_name.split(' ').map(n => n[0]).join('')}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium text-gray-900">{booking.patient_name}</div>
                                                        <div className="text-xs text-gray-500">{booking.service_name} • {booking.duration} minutes</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    <div className="text-right">
                                                        <div className="text-sm font-medium text-gray-900">${booking.price}</div>
                                                        <Badge
                                                            variant="secondary"
                                                            className={booking.service_delivery_mode === 'online' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                                                        >
                                                            {booking.service_delivery_mode === 'online' ? 'Virtual' : 'In-Person'}
                                                        </Badge>
                                                    </div>
                                                    <Badge className={getStatusColor(booking.status)}>
                                                        {booking.status}
                                                    </Badge>
                                                    <Button size="sm" variant="outline">
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </main>
            </div>
        </div>
    );
};

export default TherapistBookings;
