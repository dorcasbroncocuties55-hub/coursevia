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
  Save,
  Upload,
  Camera,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Info
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface TherapistProfile {
  id: string;
  user_id: string;
  therapy_category: string;
  is_health_related: boolean;
  headline?: string;
  skills: string[];
  languages: string[];
  hourly_rate: number;
  is_active: boolean;
}

interface Profile {
  id: string;
  full_name: string;
  display_name?: string;
  avatar_url?: string;
  headline?: string;
  profession?: string;
  experience?: string;
  certification?: string;
  bio?: string;
  phone?: string;
  country?: string;
  city?: string;
  skills: string[];
  languages: string[];
  booking_price: number;
}
const TherapistSettings = () => {
  const { user, profile } = useAuth();
  const [therapistProfile, setTherapistProfile] = useState<TherapistProfile | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  // Form states
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    display_name: "",
    headline: "",
    profession: "",
    bio: "",
    phone: "",
    country: "",
    city: "",
    experience: "",
    certification: ""
  });

  const [therapyForm, setTherapyForm] = useState({
    therapy_category: "",
    skills: "",
    languages: "",
    hourly_rate: 0,
    booking_price: 0
  });

  const [notificationSettings, setNotificationSettings] = useState({
    email_bookings: true,
    email_messages: true,
    email_reminders: true,
    sms_bookings: false,
    sms_reminders: false
  });

  const [privacySettings, setPrivacySettings] = useState({
    profile_visible: true,
    show_phone: false,
    show_email: false,
    allow_messages: true
  });

  const therapyCategories = [
    { id: 'mental_health', name: 'Mental Health Therapy', requiresHipaa: true },
    { id: 'physical_therapy', name: 'Physical Therapy', requiresHipaa: true },
    { id: 'occupational_therapy', name: 'Occupational Therapy', requiresHipaa: true },
    { id: 'speech_therapy', name: 'Speech Therapy', requiresHipaa: true },
    { id: 'medical_therapy', name: 'Medical Therapy', requiresHipaa: true },
    { id: 'relationship_therapy', name: 'Relationship Therapy', requiresHipaa: false },
    { id: 'life_therapy', name: 'Life Therapy', requiresHipaa: false },
    { id: 'career_therapy', name: 'Career Therapy', requiresHipaa: false },
    { id: 'wellness_therapy', name: 'Wellness Therapy', requiresHipaa: false }
  ];

  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [user]);

  const loadProfileData = async () => {
    try {
      // Load user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      // Load therapist profile
      const { data: therapistData } = await supabase
        .from('therapist_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (profileData) {
        setUserProfile(profileData);
        setProfileForm({
          full_name: profileData.full_name || "",
          display_name: profileData.display_name || "",
          headline: profileData.headline || "",
          profession: profileData.profession || "",
          bio: profileData.bio || "",
          phone: profileData.phone || "",
          country: profileData.country || "",
          city: profileData.city || "",
          experience: profileData.experience || "",
          certification: profileData.certification || ""
        });
      }

      if (therapistData) {
        setTherapistProfile(therapistData);
        setTherapyForm({
          therapy_category: therapistData.therapy_category || "",
          skills: Array.isArray(therapistData.skills) ? therapistData.skills.join(", ") : "",
          languages: Array.isArray(therapistData.languages) ? therapistData.languages.join(", ") : "",
          hourly_rate: therapistData.hourly_rate || 0,
          booking_price: profileData?.booking_price || 0
        });
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      // Update user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name,
          display_name: profileForm.display_name,
          headline: profileForm.headline,
          profession: profileForm.profession,
          bio: profileForm.bio,
          phone: profileForm.phone,
          country: profileForm.country,
          city: profileForm.city,
          experience: profileForm.experience,
          certification: profileForm.certification,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);

      if (profileError) throw profileError;
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTherapySettings = async () => {
    setIsSaving(true);
    try {
      const skillsArray = therapyForm.skills.split(',').map(s => s.trim()).filter(Boolean);
      const languagesArray = therapyForm.languages.split(',').map(s => s.trim()).filter(Boolean);

      // Update therapist profile
      const { error: therapistError } = await supabase
        .from('therapist_profiles')
        .update({
          therapy_category: therapyForm.therapy_category,
          skills: skillsArray,
          languages: languagesArray,
          hourly_rate: therapyForm.hourly_rate,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);

      // Update booking price in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          booking_price: therapyForm.booking_price,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);

      if (therapistError) throw therapistError;
      if (profileError) throw profileError;

      toast.success('Therapy settings updated successfully');
      loadProfileData(); // Reload to get updated data
    } catch (error) {
      console.error('Error saving therapy settings:', error);
      toast.error('Failed to save therapy settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Signed out successfully');
  };

  const selectedCategory = therapyCategories.find(cat => cat.id === therapyForm.therapy_category);

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
            <Link to="/therapist/sessions" className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
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
            <Link to="/therapist/settings" className="flex items-center px-4 py-3 text-sm font-medium text-primary bg-primary/10 rounded-lg">
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
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600">Manage your account, practice settings, and preferences</p>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
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
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading settings...</p>
            </div>
          ) : (
            <div className="max-w-4xl">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6">
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="therapy">Therapy Settings</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                  <TabsTrigger value="privacy">Privacy</TabsTrigger>
                  <TabsTrigger value="security">Security</TabsTrigger>
                </TabsList>

                {/* Profile Tab */}
                <TabsContent value="profile">
                  <Card>
                    <CardHeader>
                      <CardTitle>Profile Information</CardTitle>
                      <CardDescription>
                        Update your personal information that clients will see on your profile
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Avatar Section */}
                      <div className="flex items-center space-x-6">
                        <Avatar className="h-24 w-24">
                          <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                          <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                            {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'T'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                          <Button variant="outline" size="sm">
                            <Camera className="h-4 w-4 mr-2" />
                            Change Photo
                          </Button>
                          <p className="text-xs text-gray-500">JPG, PNG or WEBP. Max size 5MB.</p>
                        </div>
                      </div>

                      {/* Basic Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="full_name">Full Name *</Label>
                          <Input
                            id="full_name"
                            value={profileForm.full_name}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                            placeholder="Dr. Jane Smith"
                          />
                        </div>
                        <div>
                          <Label htmlFor="display_name">Display Name</Label>
                          <Input
                            id="display_name"
                            value={profileForm.display_name}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, display_name: e.target.value }))}
                            placeholder="Dr. Jane"
                          />
                        </div>
                        <div>
                          <Label htmlFor="profession">Profession</Label>
                          <Input
                            id="profession"
                            value={profileForm.profession}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, profession: e.target.value }))}
                            placeholder="Clinical Psychologist"
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={profileForm.phone}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="+1 (555) 000-0000"
                          />
                        </div>
                        <div>
                          <Label htmlFor="country">Country</Label>
                          <Input
                            id="country"
                            value={profileForm.country}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, country: e.target.value }))}
                            placeholder="United States"
                          />
                        </div>
                        <div>
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            value={profileForm.city}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, city: e.target.value }))}
                            placeholder="New York"
                          />
                        </div>
                      </div>
                      {/* Professional Information */}
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="headline">Professional Headline *</Label>
                          <Input
                            id="headline"
                            value={profileForm.headline}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, headline: e.target.value }))}
                            placeholder="Licensed Clinical Psychologist specializing in anxiety and trauma"
                          />
                        </div>
                        <div>
                          <Label htmlFor="certification">Qualifications & Certifications</Label>
                          <Input
                            id="certification"
                            value={profileForm.certification}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, certification: e.target.value }))}
                            placeholder="PhD Psychology, Licensed Clinical Psychologist (LCP)"
                          />
                        </div>
                        <div>
                          <Label htmlFor="experience">Therapeutic Approach</Label>
                          <Textarea
                            id="experience"
                            value={profileForm.experience}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, experience: e.target.value }))}
                            placeholder="Describe your therapeutic approach and methodology..."
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label htmlFor="bio">About Me *</Label>
                          <Textarea
                            id="bio"
                            value={profileForm.bio}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                            placeholder="Write a professional bio that clients will read before booking..."
                            rows={4}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          onClick={handleSaveProfile}
                          disabled={isSaving}
                          className="bg-primary hover:bg-primary/90"
                        >
                          {isSaving ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Save Profile
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Therapy Settings Tab */}
                <TabsContent value="therapy">
                  <Card>
                    <CardHeader>
                      <CardTitle>Therapy Practice Settings</CardTitle>
                      <CardDescription>
                        Configure your therapy category, specialties, and pricing
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Therapy Category */}
                      <div>
                        <Label htmlFor="therapy_category">Therapy Category *</Label>
                        <Select
                          value={therapyForm.therapy_category}
                          onValueChange={(value) => setTherapyForm(prev => ({ ...prev, therapy_category: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select your therapy category" />
                          </SelectTrigger>
                          <SelectContent>
                            {therapyCategories.map(category => (
                              <SelectItem key={category.id} value={category.id}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{category.name}</span>
                                  {category.requiresHipaa && (
                                    <Badge className="ml-2 bg-green-100 text-green-800 text-xs">HIPAA</Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedCategory?.requiresHipaa && (
                          <Alert className="mt-2 border-green-200">
                            <Lock className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                              <strong>HIPAA Compliance:</strong> This category requires HIPAA-compliant messaging and documentation for patient privacy protection.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                      {/* Skills and Languages */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="skills">Specialties & Skills</Label>
                          <Textarea
                            id="skills"
                            value={therapyForm.skills}
                            onChange={(e) => setTherapyForm(prev => ({ ...prev, skills: e.target.value }))}
                            placeholder="Anxiety, Depression, Trauma, CBT, EMDR (comma separated)"
                            rows={3}
                          />
                          <p className="text-xs text-gray-500 mt-1">Separate multiple skills with commas</p>
                        </div>
                        <div>
                          <Label htmlFor="languages">Languages</Label>
                          <Textarea
                            id="languages"
                            value={therapyForm.languages}
                            onChange={(e) => setTherapyForm(prev => ({ ...prev, languages: e.target.value }))}
                            placeholder="English, Spanish, French (comma separated)"
                            rows={3}
                          />
                          <p className="text-xs text-gray-500 mt-1">Separate multiple languages with commas</p>
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="hourly_rate">Hourly Rate (USD)</Label>
                          <Input
                            id="hourly_rate"
                            type="number"
                            min="0"
                            step="0.01"
                            value={therapyForm.hourly_rate}
                            onChange={(e) => setTherapyForm(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 0 }))}
                            placeholder="100.00"
                          />
                          <p className="text-xs text-gray-500 mt-1">Your standard hourly consultation rate</p>
                        </div>
                        <div>
                          <Label htmlFor="booking_price">Session Price (USD)</Label>
                          <Input
                            id="booking_price"
                            type="number"
                            min="6"
                            step="0.01"
                            value={therapyForm.booking_price}
                            onChange={(e) => setTherapyForm(prev => ({ ...prev, booking_price: parseFloat(e.target.value) || 0 }))}
                            placeholder="120.00"
                          />
                          <p className="text-xs text-gray-500 mt-1">Price clients pay to book a session (minimum $6)</p>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          onClick={handleSaveTherapySettings}
                          disabled={isSaving}
                          className="bg-primary hover:bg-primary/90"
                        >
                          {isSaving ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Save Therapy Settings
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Notifications Tab */}
                <TabsContent value="notifications">
                  <Card>
                    <CardHeader>
                      <CardTitle>Notification Preferences</CardTitle>
                      <CardDescription>
                        Manage how you receive notifications about bookings, messages, and reminders
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Email - New Bookings</Label>
                            <p className="text-sm text-gray-500">Get notified when someone books a session</p>
                          </div>
                          <Switch
                            checked={notificationSettings.email_bookings}
                            onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, email_bookings: checked }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Email - New Messages</Label>
                            <p className="text-sm text-gray-500">Get notified when you receive a new message</p>
                          </div>
                          <Switch
                            checked={notificationSettings.email_messages}
                            onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, email_messages: checked }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Email - Session Reminders</Label>
                            <p className="text-sm text-gray-500">Receive reminders before scheduled sessions</p>
                          </div>
                          <Switch
                            checked={notificationSettings.email_reminders}
                            onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, email_reminders: checked }))}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                {/* Privacy Tab */}
                <TabsContent value="privacy">
                  <Card>
                    <CardHeader>
                      <CardTitle>Privacy Settings</CardTitle>
                      <CardDescription>
                        Control your profile visibility and what information is shared publicly
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Profile Visibility</Label>
                            <p className="text-sm text-gray-500">Make your profile visible to potential clients</p>
                          </div>
                          <Switch
                            checked={privacySettings.profile_visible}
                            onCheckedChange={(checked) => setPrivacySettings(prev => ({ ...prev, profile_visible: checked }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Show Phone Number</Label>
                            <p className="text-sm text-gray-500">Display your phone number on your public profile</p>
                          </div>
                          <Switch
                            checked={privacySettings.show_phone}
                            onCheckedChange={(checked) => setPrivacySettings(prev => ({ ...prev, show_phone: checked }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Allow Direct Messages</Label>
                            <p className="text-sm text-gray-500">Let clients send you direct messages</p>
                          </div>
                          <Switch
                            checked={privacySettings.allow_messages}
                            onCheckedChange={(checked) => setPrivacySettings(prev => ({ ...prev, allow_messages: checked }))}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Security Tab */}
                <TabsContent value="security">
                  <Card>
                    <CardHeader>
                      <CardTitle>Security Settings</CardTitle>
                      <CardDescription>
                        Manage your account security and authentication preferences
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <Label>Current Email</Label>
                          <Input value={user?.email || ""} disabled className="bg-gray-50" />
                          <p className="text-xs text-gray-500 mt-1">Contact support to change your email address</p>
                        </div>

                        <div className="space-y-2">
                          <Button variant="outline" className="w-full justify-start">
                            <Lock className="h-4 w-4 mr-2" />
                            Change Password
                          </Button>
                          <Button variant="outline" className="w-full justify-start">
                            <Shield className="h-4 w-4 mr-2" />
                            Enable Two-Factor Authentication
                          </Button>
                        </div>

                        {therapistProfile?.is_health_related && (
                          <Alert className="border-green-200">
                            <Shield className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                              <strong>Enhanced Security:</strong> Your account has enhanced security features enabled due to HIPAA compliance requirements for health-related therapy services.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default TherapistSettings;