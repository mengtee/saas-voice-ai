import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Lead, Call, Appointment, WhatsAppFollowup, CallMetrics, User } from '@/types';

interface AppState {
  // User & Auth
  user: User | null;
  isAuthenticated: boolean;
  
  // Leads
  leads: Lead[];
  selectedLeads: string[];
  leadsLoading: boolean;
  
  // Calls
  calls: Call[];
  activeCalls: Call[];
  callMetrics: CallMetrics | null;
  callsLoading: boolean;
  
  // Appointments
  appointments: Appointment[];
  appointmentsLoading: boolean;
  
  // WhatsApp Follow-ups
  whatsappFollowups: WhatsAppFollowup[];
  whatsappLoading: boolean;
  
  // UI State
  sidebarOpen: boolean;
  currentPage: string;
}

interface AppActions {
  // User & Auth Actions
  setUser: (user: User | null) => void;
  logout: () => void;
  
  // Leads Actions
  setLeads: (leads: Lead[]) => void;
  addLead: (lead: Lead) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  setSelectedLeads: (leadIds: string[]) => void;
  toggleLeadSelection: (leadId: string) => void;
  setLeadsLoading: (loading: boolean) => void;
  
  // Calls Actions
  setCalls: (calls: Call[]) => void;
  addCall: (call: Call) => void;
  updateCall: (id: string, updates: Partial<Call>) => void;
  setActiveCalls: (calls: Call[]) => void;
  setCallMetrics: (metrics: CallMetrics) => void;
  setCallsLoading: (loading: boolean) => void;
  
  // Appointments Actions
  setAppointments: (appointments: Appointment[]) => void;
  addAppointment: (appointment: Appointment) => void;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  setAppointmentsLoading: (loading: boolean) => void;
  
  // WhatsApp Actions
  setWhatsappFollowups: (followups: WhatsAppFollowup[]) => void;
  addWhatsappFollowup: (followup: WhatsAppFollowup) => void;
  updateWhatsappFollowup: (id: string, updates: Partial<WhatsAppFollowup>) => void;
  setWhatsappLoading: (loading: boolean) => void;
  
  // UI Actions
  setSidebarOpen: (open: boolean) => void;
  setCurrentPage: (page: string) => void;
}

const initialState: AppState = {
  // User & Auth
  user: null,
  isAuthenticated: false,
  
  // Leads
  leads: [],
  selectedLeads: [],
  leadsLoading: false,
  
  // Calls
  calls: [],
  activeCalls: [],
  callMetrics: null,
  callsLoading: false,
  
  // Appointments
  appointments: [],
  appointmentsLoading: false,
  
  // WhatsApp Follow-ups
  whatsappFollowups: [],
  whatsappLoading: false,
  
  // UI State
  sidebarOpen: true,
  currentPage: 'dashboard',
};

export const useAppStore = create<AppState & AppActions>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,
        
        // User & Auth Actions
        setUser: (user) => set({ user, isAuthenticated: !!user }, false, 'setUser'),
        logout: () => set({ user: null, isAuthenticated: false }, false, 'logout'),
        
        // Leads Actions
        setLeads: (leads) => set({ leads }, false, 'setLeads'),
        addLead: (lead) => set((state) => ({ leads: [...state.leads, lead] }), false, 'addLead'),
        updateLead: (id, updates) =>
          set(
            (state) => ({
              leads: state.leads.map((lead) =>
                lead.id === id ? { ...lead, ...updates } : lead
              ),
            }),
            false,
            'updateLead'
          ),
        deleteLead: (id) =>
          set(
            (state) => ({
              leads: state.leads.filter((lead) => lead.id !== id),
              selectedLeads: state.selectedLeads.filter((leadId) => leadId !== id),
            }),
            false,
            'deleteLead'
          ),
        setSelectedLeads: (leadIds) => set({ selectedLeads: leadIds }, false, 'setSelectedLeads'),
        toggleLeadSelection: (leadId) =>
          set(
            (state) => ({
              selectedLeads: state.selectedLeads.includes(leadId)
                ? state.selectedLeads.filter((id) => id !== leadId)
                : [...state.selectedLeads, leadId],
            }),
            false,
            'toggleLeadSelection'
          ),
        setLeadsLoading: (loading) => set({ leadsLoading: loading }, false, 'setLeadsLoading'),
        
        // Calls Actions
        setCalls: (calls) => set({ calls }, false, 'setCalls'),
        addCall: (call) => set((state) => ({ calls: [...state.calls, call] }), false, 'addCall'),
        updateCall: (id, updates) =>
          set(
            (state) => ({
              calls: state.calls.map((call) =>
                call.id === id ? { ...call, ...updates } : call
              ),
              activeCalls: state.activeCalls.map((call) =>
                call.id === id ? { ...call, ...updates } : call
              ),
            }),
            false,
            'updateCall'
          ),
        setActiveCalls: (calls) => set({ activeCalls: calls }, false, 'setActiveCalls'),
        setCallMetrics: (metrics) => set({ callMetrics: metrics }, false, 'setCallMetrics'),
        setCallsLoading: (loading) => set({ callsLoading: loading }, false, 'setCallsLoading'),
        
        // Appointments Actions
        setAppointments: (appointments) => set({ appointments }, false, 'setAppointments'),
        addAppointment: (appointment) =>
          set((state) => ({ appointments: [...state.appointments, appointment] }), false, 'addAppointment'),
        updateAppointment: (id, updates) =>
          set(
            (state) => ({
              appointments: state.appointments.map((appointment) =>
                appointment.id === id ? { ...appointment, ...updates } : appointment
              ),
            }),
            false,
            'updateAppointment'
          ),
        deleteAppointment: (id) =>
          set(
            (state) => ({
              appointments: state.appointments.filter((appointment) => appointment.id !== id),
            }),
            false,
            'deleteAppointment'
          ),
        setAppointmentsLoading: (loading) => set({ appointmentsLoading: loading }, false, 'setAppointmentsLoading'),
        
        // WhatsApp Actions
        setWhatsappFollowups: (followups) => set({ whatsappFollowups: followups }, false, 'setWhatsappFollowups'),
        addWhatsappFollowup: (followup) =>
          set((state) => ({ whatsappFollowups: [...state.whatsappFollowups, followup] }), false, 'addWhatsappFollowup'),
        updateWhatsappFollowup: (id, updates) =>
          set(
            (state) => ({
              whatsappFollowups: state.whatsappFollowups.map((followup) =>
                followup.id === id ? { ...followup, ...updates } : followup
              ),
            }),
            false,
            'updateWhatsappFollowup'
          ),
        setWhatsappLoading: (loading) => set({ whatsappLoading: loading }, false, 'setWhatsappLoading'),
        
        // UI Actions
        setSidebarOpen: (open) => set({ sidebarOpen: open }, false, 'setSidebarOpen'),
        setCurrentPage: (page) => set({ currentPage: page }, false, 'setCurrentPage'),
      }),
      {
        name: 'customer-service-store',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          sidebarOpen: state.sidebarOpen,
        }),
      }
    ),
    {
      name: 'customer-service-store',
    }
  )
);