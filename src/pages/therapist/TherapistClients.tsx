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
    Mail,
    Phone,
    Calendar,
    MoreVertical,
    Filter,
    Download
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Patient {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    phone?: string;
    total_sessions: number;
    last_session: string | null;
    next_session: string | null;
    status: 'active' | 'inactive' | 'pending';
    created_at: string;
}

const TherapistClients = () => {
    const { user, profile } = useAuth();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {
        if (user) {
            loadPatients();
        }
    }, [user]);

    useEffect(() => {
        filterPatients();
    }, [searchTerm, statusFilter, patients]);

    const loadPatients = async () => {
        try {
            // Get therapist profile
            const { data: therapistProfile } = await supabase
                .from('therapist_profiles')
                .select('id')
                .eq('user_id', user?.id)
                .single();

            if (therapistProfile) {
                // Get unique patients from bookings
                const { data: bookingsData } = await supabase
                    .from('bookings')
                    .select(`
            learner_id,
            created_at,
            scheduled_at,
            status,
            profiles!bookings_learner_id_fkey(
              id,
              full_name,
              email,
              avatar_url,
              phone
            )
          `)
                    .eq('therapist_id', therapistProfile.id)
                    .order('created_at', { ascending: false });

                if (bookingsData) {
                    // Group bookings by patient
                    const patientMap = new Map();

                    bookingsData.forEach(booking => {
                        const patientId = booking.learner_id;
                        const profile = booking.profiles as any;

                        if (!patientMap.has(patientId) && profile) {
                            patientMap.set(patientId, {
                                id: patientId,
                                full_name: profile.full_name || 'Unknown Patient',
                                email: profile.email || '',
                                avatar_url: profile.avatar_url,
                                phone: profile.phone,
                                total_sessions: 0,
                                last_session: null,
                                next_session: null,
                                status: 'active' as const,
                                created_at: booking.created_at,
                                sessions: []
                            });
                        }

                        if (patientMap.has(patientId)) {
                            const patient = patientMap.get(patientId);
                            patient.sessions.push(booking);

                            if (booking.status === 'completed') {
                                patient.total_sessions++;
                            }

                            // Find last completed session
                            if (booking.status === 'completed' && booking.scheduled_at) {
                                if (!patient.last_session || new Date(booking.scheduled_at) > new Date(patient.last_session)) {
                                    patient.last_session = booking.scheduled_at;
                                }
                            }

                            // Find next upcoming session
                            if (booking.status === 'confirmed' && booking.scheduled_at) {
                                const sessionDate = new Date(booking.scheduled_at);
                                const now = new Date();
                                if (sessionDate > now) {
                                    if (!patient.next_session || sessionDate < new Date(patient.next_session)) {
                                        patient.next_session = booking.scheduled_at;
                                    }
                                }
                            }
                        }
                    });

                    // Convert to array and determine status
                    const patientsArray: Patient[] = Array.from(patientMap.values()).map(patient => {
                        // Determine status based on recent activity
                        const hasUpcoming = patient.next_session !== null;
                        const lastSessionDate = patient.last_session ? new Date(patient.last_session) : null;
                        const daysSinceLastSession = lastSessionDate
                            ? Math.floor((new Date().getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24))
                            : null;

                        let status: 'active' | 'inactive' | 'pending' = 'pending';
                        if (patient.total_sessions > 0) {
                            status = hasUpcoming || (daysSinceLastSession !== null && daysSinceLastSession <= 30) ? 'active' : 'inactive';
                        }

                        return {
                            ...patient,
                            status
                        };
                    });

                    setPatients(patientsArray);
                }
            }
        } catch (error) {
            console.error('Error loading patients:', error);
            toast.error('Failed to load patients');
        } finally {
            setIsLoading(false);
        }
    };

    const filterPatients = () => {
        let filtered = patients;

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(patient =>
                patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                patient.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply status filter
        if (statusFilter !== "all") {
            filtered = filtered.filter(patient => patient.status === statusFilter);
        }

        setFilteredPatients(filtered);
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        toast.success('Signed out successfully');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'inactive': return 'bg-gray-100 text-gray-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString();
    };

    if (!user) {
        return <Navigate to="/auth" replace />;
    }

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
                        <Link to="/therapist/clients" className="flex items-center px-4 py-3 text-sm font-medium text-primary bg-primary/10 rounded-lg">
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
                <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        {/* Page Title */}
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
                            <p className="text-gray-600">Manage your patient directory and track treatment progress</p>
                        </div>

                        {/* Header Actions */}
                        <div className="flex items-center space-x-4">
                            <Button variant="ghost" size="sm">
                                <Bell className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" className="text-gray-600">
                                <Download className="h-4 w-4 mr-2" />
                                Export
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
                    {/* Filters and Search */}
                    <div className="mb-6 flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search patients by name or email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-48">
                                <Filter className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Patients Grid */}
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                            <p className="text-gray-500 mt-4">Loading patients...</p>
                        </div>
                    ) : filteredPatients.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">
                                {searchTerm || statusFilter !== "all"
                                    ? "No patients match your search criteria"
                                    : "No patients found. Start by booking sessions with learners."
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredPatients.map((patient) => (
                                <Card key={patient.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center space-x-3">
                                                <Avatar className="h-12 w-12">
                                                    <AvatarImage src={patient.avatar_url} alt={patient.full_name} />
                                                    <AvatarFallback className="bg-primary/10 text-primary">
                                                        {patient.full_name.split(' ').map(n => n[0]).join('')}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{patient.full_name}</h3>
                                                    <p className="text-sm text-gray-500">{patient.email}</p>
                                                </div>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem>
                                                        <User className="h-4 w-4 mr-2" />
                                                        View Profile
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <Calendar className="h-4 w-4 mr-2" />
                                                        Schedule Session
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <MessageSquare className="h-4 w-4 mr-2" />
                                                        Send Message
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-500">Status</span>
                                                <Badge className={getStatusColor(patient.status)}>
                                                    {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                                                </Badge>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-500">Total Sessions</span>
                                                <span className="text-sm font-medium">{patient.total_sessions}</span>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-500">Last Session</span>
                                                <span className="text-sm font-medium">{formatDate(patient.last_session)}</span>
                                            </div>

                                            {patient.next_session && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-500">Next Session</span>
                                                    <span className="text-sm font-medium text-primary">{formatDate(patient.next_session)}</span>
                                                </div>
                                            )}

                                            {patient.phone && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-500">Phone</span>
                                                    <span className="text-sm font-medium">{patient.phone}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-gray-200 flex space-x-2">
                                            <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90">
                                                <Calendar className="h-4 w-4 mr-2" />
                                                Schedule
                                            </Button>
                                            <Button size="sm" variant="outline" className="flex-1">
                                                <MessageSquare className="h-4 w-4 mr-2" />
                                                Message
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default TherapistClients;
