'use client';

import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { MainLayout } from '@/components/Layout/MainLayout';
import { useAppStore } from '@/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bot,
  Search,
  Plus,
  MoreHorizontal,
  Phone,
  MessageSquare,
  Settings,
  Play,
  Pause,
  Copy,
  Trash2,
  Edit,
  TestTube
} from 'lucide-react';
import { AgentCreator } from '@/components/AgentCreator';

interface AIAgent {
  id: string;
  name: string;
  type: 'voice_calling' | 'whatsapp_reply';
  description?: string;
  status: 'active' | 'inactive' | 'training';
  voice_id?: string; // For ElevenLabs voice
  model: string;
  instructions: string;
  greeting_message?: string;
  created_at: string;
  updated_at: string;
  usage_stats: {
    calls_handled?: number;
    messages_replied?: number;
    success_rate: number;
    avg_response_time: number;
  };
}

interface AgentFilter {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
}

export default function AgentsPage() {
  const { setCurrentPage } = useAppStore();
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [agentCreatorOpen, setAgentCreatorOpen] = useState(false);
  
  const [filters] = useState<AgentFilter[]>([
    { id: 'all', name: 'All Agents', icon: Bot, count: 0 },
    { id: 'voice_calling', name: 'Voice Calling', icon: Phone, count: 0 },
    { id: 'whatsapp_reply', name: 'WhatsApp Reply', icon: MessageSquare, count: 0 }
  ]);

  useEffect(() => {
    setCurrentPage('agents');
    fetchAgents();
  }, [setCurrentPage]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockAgents: AIAgent[] = [
        {
          id: '1',
          name: 'Sales Assistant Voice',
          type: 'voice_calling',
          description: 'Handles outbound sales calls and lead qualification',
          status: 'active',
          voice_id: 'voice_abc123',
          model: 'gpt-4',
          instructions: 'You are a friendly sales assistant. Your goal is to qualify leads and schedule appointments.',
          greeting_message: 'Hi! I\'m calling from Funnel AI. Do you have a moment to discuss how we can help grow your business?',
          created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
          updated_at: new Date(Date.now() - 86400000).toISOString(),
          usage_stats: {
            calls_handled: 156,
            success_rate: 78,
            avg_response_time: 1.2
          }
        },
        {
          id: '2',
          name: 'Customer Support Bot',
          type: 'whatsapp_reply',
          description: 'Provides 24/7 customer support via WhatsApp',
          status: 'active',
          model: 'gpt-3.5-turbo',
          instructions: 'You are a helpful customer support agent. Answer questions about products, handle complaints, and escalate when necessary.',
          created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
          updated_at: new Date(Date.now() - 3600000).toISOString(),
          usage_stats: {
            messages_replied: 1247,
            success_rate: 92,
            avg_response_time: 0.8
          }
        },
        {
          id: '3',
          name: 'Appointment Setter',
          type: 'voice_calling',
          description: 'Follows up with leads and schedules appointments',
          status: 'inactive',
          voice_id: 'voice_def456',
          model: 'gpt-4',
          instructions: 'You are an appointment setter. Your goal is to schedule meetings between leads and sales representatives.',
          greeting_message: 'Hello! I\'m following up on your interest in our services. Can we schedule a quick 15-minute call?',
          created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
          updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
          usage_stats: {
            calls_handled: 89,
            success_rate: 65,
            avg_response_time: 1.5
          }
        }
      ];
      
      setAgents(mockAgents);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      training: 'bg-yellow-100 text-yellow-800'
    };
    
    return (
      <Badge className={`text-xs ${colors[status as keyof typeof colors] || colors.inactive}`}>
        {status}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'voice_calling': return <Phone className="h-4 w-4" />;
      case 'whatsapp_reply': return <MessageSquare className="h-4 w-4" />;
      default: return <Bot className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      voice_calling: 'bg-blue-100 text-blue-800',
      whatsapp_reply: 'bg-green-100 text-green-800'
    };
    
    return (
      <Badge variant="outline" className={`text-xs ${colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        <span className="flex items-center gap-1">
          {getTypeIcon(type)}
          {type.replace('_', ' ')}
        </span>
      </Badge>
    );
  };

  const filteredAgents = agents.filter(agent => {
    if (activeFilter === 'all') return true;
    return agent.type === activeFilter;
  });

  const handleToggleStatus = async (agentId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    // Update agent status - replace with actual API call
    setAgents(prev => prev.map(agent => 
      agent.id === agentId ? { ...agent, status: newStatus as any } : agent
    ));
  };

  return (
    <AuthGuard>
      <MainLayout>
        <div className="flex h-[calc(100vh-120px)] gap-6">
          {/* Left Sidebar */}
          <div className="w-64 flex flex-col space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">AI Agents</h2>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Agent Type Filters */}
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-2">Agent Type</h3>
              {filters.map((filter) => {
                const Icon = filter.icon;
                const count = activeFilter === filter.id ? 
                  filteredAgents.length : 
                  agents.filter(a => filter.id === 'all' || a.type === filter.id).length;
                
                return (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg text-left text-sm transition-colors ${
                      activeFilter === filter.id ? 'bg-muted text-foreground font-medium' : 'hover:bg-muted/50'
                    }`}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{filter.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search agents..."
                    className="pl-10 pr-4 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setAgentCreatorOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Agent
                </Button>
              </div>
            </div>

            {/* Agents Grid */}
            <div className="flex-1 overflow-auto">
              {filteredAgents.length === 0 ? (
                <Card className="h-full">
                  <CardContent className="flex flex-col items-center justify-center h-full">
                    <Bot className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No agents found</h3>
                    <p className="text-muted-foreground mb-4">Create your first AI agent to get started</p>
                    <Button onClick={() => setAgentCreatorOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Agent
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, index) => (
                      <Card key={index} className="animate-pulse">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="space-y-2">
                              <div className="h-4 bg-muted rounded w-24"></div>
                              <div className="h-3 bg-muted rounded w-16"></div>
                            </div>
                            <div className="h-6 bg-muted rounded w-16"></div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="h-3 bg-muted rounded w-full"></div>
                            <div className="h-3 bg-muted rounded w-3/4"></div>
                            <div className="flex gap-2">
                              <div className="h-8 bg-muted rounded w-16"></div>
                              <div className="h-8 bg-muted rounded w-16"></div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    filteredAgents.map((agent) => (
                      <Card key={agent.id} className="group hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <CardTitle className="text-lg flex items-center gap-2">
                                {getTypeIcon(agent.type)}
                                {agent.name}
                              </CardTitle>
                              <div className="flex items-center gap-2">
                                {getTypeBadge(agent.type)}
                                {getStatusBadge(agent.status)}
                              </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {agent.description && (
                            <CardDescription className="text-sm">
                              {agent.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {/* Usage Stats */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">
                                  {agent.type === 'voice_calling' ? 'Calls' : 'Messages'}
                                </p>
                                <p className="font-medium">
                                  {agent.usage_stats.calls_handled || agent.usage_stats.messages_replied || 0}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Success Rate</p>
                                <p className="font-medium">{agent.usage_stats.success_rate}%</p>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                variant={agent.status === 'active' ? 'outline' : 'default'}
                                onClick={() => handleToggleStatus(agent.id, agent.status)}
                                className="flex-1"
                              >
                                {agent.status === 'active' ? (
                                  <>
                                    <Pause className="h-3 w-3 mr-1" />
                                    Pause
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-3 w-3 mr-1" />
                                    Activate
                                  </>
                                )}
                              </Button>
                              
                              {agent.type === 'voice_calling' && (
                                <Button size="sm" variant="outline">
                                  <TestTube className="h-3 w-3 mr-1" />
                                  Test Call
                                </Button>
                              )}
                              
                              {agent.type === 'whatsapp_reply' && (
                                <Button size="sm" variant="outline">
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  Test Chat
                                </Button>
                              )}
                            </div>

                            <div className="flex gap-1 pt-1 border-t">
                              <Button size="sm" variant="ghost" className="flex-1">
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button size="sm" variant="ghost" className="flex-1">
                                <Copy className="h-3 w-3 mr-1" />
                                Clone
                              </Button>
                              <Button size="sm" variant="ghost" className="flex-1 text-red-600 hover:text-red-700">
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <AgentCreator 
          isOpen={agentCreatorOpen}
          onOpenChange={setAgentCreatorOpen}
          onAgentCreated={() => {
            fetchAgents(); // Refresh the list
          }}
        />
      </MainLayout>
    </AuthGuard>
  );
}