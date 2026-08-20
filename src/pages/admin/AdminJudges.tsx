import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Gavel, Search, CheckCircle, XCircle, Clock, Mail, Phone, User, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

interface Judge {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  country?: string;
  state?: string;
  specialization?: string;
  bar_number?: string;
  years_experience?: number;
  rank: string;
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  cases_handled: number;
  success_rate: number;
  created_at: string;
}

const AdminJudges = () => {
  const [judges, setJudges] = useState<Judge[]>([]);
  const [filteredJudges, setFilteredJudges] = useState<Judge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedJudge, setSelectedJudge] = useState<Judge | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchJudges();
  }, []);

  useEffect(() => {
    filterJudges();
  }, [judges, searchTerm, statusFilter]);

  const fetchJudges = async () => {
    try {
      const { data, error } = await supabase
        .from('judges')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setJudges(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch judges: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filterJudges = () => {
    let filtered = judges;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(judge =>
        judge.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        judge.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (judge.bar_number && judge.bar_number.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(judge => judge.status === statusFilter);
    }

    setFilteredJudges(filtered);
  };

  const updateJudgeStatus = async (judgeId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('judges')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', judgeId);

      if (error) throw error;

      // Update local state
      setJudges(prev => prev.map(judge => 
        judge.id === judgeId 
          ? { ...judge, status: newStatus as any }
          : judge
      ));

      toast.success(`Judge ${newStatus === 'active' ? 'approved' : newStatus} successfully`);
      
      // Send email notification (you can implement this later)
      if (newStatus === 'active') {
        toast.info('Approval email sent to judge');
      }
      
    } catch (error: any) {
      toast.error('Failed to update judge status: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'rejected': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'suspended': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-gray-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const pendingCount = judges.filter(j => j.status === 'pending').length;
  const activeCount = judges.filter(j => j.status === 'active').length;
  const suspendedCount = judges.filter(j => j.status === 'suspended').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Gavel className="h-12 w-12 text-purple-600 mx-auto mb-4 animate-bounce" />
          <p className="text-gray-600">Loading judges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Judge Management</h1>
          <p className="text-gray-600">Manage judge applications and portal access</p>
        </div>
        <div className="flex items-center gap-2">
          <Gavel className="h-8 w-8 text-purple-600" />
          <span className="font-semibold text-purple-600">Admin Portal</span>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Judges</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{suspendedCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Judges</CardTitle>
            <Gavel className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{judges.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Judge Applications</CardTitle>
          <CardDescription>
            Review and manage judge portal applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search judges by name, email, or bar number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Judges Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Judge</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cases</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJudges.map((judge) => (
                  <TableRow key={judge.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{judge.full_name}</div>
                        <div className="text-sm text-gray-600">{judge.email}</div>
                        {judge.bar_number && (
                          <div className="text-xs text-gray-500">Bar: {judge.bar_number}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {judge.phone_number && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {judge.phone_number}
                          </div>
                        )}
                        {(judge.country || judge.state) && (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            {[judge.state, judge.country].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        {judge.years_experience && (
                          <div className="text-sm">{judge.years_experience} years</div>
                        )}
                        {judge.specialization && (
                          <div className="text-xs text-gray-600 capitalize">{judge.specialization}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(judge.status)}
                        <Badge className={getStatusColor(judge.status)}>
                          {judge.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm font-medium">{judge.cases_handled} cases</div>
                        <div className="text-xs text-gray-600">
                          {judge.success_rate}% success rate
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {judge.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => updateJudgeStatus(judge.id, 'active')}
                              disabled={isUpdating}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateJudgeStatus(judge.id, 'rejected')}
                              disabled={isUpdating}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {judge.status === 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateJudgeStatus(judge.id, 'suspended')}
                            disabled={isUpdating}
                          >
                            Suspend
                          </Button>
                        )}
                        {judge.status === 'suspended' && (
                          <Button
                            size="sm"
                            onClick={() => updateJudgeStatus(judge.id, 'active')}
                            disabled={isUpdating}
                          >
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredJudges.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No judges found matching the current filters.
            </div>
          )}
        </CardContent>
      </Card>

      {pendingCount > 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            You have {pendingCount} pending judge application{pendingCount !== 1 ? 's' : ''} waiting for review.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default AdminJudges;