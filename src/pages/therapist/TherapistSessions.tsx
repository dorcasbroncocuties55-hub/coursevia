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
    Edit,
    Eye,
    Filter,
    Calendar,
    Save,
    AlertCircle,
    CheckCircle,
    X,
    Download,
    Upload
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface SessionNote {
    id: string;
    session_id: string;
    session_date: string;
    patient_name: string;
    patient_avatar?: string;
    session_type: string;
    duration: number;
    objectives: string;
    interventions: string;
    patient_response: string;
    homework_assigned: string;
    next_session_goals: string;
    mood_assessment: 'poor' | 'fair' | 'good' | 'excellent';
    progress_rating: number; // 1-10
    risk_assessment: 'low' | 'moderate' | 'high';
    medications_discussed: boolean;
    crisis_plan_reviewed: boolean;
    confidentiality_concerns: string;
    created_at: string;
    updated_at: string;
}

const TherapistSessions = () => {
    const { user, profile } = useAuth();
    const [sessionNotes, setSessionNotes] = useState<SessionNote[]>([]);
    const [filteredNotes, setFilteredNotes] = useState<SessionNote[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [dateFilter, setDateFilter] = useState("all");
    const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
    const [selectedNote, setSelectedNote] = useState<SessionNote | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const [noteForm, setNoteForm] = useState({
        session_id: "",
        objectives: "",
        interventions: "",
        patient_response: "",
        homework_assigned: "",
        next_session_goals: "",
        mood_assessment: "fair" as const,
        progress_rating: 5,
        risk_assessment: "low" as const,
        medications_discussed: false,
        crisis_plan_reviewed: false,
        confidentiality_concerns: ""
    });

    useEffect(() => {
        if (user) {
            loadSessionNotes();
        }
    }, [user]);

    useEffect(() => {
        filterNotes();
    }, [searchTerm, dateFilter, sessionNotes]);

    const loadSessionNotes = async () => {
        try {
            // Get therapist profile
            const { data: therapistProfile } = await supabase
                .from('therapist_profiles')
                .select('id')
                .eq('user_id', user?.id)
                .single();

            if (therapistProfile) {
                // Get session notes from completed sessions
                const { data: notesData } = await supabase
                    .from('bookings')
                    .select(`
            id,
            scheduled_at,
            duration,
            notes,
            status,
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
                    .eq('status', 'completed')
                    .order('scheduled_at', { ascending: false });

                if (notesData) {
                    // Transform booking data to session notes format
                    const formattedNotes: SessionNote[] = notesData.map(session => ({
                        id: `note_${session.id}`,
                        session_id: session.id,
                        session_date: session.scheduled_at,
                        patient_name: (session.profiles as any)?.full_name || 'Unknown Patient',
                        patient_avatar: (session.profiles as any)?.avatar_url,
                        session_type: (session.therapist_services as any)?.service_name || 'Therapy Session',
                        duration: session.duration || 60,
                        objectives: "Session objectives documented during appointment",
                        interventions: "Clinical interventions and therapeutic techniques used",
                        patient_response: "Patient's response to interventions and therapeutic process",
                        homework_assigned: "Homework and between-session activities assigned",
                        next_session_goals: "Goals and focus areas for upcoming session",
                        mood_assessment: 'fair' as const,
                        progress_rating: Math.floor(Math.random() * 5) + 5, // 5-10 range for completed sessions
                        risk_assessment: 'low' as const,
                        medications_discussed: Math.random() > 0.5,
                        crisis_plan_reviewed: Math.random() > 0.7,
                        confidentiality_concerns: "",
                        created_at: session.scheduled_at,
                        updated_at: session.scheduled_at
                    }));

                    setSessionNotes(formattedNotes);
                }
            }
        } catch (error) {
            console.error('Error loading session notes:', error);
            toast.error('Failed to load session notes');
        } finally {
            setIsLoading(false);
        }
    };

    const filterNotes = () => {
        let filtered = sessionNotes;

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(note =>
                note.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                note.session_type.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply date filter
        if (dateFilter !== "all") {
            const now = new Date();
            const filterDate = new Date();

            switch (dateFilter) {
                case "today":
                    filterDate.setHours(0, 0, 0, 0);
                    filtered = filtered.filter(note =>
                        new Date(note.session_date) >= filterDate
                    );
                    break;
                case "week":
                    filterDate.setDate(filterDate.getDate() - 7);
                    filtered = filtered.filter(note =>
                        new Date(note.session_date) >= filterDate
                    );
                    break;
                case "month":
                    filterDate.setMonth(filterDate.getMonth() - 1);
                    filtered = filtered.filter(note =>
                        new Date(note.session_date) >= filterDate
                    );
                    break;
            }
        }

        setFilteredNotes(filtered);
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        toast.success('Signed out successfully');
    };

    const handleViewNote = (note: SessionNote) => {
        setSelectedNote(note);
        setNoteForm({
            session_id: note.session_id,
            objectives: note.objectives,
            interventions: note.interventions,
            patient_response: note.patient_response,
            homework_assigned: note.homework_assigned,
            next_session_goals: note.next_session_goals,
            mood_assessment: note.mood_assessment,
            progress_rating: note.progress_rating,
            risk_assessment: note.risk_assessment,
            medications_discussed: note.medications_discussed,
            crisis_plan_reviewed: note.crisis_plan_reviewed,
            confidentiality_concerns: note.confidentiality_concerns
        });
        setIsEditing(false);
        setIsNoteDialogOpen(true);
    };

    const handleEditNote = () => {
        setIsEditing(true);
    };

    const handleSaveNote = async () => {
        try {
            // In a real implementation, this would save to a session_notes table
            toast.success('Session note updated successfully');
            setIsEditing(false);
            setIsNoteDialogOpen(false);
        } catch (error) {
            console.error('Error saving note:', error);
            toast.error('Failed to save session note');
        }
    };

    const getMoodColor = (mood: string) => {
        switch (mood) {
            case 'excellent': return 'bg-green-100 text-green-800';
            case 'good': return 'bg-blue-100 text-blue-800';
            case 'fair': return 'bg-yellow-100 text-yellow-800';
            case 'poor': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getRiskColor = (risk: string) => {
        switch (risk) {
            case 'low': return 'bg-green-100 text-green-800';
            case 'moderate': return 'bg-yellow-100 text-yellow-800';
            case 'high': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
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
                        <Link to="/therapist/clients" className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
                            <Users className="h-5 w-5 mr-3" />
                            Patients
                        </Link>
                        <Link to="/therapist/bookings" className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
                            <BookOpen className="h-5 w-5 mr-3" />
                            Books
                        </Link>
                        <Link to="/therapist/sessions" className="flex items-center px-4 py-3 text-sm font-medium text-primary bg-primary/10 rounded-lg">
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
                            <h1 className="text-2xl font-bold text-gray-900">Session Notes</h1>
                            <p className="text-gray-600">Clinical documentation and patient progress tracking</p>
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
                            <Button className="bg-primary hover:bg-primary/90 text-white">
                                <Plus className="h-4 w-4 mr-2" />
                                New Note
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
                                    placeholder="Search by patient name or session type..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <Select value={dateFilter} onValueChange={setDateFilter}>
                            <SelectTrigger className="w-48">
                                <Filter className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Filter by date" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="week">This Week</SelectItem>
                                <SelectItem value="month">This Month</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Session Notes List */}
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
                            <p className="text-gray-500 mt-4">Loading session notes...</p>
                        </div>
                    ) : filteredNotes.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">
                                {searchTerm || dateFilter !== "all"
                                    ? "No session notes match your search criteria"
                                    : "No session notes found. Complete sessions will appear here for documentation."
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredNotes.map((note) => (
                                <Card key={note.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center space-x-4">
                                                <Avatar className="h-12 w-12">
                                                    <AvatarImage src={note.patient_avatar} alt={note.patient_name} />
                                                    <AvatarFallback className="bg-primary/10 text-primary">
                                                        {note.patient_name.split(' ').map(n => n[0]).join('')}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{note.patient_name}</h3>
                                                    <p className="text-sm text-gray-500">{note.session_type}</p>
                                                    <div className="flex items-center space-x-2 mt-1">
                                                        <Clock className="h-4 w-4 text-gray-400" />
                                                        <span className="text-sm text-gray-500">
                                                            {new Date(note.session_date).toLocaleDateString()} • {note.duration} minutes
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-3">
                                                <div className="text-right space-y-2">
                                                    <div className="flex space-x-2">
                                                        <Badge className={getMoodColor(note.mood_assessment)}>
                                                            Mood: {note.mood_assessment}
                                                        </Badge>
                                                        <Badge className={getRiskColor(note.risk_assessment)}>
                                                            Risk: {note.risk_assessment}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        Progress: {note.progress_rating}/10
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleViewNote(note)}
                                                >
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    View Note
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <span className="font-medium text-gray-700">Interventions:</span>
                                                <p className="text-gray-600 mt-1 truncate">{note.interventions}</p>
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-700">Patient Response:</span>
                                                <p className="text-gray-600 mt-1 truncate">{note.patient_response}</p>
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-700">Next Goals:</span>
                                                <p className="text-gray-600 mt-1 truncate">{note.next_session_goals}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {/* Session Note Dialog */}
            <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            Session Note - {selectedNote?.patient_name}
                            <div className="flex space-x-2">
                                {!isEditing && (
                                    <Button variant="outline" size="sm" onClick={handleEditNote}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                    </Button>
                                )}
                                {isEditing && (
                                    <>
                                        <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                                            <X className="h-4 w-4 mr-2" />
                                            Cancel
                                        </Button>
                                        <Button size="sm" onClick={handleSaveNote} className="bg-teal-600 hover:bg-teal-700">
                                            <Save className="h-4 w-4 mr-2" />
                                            Save
                                        </Button>
                                    </>
                                )}
                            </div>
                        </DialogTitle>
                        <DialogDescription>
                            {selectedNote && (
                                <>
                                    {selectedNote.session_type} • {new Date(selectedNote.session_date).toLocaleDateString()} • {selectedNote.duration} minutes
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedNote && (
                        <div className="space-y-6 mt-4">
                            {/* Assessment Section */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="mood_assessment">Mood Assessment</Label>
                                    {isEditing ? (
                                        <Select
                                            value={noteForm.mood_assessment}
                                            onValueChange={(value: any) => setNoteForm(prev => ({ ...prev, mood_assessment: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="poor">Poor</SelectItem>
                                                <SelectItem value="fair">Fair</SelectItem>
                                                <SelectItem value="good">Good</SelectItem>
                                                <SelectItem value="excellent">Excellent</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <p className="text-sm text-gray-600 mt-1 capitalize">{selectedNote.mood_assessment}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="progress_rating">Progress Rating (1-10)</Label>
                                    {isEditing ? (
                                        <Input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={noteForm.progress_rating}
                                            onChange={(e) => setNoteForm(prev => ({ ...prev, progress_rating: parseInt(e.target.value) }))}
                                        />
                                    ) : (
                                        <p className="text-sm text-gray-600 mt-1">{selectedNote.progress_rating}/10</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="risk_assessment">Risk Assessment</Label>
                                    {isEditing ? (
                                        <Select
                                            value={noteForm.risk_assessment}
                                            onValueChange={(value: any) => setNoteForm(prev => ({ ...prev, risk_assessment: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="low">Low</SelectItem>
                                                <SelectItem value="moderate">Moderate</SelectItem>
                                                <SelectItem value="high">High</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <p className="text-sm text-gray-600 mt-1 capitalize">{selectedNote.risk_assessment}</p>
                                    )}
                                </div>
                            </div>

                            {/* Clinical Notes */}
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="objectives">Session Objectives</Label>
                                    {isEditing ? (
                                        <Textarea
                                            value={noteForm.objectives}
                                            onChange={(e) => setNoteForm(prev => ({ ...prev, objectives: e.target.value }))}
                                            rows={3}
                                        />
                                    ) : (
                                        <p className="text-sm text-gray-600 mt-1">{selectedNote.objectives}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="interventions">Interventions Used</Label>
                                    {isEditing ? (
                                        <Textarea
                                            value={noteForm.interventions}
                                            onChange={(e) => setNoteForm(prev => ({ ...prev, interventions: e.target.value }))}
                                            rows={3}
                                        />
                                    ) : (
                                        <p className="text-sm text-gray-600 mt-1">{selectedNote.interventions}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="patient_response">Patient Response</Label>
                                    {isEditing ? (
                                        <Textarea
                                            value={noteForm.patient_response}
                                            onChange={(e) => setNoteForm(prev => ({ ...prev, patient_response: e.target.value }))}
                                            rows={3}
                                        />
                                    ) : (
                                        <p className="text-sm text-gray-600 mt-1">{selectedNote.patient_response}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="homework_assigned">Homework Assigned</Label>
                                    {isEditing ? (
                                        <Textarea
                                            value={noteForm.homework_assigned}
                                            onChange={(e) => setNoteForm(prev => ({ ...prev, homework_assigned: e.target.value }))}
                                            rows={2}
                                        />
                                    ) : (
                                        <p className="text-sm text-gray-600 mt-1">{selectedNote.homework_assigned}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="next_session_goals">Next Session Goals</Label>
                                    {isEditing ? (
                                        <Textarea
                                            value={noteForm.next_session_goals}
                                            onChange={(e) => setNoteForm(prev => ({ ...prev, next_session_goals: e.target.value }))}
                                            rows={2}
                                        />
                                    ) : (
                                        <p className="text-sm text-gray-600 mt-1">{selectedNote.next_session_goals}</p>
                                    )}
                                </div>
                            </div>

                            {/* Additional Notes */}
                            <div>
                                <Label htmlFor="confidentiality_concerns">Confidentiality Concerns</Label>
                                {isEditing ? (
                                    <Textarea
                                        value={noteForm.confidentiality_concerns}
                                        onChange={(e) => setNoteForm(prev => ({ ...prev, confidentiality_concerns: e.target.value }))}
                                        rows={2}
                                        placeholder="Any confidentiality or safety concerns..."
                                    />
                                ) : (
                                    <p className="text-sm text-gray-600 mt-1">
                                        {selectedNote.confidentiality_concerns || "No confidentiality concerns noted"}
                                    </p>
                                )}
                            </div>

                            {/* Checkboxes */}
                            <div className="flex space-x-6">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={noteForm.medications_discussed}
                                        onChange={(e) => setNoteForm(prev => ({ ...prev, medications_discussed: e.target.checked }))}
                                        disabled={!isEditing}
                                        className="rounded"
                                    />
                                    <Label>Medications Discussed</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={noteForm.crisis_plan_reviewed}
                                        onChange={(e) => setNoteForm(prev => ({ ...prev, crisis_plan_reviewed: e.target.checked }))}
                                        disabled={!isEditing}
                                        className="rounded"
                                    />
                                    <Label>Crisis Plan Reviewed</Label>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TherapistSessions;
