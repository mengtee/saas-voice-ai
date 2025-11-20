'use client';

import { useState } from 'react';
import { SidebarAwareSheet } from '@/components/ui/sidebar-aware-sheet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Phone,
  MessageSquare,
  Mic,
  Settings,
  TestTube,
  Save,
  ArrowLeft,
  Volume2,
  Zap
} from 'lucide-react';

interface AgentCreatorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAgentCreated: () => void;
}

interface VoiceSettings {
  voice_id: string;
  stability: number;
  similarity_boost: number;
  speed: number;
}

interface WhatsAppSettings {
  auto_reply_delay: number;
  business_hours_only: boolean;
  escalation_keywords: string[];
  max_conversation_length: number;
}

export function AgentCreator({ isOpen, onOpenChange, onAgentCreated }: AgentCreatorProps) {
  const [agentType, setAgentType] = useState<'voice_calling' | 'whatsapp_reply'>('voice_calling');
  const [agentName, setAgentName] = useState('');
  const [description, setDescription] = useState('');
  const [model, setModel] = useState('gpt-4');
  const [instructions, setInstructions] = useState('');
  const [greetingMessage, setGreetingMessage] = useState('');
  const [step, setStep] = useState<'type' | 'basic' | 'settings' | 'test'>('type');
  const [loading, setLoading] = useState(false);

  // Voice-specific settings
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    voice_id: 'rachel', // Default ElevenLabs voice
    stability: 0.5,
    similarity_boost: 0.75,
    speed: 1.0
  });

  // WhatsApp-specific settings
  const [whatsappSettings, setWhatsAppSettings] = useState<WhatsAppSettings>({
    auto_reply_delay: 2,
    business_hours_only: false,
    escalation_keywords: ['human', 'agent', 'manager'],
    max_conversation_length: 10
  });

  const agentTypes = [
    {
      id: 'voice_calling',
      name: 'Voice Calling Agent',
      icon: Phone,
      description: 'AI agent for outbound voice calls using ElevenLabs',
      features: ['Natural voice synthesis', 'Real-time conversation', 'Call analytics', 'Appointment booking'],
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    },
    {
      id: 'whatsapp_reply',
      name: 'WhatsApp Reply Agent',
      icon: MessageSquare,
      description: 'AI agent for automated WhatsApp customer support',
      features: ['24/7 availability', 'Multi-language support', 'Smart escalation', 'Rich media responses'],
      color: 'bg-green-50 border-green-200 hover:bg-green-100'
    }
  ];

  const availableVoices = [
    { id: 'rachel', name: 'Rachel', gender: 'Female', accent: 'American' },
    { id: 'drew', name: 'Drew', gender: 'Male', accent: 'American' },
    { id: 'clyde', name: 'Clyde', gender: 'Male', accent: 'American' },
    { id: 'paul', name: 'Paul', gender: 'Male', accent: 'American' },
    { id: 'domi', name: 'Domi', gender: 'Female', accent: 'American' },
  ];

  const models = [
    { id: 'gpt-4', name: 'GPT-4', description: 'Most capable model, best for complex tasks' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and efficient, good for most tasks' },
  ];

  const handleNext = () => {
    if (step === 'type') {
      setStep('basic');
    } else if (step === 'basic') {
      setStep('settings');
    } else if (step === 'settings') {
      setStep('test');
    }
  };

  const handleBack = () => {
    if (step === 'basic') {
      setStep('type');
    } else if (step === 'settings') {
      setStep('basic');
    } else if (step === 'test') {
      setStep('settings');
    }
  };

  const handleCreateAgent = async () => {
    try {
      setLoading(true);
      
      const agentData = {
        name: agentName,
        type: agentType,
        description,
        model,
        instructions,
        greeting_message: greetingMessage,
        voice_settings: agentType === 'voice_calling' ? voiceSettings : undefined,
        whatsapp_settings: agentType === 'whatsapp_reply' ? whatsappSettings : undefined
      };

      console.log('Creating agent:', agentData);
      
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onAgentCreated();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create agent:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAgentType('voice_calling');
    setAgentName('');
    setDescription('');
    setModel('gpt-4');
    setInstructions('');
    setGreetingMessage('');
    setStep('type');
    setVoiceSettings({
      voice_id: 'rachel',
      stability: 0.5,
      similarity_boost: 0.75,
      speed: 1.0
    });
    setWhatsAppSettings({
      auto_reply_delay: 2,
      business_hours_only: false,
      escalation_keywords: ['human', 'agent', 'manager'],
      max_conversation_length: 10
    });
  };

  const getStepTitle = () => {
    switch (step) {
      case 'type': return 'Choose Agent Type';
      case 'basic': return 'Basic Configuration';
      case 'settings': return `${agentType === 'voice_calling' ? 'Voice' : 'WhatsApp'} Settings`;
      case 'test': return 'Test & Deploy';
      default: return 'Create AI Agent';
    }
  };

  return (
    <SidebarAwareSheet 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) {
          resetForm();
        }
        onOpenChange(open);
      }}
      title={getStepTitle()}
      description="Create and configure your AI agent"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            {['type', 'basic', 'settings', 'test'].map((stepName, index) => {
              const isActive = step === stepName;
              const isCompleted = ['type', 'basic', 'settings', 'test'].indexOf(step) > index;
              
              return (
                <div key={stepName} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    isActive ? 'bg-blue-600 text-white' :
                    isCompleted ? 'bg-green-600 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  {index < 3 && (
                    <div className={`w-12 h-1 mx-2 ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-200'
                    }`}></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 1: Agent Type Selection */}
        {step === 'type' && (
          <Card>
            <CardHeader>
              <CardTitle>Choose Agent Type</CardTitle>
              <CardDescription>
                Select the type of AI agent you want to create
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {agentTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setAgentType(type.id as any)}
                      className={`p-6 rounded-lg border-2 text-left transition-all ${
                        agentType === type.id 
                          ? `${type.color} border-current` 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <Icon className="h-8 w-8 text-blue-600" />
                        <h3 className="text-lg font-semibold">{type.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {type.description}
                      </p>
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Key Features:</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {type.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-1">
                              <div className="w-1 h-1 bg-blue-600 rounded-full"></div>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end mt-6">
                <Button onClick={handleNext}>
                  Next: Basic Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Basic Configuration */}
        {step === 'basic' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {agentType === 'voice_calling' ? <Phone className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                Basic Configuration
              </CardTitle>
              <CardDescription>
                Set up the basic information for your {agentType.replace('_', ' ')} agent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agent-name">Agent Name*</Label>
                  <Input
                    id="agent-name"
                    placeholder="My Sales Assistant"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">AI Model*</Label>
                  <select
                    id="model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md"
                  >
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {models.find(m => m.id === model)?.description}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description of what this agent does"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Agent Instructions*</Label>
                <Textarea
                  id="instructions"
                  placeholder="You are a helpful assistant that..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Define the agent's role, personality, and behavior guidelines
                </p>
              </div>

              {agentType === 'voice_calling' && (
                <div className="space-y-2">
                  <Label htmlFor="greeting">Greeting Message*</Label>
                  <Textarea
                    id="greeting"
                    placeholder="Hi! I'm calling from..."
                    value={greetingMessage}
                    onChange={(e) => setGreetingMessage(e.target.value)}
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    The first thing the agent will say when the call is answered
                  </p>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={handleNext} 
                  disabled={!agentName || !instructions || (agentType === 'voice_calling' && !greetingMessage)}
                >
                  Next: {agentType === 'voice_calling' ? 'Voice' : 'WhatsApp'} Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Type-specific Settings */}
        {step === 'settings' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {agentType === 'voice_calling' ? 'Voice Settings' : 'WhatsApp Settings'}
              </CardTitle>
              <CardDescription>
                Configure {agentType === 'voice_calling' ? 'voice synthesis and calling' : 'messaging and automation'} settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {agentType === 'voice_calling' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="voice">Voice Selection</Label>
                    <select
                      id="voice"
                      value={voiceSettings.voice_id}
                      onChange={(e) => setVoiceSettings(prev => ({ ...prev, voice_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md"
                    >
                      {availableVoices.map((voice) => (
                        <option key={voice.id} value={voice.id}>
                          {voice.name} ({voice.gender}, {voice.accent})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stability">Stability: {voiceSettings.stability}</Label>
                      <input
                        id="stability"
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={voiceSettings.stability}
                        onChange={(e) => setVoiceSettings(prev => ({ ...prev, stability: parseFloat(e.target.value) }))}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">Voice consistency</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="similarity">Similarity: {voiceSettings.similarity_boost}</Label>
                      <input
                        id="similarity"
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={voiceSettings.similarity_boost}
                        onChange={(e) => setVoiceSettings(prev => ({ ...prev, similarity_boost: parseFloat(e.target.value) }))}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">Voice similarity</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="speed">Speed: {voiceSettings.speed}x</Label>
                      <input
                        id="speed"
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={voiceSettings.speed}
                        onChange={(e) => setVoiceSettings(prev => ({ ...prev, speed: parseFloat(e.target.value) }))}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">Speaking speed</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Volume2 className="h-4 w-4 text-blue-600" />
                      <h4 className="font-medium text-blue-900">Voice Preview</h4>
                    </div>
                    <p className="text-sm text-blue-800 mb-3">Test how your agent will sound</p>
                    <Button size="sm" variant="outline" className="border-blue-200">
                      <TestTube className="h-3 w-3 mr-1" />
                      Play Sample
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="delay">Auto-reply Delay (seconds)</Label>
                      <Input
                        id="delay"
                        type="number"
                        min="1"
                        max="60"
                        value={whatsappSettings.auto_reply_delay}
                        onChange={(e) => setWhatsAppSettings(prev => ({ ...prev, auto_reply_delay: parseInt(e.target.value) }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max-length">Max Conversation Length</Label>
                      <Input
                        id="max-length"
                        type="number"
                        min="1"
                        max="50"
                        value={whatsappSettings.max_conversation_length}
                        onChange={(e) => setWhatsAppSettings(prev => ({ ...prev, max_conversation_length: parseInt(e.target.value) }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Escalation Keywords</Label>
                    <div className="flex gap-2 mb-2">
                      {whatsappSettings.escalation_keywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                    <Input
                      placeholder="Add keywords that trigger human handoff"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          setWhatsAppSettings(prev => ({
                            ...prev,
                            escalation_keywords: [...prev.escalation_keywords, e.currentTarget.value.trim()]
                          }));
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="business-hours"
                      checked={whatsappSettings.business_hours_only}
                      onChange={(e) => setWhatsAppSettings(prev => ({ ...prev, business_hours_only: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="business-hours">Only reply during business hours</Label>
                  </div>
                </>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNext}>
                  Next: Test & Deploy
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Test & Deploy */}
        {step === 'test' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Test & Deploy
              </CardTitle>
              <CardDescription>
                Test your agent before deployment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h4 className="font-medium">Agent Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Name:</p>
                    <p className="font-medium">{agentName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Type:</p>
                    <p className="font-medium">{agentType.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Model:</p>
                    <p className="font-medium">{model}</p>
                  </div>
                  {agentType === 'voice_calling' && (
                    <div>
                      <p className="text-muted-foreground">Voice:</p>
                      <p className="font-medium">{availableVoices.find(v => v.id === voiceSettings.voice_id)?.name}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Test Your Agent</h4>
                <p className="text-sm text-muted-foreground">
                  {agentType === 'voice_calling' 
                    ? 'Make a test call to verify the agent\'s responses and voice quality'
                    : 'Send test messages to verify the agent\'s responses and behavior'
                  }
                </p>
                <Button variant="outline" className="w-full">
                  {agentType === 'voice_calling' ? (
                    <>
                      <Phone className="h-4 w-4 mr-2" />
                      Start Test Call
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Start Test Chat
                    </>
                  )}
                </Button>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={handleCreateAgent}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Create Agent
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SidebarAwareSheet>
  );
}