'use client';

import { useState } from 'react';
import { SidebarAwareSheet } from '@/components/ui/sidebar-aware-sheet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Phone, 
  MessageSquare,
  Mail,
  Send,
  Users,
  Calendar,
  Clock,
  Rocket,
  Search
} from 'lucide-react';
import { apiClient } from '@/services/api';
import { BulkCallingLauncher } from './BulkCallingLauncher';

interface CampaignCreatorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCampaignCreated: () => void;
}

interface SelectedContact {
  id: string;
  name: string;
  phone_number?: string;
  email?: string;
  status: 'pending' | 'called' | 'scheduled' | 'completed' | 'failed';
}

export function CampaignCreator({ isOpen, onOpenChange, onCampaignCreated }: CampaignCreatorProps) {
  const [campaignType, setCampaignType] = useState<'voice_call' | 'sms' | 'whatsapp' | 'email'>('voice_call');
  const [campaignName, setCampaignName] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [contacts, setContacts] = useState<SelectedContact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'type' | 'contacts' | 'details' | 'voice_setup'>('type');

  const campaignTypes = [
    {
      id: 'voice_call',
      name: 'Voice Calls',
      icon: Phone,
      description: 'AI-powered voice calls with ElevenLabs',
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    },
    {
      id: 'sms',
      name: 'SMS',
      icon: MessageSquare,
      description: 'Text message campaigns',
      color: 'bg-green-50 border-green-200 hover:bg-green-100'
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: Send,
      description: 'WhatsApp business messages',
      color: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
    },
    {
      id: 'email',
      name: 'Email',
      icon: Mail,
      description: 'Email marketing campaigns',
      color: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
    }
  ];

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getLeads(1, 100, searchTerm);
      
      if (response.success && response.data) {
        const apiLeads = response.data.items || [];
        const contactData = Array.isArray(apiLeads) ? apiLeads
          .filter(lead => {
            const hasRequiredFields = lead && lead.id && lead.name;
            if (campaignType === 'voice_call') {
              return hasRequiredFields && lead.phone_number;
            }
            if (campaignType === 'email') {
              return hasRequiredFields && lead.email;
            }
            return hasRequiredFields;
          })
          .map((lead): SelectedContact => ({
            id: lead.id,
            name: lead.name,
            phone_number: lead.phone_number,
            email: lead.email,
            status: lead.status || 'pending'
          })) : [];
        
        setContacts(contactData);
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 'type') {
      setStep('contacts');
      fetchContacts();
    } else if (step === 'contacts') {
      setStep('details');
    } else if (step === 'details') {
      if (campaignType === 'voice_call') {
        setStep('voice_setup');
      } else {
        handleCreateCampaign();
      }
    }
  };

  const handleBack = () => {
    if (step === 'contacts') {
      setStep('type');
    } else if (step === 'details') {
      setStep('contacts');
    } else if (step === 'voice_setup') {
      setStep('details');
    }
  };

  const handleCreateCampaign = async () => {
    // For non-voice campaigns, implement API call here
    console.log('Creating campaign:', {
      type: campaignType,
      name: campaignName,
      contacts: selectedContacts,
      message: customMessage,
      scheduledAt
    });
    
    onCampaignCreated();
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setCampaignType('voice_call');
    setCampaignName('');
    setCustomMessage('');
    setScheduledAt('');
    setSelectedContacts([]);
    setContacts([]);
    setSearchTerm('');
    setStep('type');
  };

  const handleSelectContact = (contactId: string, checked: boolean) => {
    if (checked) {
      setSelectedContacts(prev => [...prev, contactId]);
    } else {
      setSelectedContacts(prev => prev.filter(id => id !== contactId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContacts(contacts.map(contact => contact.id));
    } else {
      setSelectedContacts([]);
    }
  };

  return (
    <>
      <SidebarAwareSheet 
        open={isOpen && step !== 'voice_setup'} 
        onOpenChange={(open) => {
          if (!open) {
            resetForm();
          }
          onOpenChange(open);
        }}
        title="Create Campaign"
        description="Set up your marketing campaign with multiple channel options"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-6">
          {/* Step 1: Campaign Type Selection */}
          {step === 'type' && (
            <Card>
              <CardHeader>
                <CardTitle>Choose Campaign Type</CardTitle>
                <CardDescription>
                  Select the communication channel for your campaign
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {campaignTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setCampaignType(type.id as any)}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          campaignType === type.id 
                            ? `${type.color} border-current` 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Icon className="h-6 w-6" />
                          <h3 className="font-medium">{type.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {type.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-end mt-6">
                  <Button onClick={handleNext}>
                    Next: Select Contacts
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Contact Selection */}
          {step === 'contacts' && (
            <>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {selectedContacts.length} of {contacts.length} contacts selected
                        </span>
                      </div>
                      {selectedContacts.length > 0 && (
                        <Badge variant="secondary">
                          Ready for {campaignType.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Select Contacts</CardTitle>
                  <CardDescription>
                    Choose contacts for your {campaignType.replace('_', ' ')} campaign
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search contacts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-2 border-t">
                    <input
                      type="checkbox"
                      id="select-all"
                      checked={contacts.length > 0 && selectedContacts.length === contacts.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="select-all" className="text-sm font-medium">
                      Select all {contacts.length} contacts
                    </Label>
                  </div>

                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {contacts.map((contact) => (
                        <div 
                          key={contact.id}
                          className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                            selectedContacts.includes(contact.id) 
                              ? 'bg-blue-50 border-blue-200' 
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedContacts.includes(contact.id)}
                            onChange={(e) => handleSelectContact(contact.id, e.target.checked)}
                            className="rounded"
                          />
                          <div className="flex-1">
                            <p className="font-medium">{contact.name}</p>
                            {campaignType === 'voice_call' && contact.phone_number && (
                              <p className="text-sm text-muted-foreground">{contact.phone_number}</p>
                            )}
                            {campaignType === 'email' && contact.email && (
                              <p className="text-sm text-muted-foreground">{contact.email}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {contact.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={handleBack}>
                      Back
                    </Button>
                    <Button 
                      onClick={handleNext} 
                      disabled={selectedContacts.length === 0}
                    >
                      Next: Campaign Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Step 3: Campaign Details */}
          {step === 'details' && (
            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
                <CardDescription>
                  Configure your {campaignType.replace('_', ' ')} campaign settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="campaign-name">Campaign Name</Label>
                  <Input
                    id="campaign-name"
                    placeholder={`My ${campaignType.replace('_', ' ')} Campaign`}
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                  />
                </div>

                {campaignType !== 'voice_call' && (
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Enter your campaign message..."
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={4}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="scheduled-at">Schedule (Optional)</Label>
                  <Input
                    id="scheduled-at"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={handleBack}>
                    Back
                  </Button>
                  <Button onClick={handleNext}>
                    {campaignType === 'voice_call' ? 'Configure Voice Setup' : (
                      <>
                        <Rocket className="h-4 w-4 mr-2" />
                        Create Campaign
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SidebarAwareSheet>

      {/* Voice Call Setup - Uses existing BulkCallingLauncher */}
      {campaignType === 'voice_call' && step === 'voice_setup' && (
        <BulkCallingLauncher 
          isOpen={true}
          onOpenChange={(open) => {
            if (!open) {
              onCampaignCreated();
              onOpenChange(false);
              resetForm();
            }
          }}
          preSelectedLeads={selectedContacts}
          campaignName={campaignName}
        />
      )}
    </>
  );
}