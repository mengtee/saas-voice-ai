'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/Layout/MainLayout';
import { useAppStore } from '@/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Calendar, Clock, Plus, Users, ChevronLeft, ChevronRight, Loader2, RefreshCw, X } from 'lucide-react';
import { apiClient } from '@/services/api';
import { Appointment } from '@/types';

interface CalendarStats {
  todayAppointments: number;
  thisWeekAppointments: number;
  showRate: number;
  avgDuration: number;
  todayStats: {
    confirmed: number;
    pending: number;
    cancelled: number;
  };
}

export default function CalendarPage() {
  const { setCurrentPage } = useAppStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<CalendarStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Add appointment form state
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    title: '',
    attendeeName: '',
    attendeeEmail: '',
    attendeeTimeZone: 'UTC',
    start: '',
    end: '',
    description: '',
    location: '',
    eventTypeId: '1' // default event type
  });

  const loadData = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      // Load appointments and stats in parallel
      const [appointmentsResponse, statsResponse] = await Promise.all([
        apiClient.getAppointments(20, 0), // Get first 20 appointments
        apiClient.getCalendarStats()
      ]);

      if (appointmentsResponse.success && appointmentsResponse.data) {
        setAppointments(appointmentsResponse.data.appointments || []);
      }

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await apiClient.bookAppointment({
        eventTypeId: appointmentForm.eventTypeId,
        start: appointmentForm.start,
        end: appointmentForm.end,
        attendeeName: appointmentForm.attendeeName,
        attendeeEmail: appointmentForm.attendeeEmail,
        attendeeTimeZone: appointmentForm.attendeeTimeZone,
        title: appointmentForm.title,
        description: appointmentForm.description,
        location: appointmentForm.location
      });

      if (response.success) {
        // Reset form and close sheet
        setAppointmentForm({
          title: '',
          attendeeName: '',
          attendeeEmail: '',
          attendeeTimeZone: 'UTC',
          start: '',
          end: '',
          description: '',
          location: '',
          eventTypeId: '1'
        });
        setIsSheetOpen(false);
        
        // Reload data to show new appointment
        await loadData(false);
      } else {
        console.error('Failed to create appointment:', response.error);
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setAppointmentForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  useEffect(() => {
    setCurrentPage('calendar');
    loadData();
  }, [setCurrentPage]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadData(false);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Filter today's appointments
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const todayAppointments = appointments.filter(apt => 
    apt.start_time?.startsWith(todayStr)
  ).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  // Filter upcoming appointments (next 7 days, excluding today)
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.start_time);
    return aptDate > today && aptDate <= nextWeek && !apt.start_time?.startsWith(todayStr);
  }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (dateTime: string) => {
    const date = new Date(dateTime);
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getStatusColor = (status: string, bookingStatus: string) => {
    if (status === 'confirmed') return 'bg-green-100 text-green-800';
    if (status === 'cancelled') return 'bg-red-100 text-red-800';
    if (bookingStatus === 'pending') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  // Calendar navigation functions
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Get calendar data
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    // First day of the calendar (might be from previous month)
    const calendarStart = new Date(firstDay);
    calendarStart.setDate(firstDay.getDate() - firstDay.getDay());
    
    const days = [];
    const today = new Date();
    
    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      const date = new Date(calendarStart);
      date.setDate(calendarStart.getDate() + i);
      
      const isCurrentMonth = date.getMonth() === month;
      const isToday = date.toDateString() === today.toDateString();
      const dateStr = date.toISOString().split('T')[0];
      
      // Count appointments for this date
      const dayAppointments = appointments.filter(apt => 
        apt.start_time?.startsWith(dateStr)
      );
      
      days.push({
        date: date.getDate(),
        fullDate: date,
        isCurrentMonth,
        isToday,
        appointmentCount: dayAppointments.length,
        appointments: dayAppointments
      });
    }
    
    return days;
  };

  const getMonthYearDisplay = () => {
    return currentMonth.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="mt-2 text-muted-foreground">Loading calendar data...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div>
            <p className="text-muted-foreground">
              Manage appointments scheduled by your AI agents
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => loadData(false)} disabled={refreshing}>
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Appointment
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle>Create New Appointment</SheetTitle>
                  <SheetDescription>
                    Schedule a new appointment with your client or prospect.
                  </SheetDescription>
                </SheetHeader>
                
                <form onSubmit={handleCreateAppointment} className="space-y-4 mt-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Appointment Title</Label>
                    <Input
                      id="title"
                      value={appointmentForm.title}
                      onChange={(e) => handleFormChange('title', e.target.value)}
                      placeholder="e.g., Product Demo Call"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="attendeeName">Attendee Name</Label>
                      <Input
                        id="attendeeName"
                        value={appointmentForm.attendeeName}
                        onChange={(e) => handleFormChange('attendeeName', e.target.value)}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="attendeeEmail">Attendee Email</Label>
                      <Input
                        id="attendeeEmail"
                        type="email"
                        value={appointmentForm.attendeeEmail}
                        onChange={(e) => handleFormChange('attendeeEmail', e.target.value)}
                        placeholder="john@company.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start">Start Date & Time</Label>
                      <Input
                        id="start"
                        type="datetime-local"
                        value={appointmentForm.start}
                        onChange={(e) => handleFormChange('start', e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end">End Date & Time</Label>
                      <Input
                        id="end"
                        type="datetime-local"
                        value={appointmentForm.end}
                        onChange={(e) => handleFormChange('end', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Select value={appointmentForm.location} onValueChange={(value) => handleFormChange('location', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Google Meet">Google Meet</SelectItem>
                        <SelectItem value="Zoom Meeting">Zoom Meeting</SelectItem>
                        <SelectItem value="Microsoft Teams">Microsoft Teams</SelectItem>
                        <SelectItem value="Phone Call">Phone Call</SelectItem>
                        <SelectItem value="In Person">In Person</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={appointmentForm.attendeeTimeZone} onValueChange={(value) => handleFormChange('attendeeTimeZone', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="Asia/Kuala_Lumpur">Malaysia Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={appointmentForm.description}
                      onChange={(e) => handleFormChange('description', e.target.value)}
                      placeholder="Meeting agenda or additional notes..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <SheetClose asChild>
                      <Button type="button" variant="outline">Cancel</Button>
                    </SheetClose>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Appointment'
                      )}
                    </Button>
                  </div>
                </form>
              </SheetContent>
            </Sheet>
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Export Calendar
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today&apos;s Appointments</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.todayAppointments || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.todayStats.confirmed || 0} confirmed, {stats?.todayStats.pending || 0} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.thisWeekAppointments || 0}</div>
              <p className="text-xs text-muted-foreground">
                Scheduled appointments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Show Rate</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.showRate || 0}%</div>
              <p className="text-xs text-muted-foreground">
                Client attendance rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.avgDuration || 0} min</div>
              <p className="text-xs text-muted-foreground">
                Average meeting length
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Mini View */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{getMonthYearDisplay()}</CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={goToPreviousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={goToNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center">
                {/* Days of week */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-xs font-medium text-muted-foreground p-2">
                    {day}
                  </div>
                ))}
                {/* Calendar days */}
                {getCalendarDays().map((day, index) => (
                  <div
                    key={index}
                    className={`p-2 text-sm hover:bg-muted rounded cursor-pointer relative ${
                      day.isToday ? 'bg-primary text-primary-foreground font-bold' :
                      day.appointmentCount > 0 ? 'bg-blue-100 text-blue-800' :
                      !day.isCurrentMonth ? 'text-muted-foreground opacity-50' : ''
                    }`}
                    title={day.appointmentCount > 0 ? `${day.appointmentCount} appointment${day.appointmentCount > 1 ? 's' : ''}` : undefined}
                  >
                    {day.date}
                    {day.appointmentCount > 0 && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full text-xs flex items-center justify-center">
                        {day.appointmentCount > 9 ? '9+' : day.appointmentCount}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Today's Schedule */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Today&apos;s Schedule</CardTitle>
              <CardDescription>
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long',
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })} - Your appointments for today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todayAppointments.length > 0 ? (
                  todayAppointments.map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-sm font-medium">{formatTime(appointment.start_time)}</div>
                          <div className="text-xs text-muted-foreground">{appointment.duration_minutes} min</div>
                        </div>
                        <div>
                          <p className="font-medium">{appointment.attendee_name}</p>
                          <p className="text-sm text-muted-foreground">{appointment.title}</p>
                          {appointment.location && (
                            <p className="text-xs text-muted-foreground">{appointment.location}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(appointment.status, appointment.booking_status)}`}>
                          {appointment.status}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            // TODO: Implement edit appointment
                            console.log('Edit appointment:', appointment.id);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="mx-auto h-12 w-12 mb-4" />
                    <p>No appointments scheduled for today</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
            <CardDescription>
              Appointments scheduled for the next few days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingAppointments.length > 0 ? (
                upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[80px]">
                        <div className="text-sm font-medium">{formatDate(appointment.start_time)}</div>
                        <div className="text-xs text-muted-foreground">{formatTime(appointment.start_time)}</div>
                      </div>
                      <div>
                        <p className="font-medium">{appointment.attendee_name}</p>
                        <p className="text-sm text-muted-foreground">{appointment.title}</p>
                        {appointment.location && (
                          <p className="text-xs text-muted-foreground">{appointment.location}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(appointment.status, appointment.booking_status)}`}>
                        {appointment.status}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          // TODO: Implement reschedule
                          console.log('Reschedule appointment:', appointment.id);
                        }}
                      >
                        Reschedule
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          // TODO: Implement view details
                          console.log('View appointment details:', appointment.id);
                        }}
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="mx-auto h-12 w-12 mb-4" />
                  <p>No upcoming appointments</p>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full">
                View Full Calendar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cal.com Integration Status */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <Calendar className="mx-auto h-12 w-12 text-green-600" />
              <h3 className="mt-4 text-lg font-medium text-green-900">Cal.com Integration Active</h3>
              <p className="text-green-700">
                Your AI agents can now book real appointments through Cal.com. Data updates automatically every 30 seconds.
              </p>
              <div className="mt-4 text-sm text-green-600">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
