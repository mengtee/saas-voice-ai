'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/services/api';
import { ApiResponse, PaginatedResponse } from '@/types';
import { Edit, Save, X, Trash2, Search, Filter } from 'lucide-react';

interface BackendLead {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
  purpose?: string;
  status: 'pending' | 'called' | 'scheduled' | 'completed' | 'failed';
  notes?: string;
  created_at: string;
  updated_at: string;
}

type EditingLead = Omit<BackendLead, 'created_at' | 'updated_at'>;

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  called: 'bg-blue-100 text-blue-800',
  scheduled: 'bg-green-100 text-green-800',
  completed: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
};

interface LeadsTableProps {
  onRefresh?: () => void;
}

export function LeadsTable({ onRefresh }: LeadsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [allLeads, setAllLeads] = useState<BackendLead[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch all leads for client-side filtering
      const response = await apiClient.getLeads(1, 1000) as unknown as ApiResponse<PaginatedResponse<BackendLead>>;
      if (response && response.data) {
        setAllLeads(response.data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Client-side filtering
  const filteredLeads = allLeads.filter(lead => {
    const matchesSearch = !searchTerm || 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone_number.includes(searchTerm) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.purpose?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Client-side pagination
  const totalCount = filteredLeads.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const leads = filteredLeads.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const startEditing = (lead: BackendLead) => {
    setEditingId(lead.id);
    setEditingData({
      id: lead.id,
      name: lead.name,
      phone_number: lead.phone_number,
      email: lead.email || '',
      purpose: lead.purpose || '',
      status: lead.status,
      notes: lead.notes || '',
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingData(null);
  };

  const saveEditing = async () => {
    if (!editingData || !editingId) return;

    try {
      const updateData = {
        name: editingData.name,
        phone_number: editingData.phone_number,
        email: editingData.email || undefined,
        purpose: editingData.purpose || undefined,
        status: editingData.status,
        notes: editingData.notes || undefined,
      };

      await apiClient.updateLead(editingId, updateData);
      
      // Update local state
      setAllLeads(allLeads.map(lead => 
        lead.id === editingId 
          ? { ...lead, ...editingData, updated_at: new Date().toISOString() }
          : lead
      ));
      
      cancelEditing();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to update lead:', error);
    }
  };

  const deleteLead = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;

    try {
      await apiClient.deleteLead(id);
      setAllLeads(allLeads.filter(lead => lead.id !== id));
      onRefresh?.();
    } catch (error) {
      console.error('Failed to delete lead:', error);
    }
  };

  const toggleSelectLead = (id: string) => {
    const newSelection = new Set(selectedLeads);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedLeads(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map(lead => lead.id)));
    }
  };

  const bulkUpdateStatus = async (status: BackendLead['status']) => {
    if (selectedLeads.size === 0) return;

    try {
      // Update all selected leads
      const updatePromises = Array.from(selectedLeads).map(id => 
        apiClient.updateLead(id, { status })
      );
      await Promise.all(updatePromises);
      
      // Update local state
      setAllLeads(allLeads.map(lead => 
        selectedLeads.has(lead.id) 
          ? { ...lead, status, updated_at: new Date().toISOString() }
          : lead
      ));
      
      setSelectedLeads(new Set());
      onRefresh?.();
    } catch (error) {
      console.error('Failed to bulk update leads:', error);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    setSelectedLeads(new Set()); // Clear selection when changing pages
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="called">Called</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {selectedLeads.size > 0 && (
          <div className="flex gap-2">
            <Select onValueChange={(value) => bulkUpdateStatus(value as BackendLead['status'])}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Bulk Update" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Mark Pending</SelectItem>
                <SelectItem value="called">Mark Called</SelectItem>
                <SelectItem value="scheduled">Mark Scheduled</SelectItem>
                <SelectItem value="completed">Mark Completed</SelectItem>
                <SelectItem value="failed">Mark Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setSelectedLeads(new Set())}>
              Clear ({selectedLeads.size})
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={selectedLeads.size === leads.length && leads.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded"
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No leads found
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id} className={selectedLeads.has(lead.id) ? 'bg-muted/50' : ''}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedLeads.has(lead.id)}
                      onChange={() => toggleSelectLead(lead.id)}
                      className="rounded"
                    />
                  </TableCell>
                  <TableCell>
                    {editingId === lead.id ? (
                      <Input
                        value={editingData?.name || ''}
                        onChange={(e) => setEditingData(prev => prev ? {...prev, name: e.target.value} : null)}
                        className="w-full"
                      />
                    ) : (
                      <div className="font-medium">{lead.name}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === lead.id ? (
                      <Input
                        value={editingData?.phone_number || ''}
                        onChange={(e) => setEditingData(prev => prev ? {...prev, phone_number: e.target.value} : null)}
                        className="w-full"
                      />
                    ) : (
                      <div className="font-mono text-sm">{lead.phone_number}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === lead.id ? (
                      <Input
                        value={editingData?.email || ''}
                        onChange={(e) => setEditingData(prev => prev ? {...prev, email: e.target.value} : null)}
                        className="w-full"
                        placeholder="Optional"
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground">{lead.email || '—'}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === lead.id ? (
                      <Input
                        value={editingData?.purpose || ''}
                        onChange={(e) => setEditingData(prev => prev ? {...prev, purpose: e.target.value} : null)}
                        className="w-full"
                        placeholder="Optional"
                      />
                    ) : (
                      <div className="text-sm">{lead.purpose || '—'}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === lead.id ? (
                      <Select
                        value={editingData?.status}
                        onValueChange={(value) => setEditingData(prev => prev ? {...prev, status: value as BackendLead['status']} : null)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="called">Called</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={statusColors[lead.status]}>
                        {lead.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === lead.id ? (
                      <Textarea
                        value={editingData?.notes || ''}
                        onChange={(e) => setEditingData(prev => prev ? {...prev, notes: e.target.value} : null)}
                        className="w-full min-h-[60px]"
                        placeholder="Optional notes"
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground max-w-xs truncate">
                        {lead.notes || '—'}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === lead.id ? (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" onClick={saveEditing} className="h-8 w-8 p-0">
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditing} className="h-8 w-8 p-0">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing(lead)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteLead(lead.id)}
                          className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} leads
          {selectedLeads.size > 0 && ` • ${selectedLeads.size} selected`}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1 || loading}
          >
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(pageNum)}
                  disabled={loading}
                  className="w-10"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}