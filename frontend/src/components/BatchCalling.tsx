'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  Square, 
  Upload, 
  Clock, 
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { apiClient } from '@/services/api';

interface BatchCampaign {
  id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed';
  totalLeads: number;
  called: number;
  successful: number;
  failed: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  agentId: string;
  customMessage?: string;
}

interface BatchCallingProps {
  selectedLeads?: string[];
  onCampaignStart?: (campaignId: string) => void;
  onCampaignComplete?: (campaignId: string, results: Record<string, number>) => void;
}

export function BatchCalling({ selectedLeads = [], onCampaignStart, onCampaignComplete }: BatchCallingProps) {
  const [campaigns, setCampaigns] = useState<BatchCampaign[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Campaign creation form
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    agentId: 'agent_3501k2cxpkgbf69s7q5jr9vtrxey', // From your env
    customMessage: '',
    scheduledAt: '',
    leadIds: selectedLeads,
  });

  // Update leadIds when selectedLeads changes
  useEffect(() => {
    setNewCampaign(prev => {
      if (JSON.stringify(selectedLeads) !== JSON.stringify(prev.leadIds)) {
        return { ...prev, leadIds: selectedLeads };
      }
      return prev;
    });
  }, [selectedLeads]);

  const createCampaign = useCallback(async () => {
    if (!newCampaign.name || newCampaign.leadIds.length === 0) {
      alert('Please provide campaign name and select leads');
      return;
    }

    try {
      setLoading(true);
      
      const response = await apiClient.createCampaign({
        name: newCampaign.name,
        agentId: newCampaign.agentId,
        leadIds: newCampaign.leadIds,
        customMessage: newCampaign.customMessage,
        scheduledAt: newCampaign.scheduledAt
      });

      if (response.success && response.data) {
        const campaign: BatchCampaign = {
          id: response.data.id || `campaign_${Date.now()}`,
          name: response.data.name || 'Untitled Campaign',
          status: response.data.status as BatchCampaign['status'] || 'draft',
          totalLeads: Number(response.data.totalLeads) || 0,
          called: Number(response.data.called) || 0,
          successful: Number(response.data.successful) || 0,
          failed: Number(response.data.failed) || 0,
          scheduledAt: newCampaign.scheduledAt || undefined,
          agentId: newCampaign.agentId,
          customMessage: newCampaign.customMessage || undefined,
        };

        setCampaigns(prev => [...prev, campaign]);
        setIsCreating(false);
        setNewCampaign({
          name: '',
          agentId: 'agent_3501k2cxpkgbf69s7q5jr9vtrxey',
          customMessage: '',
          scheduledAt: '',
          leadIds: selectedLeads,
        });
        
        onCampaignStart?.(campaign.id);
      } else {
        alert(response.error || 'Failed to create campaign');
      }
    } catch (error) {
      console.error('Failed to create campaign:', error);
      alert('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  }, [newCampaign, selectedLeads, onCampaignStart]);

  const startCampaign = async (campaignId: string) => {
    try {
      setLoading(true);
      
      const response = await apiClient.startCampaign(campaignId);
      
      if (response.success) {
        setCampaigns(prev => prev.map(c => 
          c.id === campaignId 
            ? { ...c, status: 'running', startedAt: new Date().toISOString() }
            : c
        ));

        // Start polling for campaign updates
        pollCampaignProgress(campaignId);
      } else {
        alert(response.error || 'Failed to start campaign');
      }
      
    } catch (error) {
      console.error('Failed to start campaign:', error);
      alert('Failed to start campaign');
    } finally {
      setLoading(false);
    }
  };

  const pauseCampaign = async (campaignId: string) => {
    try {
      const response = await apiClient.pauseCampaign(campaignId);
      
      if (response.success) {
        setCampaigns(prev => prev.map(c => 
          c.id === campaignId ? { ...c, status: 'paused' } : c
        ));
      } else {
        alert(response.error || 'Failed to pause campaign');
      }
    } catch (error) {
      console.error('Failed to pause campaign:', error);
      alert('Failed to pause campaign');
    }
  };

  const stopCampaign = async (campaignId: string) => {
    setCampaigns(prev => prev.map(c => 
      c.id === campaignId 
        ? { ...c, status: 'completed', completedAt: new Date().toISOString() }
        : c
    ));
  };

  // Poll campaign progress from API
  const pollCampaignProgress = (campaignId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await apiClient.getCampaign(campaignId);
        
        if (response.success && response.data) {
          const campaignData = response.data;
          
          setCampaigns(prev => prev.map(c => {
            if (c.id !== campaignId) return c;
            
            const updated = {
              ...c,
              called: Number(campaignData.called) || 0,
              successful: Number(campaignData.successful) || 0,
              failed: Number(campaignData.failed) || 0,
              status: campaignData.status as BatchCampaign['status'] || c.status
            };

            // Check if campaign is completed
            if (campaignData.status === 'completed' || campaignData.status === 'failed') {
              clearInterval(interval);
              onCampaignComplete?.(campaignId, { 
                called: campaignData.called, 
                successful: campaignData.successful, 
                failed: campaignData.failed 
              });
              
              if (campaignData.completedAt) {
                updated.completedAt = campaignData.completedAt;
              }
            }
            
            return updated;
          }));
        }
      } catch (error) {
        console.error('Error polling campaign progress:', error);
        clearInterval(interval);
      }
    }, 3000); // Poll every 3 seconds
  };

  const getStatusColor = (status: BatchCampaign['status']) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'scheduled': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: BatchCampaign['status']) => {
    switch (status) {
      case 'running': return <Play className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'paused': return <Pause className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      case 'scheduled': return <Calendar className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Campaign Creation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Batch Calling Campaigns
          </CardTitle>
          <CardDescription>
            Create and manage bulk calling campaigns with AI agents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isCreating ? (
            <div className="flex gap-2">
              <Button 
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Create Campaign
              </Button>
              <span className="text-sm text-muted-foreground self-center">
                {selectedLeads.length > 0 
                  ? `${selectedLeads.length} leads selected`
                  : 'No leads selected'
                }
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="campaign-name">Campaign Name</Label>
                  <Input
                    id="campaign-name"
                    placeholder="e.g., Q4 Sales Outreach"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign(prev => ({...prev, name: e.target.value}))}
                  />
                </div>
                <div>
                  <Label htmlFor="agent-select">AI Agent</Label>
                  <Select 
                    value={newCampaign.agentId}
                    onValueChange={(value) => setNewCampaign(prev => ({...prev, agentId: value}))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent_3501k2cxpkgbf69s7q5jr9vtrxey">Primary Sales Agent</SelectItem>
                      <SelectItem value="agent_secondary">Secondary Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="custom-message">Custom Message (Optional)</Label>
                <Textarea
                  id="custom-message"
                  placeholder="Personalized message for this campaign..."
                  value={newCampaign.customMessage}
                  onChange={(e) => setNewCampaign(prev => ({...prev, customMessage: e.target.value}))}
                />
              </div>
              
              <div>
                <Label htmlFor="schedule-time">Schedule Time (Optional)</Label>
                <Input
                  id="schedule-time"
                  type="datetime-local"
                  value={newCampaign.scheduledAt}
                  onChange={(e) => setNewCampaign(prev => ({...prev, scheduledAt: e.target.value}))}
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={createCampaign} disabled={loading}>
                  {loading ? 'Creating...' : 'Create Campaign'}
                </Button>
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Campaigns */}
      {campaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Management</CardTitle>
            <CardDescription>Monitor and control your calling campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(campaign.status)}
                        <h3 className="font-semibold">{campaign.name}</h3>
                      </div>
                      <Badge className={getStatusColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {campaign.status === 'draft' && (
                        <Button 
                          size="sm" 
                          onClick={() => startCampaign(campaign.id)}
                          disabled={loading}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Start
                        </Button>
                      )}
                      {campaign.status === 'running' && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => pauseCampaign(campaign.id)}
                          >
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => stopCampaign(campaign.id)}
                          >
                            <Square className="h-4 w-4 mr-1" />
                            Stop
                          </Button>
                        </>
                      )}
                      {campaign.status === 'paused' && (
                        <Button 
                          size="sm"
                          onClick={() => startCampaign(campaign.id)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Resume
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Progress: {campaign.called} / {campaign.totalLeads}</span>
                      <span>{campaign.totalLeads > 0 ? Math.round((campaign.called / campaign.totalLeads) * 100) : 0}%</span>
                    </div>
                    <Progress value={campaign.totalLeads > 0 ? (campaign.called / campaign.totalLeads) * 100 : 0} />
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>Successful: {campaign.successful}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span>Failed: {campaign.failed}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span>Remaining: {campaign.totalLeads - campaign.called}</span>
                      </div>
                    </div>
                    
                    {campaign.scheduledAt && (
                      <div className="text-sm text-muted-foreground">
                        <Clock className="inline h-4 w-4 mr-1" />
                        Scheduled: {campaign.scheduledAt ? new Date(campaign.scheduledAt).toISOString().slice(0, 16).replace('T', ' ') : 'Not scheduled'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}