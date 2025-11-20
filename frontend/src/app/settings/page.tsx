"use client";

import { useEffect, useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { useAppStore } from "@/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  MessageCircle,
  User,
  Bell,
  Shield,
  Database,
  Save,
} from "lucide-react";

export default function SettingsPage() {
  const { setCurrentPage, user } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('profile');
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name,
        email: user.email
      });
    }
  }, [user]);

  useEffect(() => {
    setCurrentPage("settings");
  }, [setCurrentPage]);

  const renderSettingsContent = () => {
    switch (activeCategory) {
      case 'profile':
        return renderProfileSettings();
      case 'elevenlabs':
        return renderElevenLabsSettings();
      case 'whatsapp':
        return renderWhatsAppSettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'security':
        return renderSecuritySettings();
      case 'data':
        return renderDataSettings();
      default:
        return renderProfileSettings();
    }
  };

  const renderProfileSettings = () => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Profile & Account</CardTitle>
          <CardDescription>
            Manage your personal information and account settings
          </CardDescription>
        </div>
        <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'}>
          {user?.role || 'agent'}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Avatar Section */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-lg font-medium text-primary">
              {user?.name?.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 2) || 'U'}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="font-medium">{user?.name || 'User Name'}</h3>
            <p className="text-sm text-muted-foreground">{user?.email || 'user@example.com'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Last login: {user?.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
            </p>
          </div>
        </div>
        
        <Separator />
        
        {/* Editable Profile Information */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input 
              id="name" 
              value={profileData.name}
              onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={profileData.email}
              disabled={true}
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>
          
          <div className="flex gap-2">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} variant="outline">
                <User className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <>
                <Button onClick={() => {
                  // Here you would call API to update user
                  console.log('Saving profile:', profileData);
                  setIsEditing(false);
                }}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setProfileData({
                      name: user?.name || '',
                      email: user?.email || ''
                    });
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderElevenLabsSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle>Voice Agent Integration</CardTitle>
        <CardDescription>
          Configure your AI voice calling settings for automated sales calls
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="elevenLabsApiKey">Credential</Label>
          <Input
            id="elevenLabsApiKey"
            type="password"
            placeholder="Enter your ElevenLabs API key"
            defaultValue="••••••••••••••••••••••••••••••••"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="voiceId">Default Voice ID</Label>
          <Input id="voiceId" placeholder="Voice ID for AI sales calls" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="callScript">Default Sales Call Script</Label>
          <Textarea
            id="callScript"
            placeholder="Enter your default AI sales call script..."
            className="min-h-[100px]"
            defaultValue="Hello! I'm calling from your company regarding your recent inquiry. How can I help you today?"
          />
        </div>
        <div className="flex gap-2">
          <Button>Test Connection</Button>
          <Button variant="outline">Save Settings</Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderWhatsAppSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp Business Integration</CardTitle>
        <CardDescription>
          Connect your WhatsApp Business account for automated follow-ups after sales calls
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="whatsappToken">WhatsApp Business API Token</Label>
          <Input
            id="whatsappToken"
            type="password"
            placeholder="Enter your WhatsApp API token"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="whatsappPhoneId">Phone Number ID</Label>
          <Input
            id="whatsappPhoneId"
            placeholder="Your WhatsApp phone number ID"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="followupTemplate">Default Follow-up Template</Label>
          <Textarea
            id="followupTemplate"
            placeholder="Enter your default follow-up message template..."
            className="min-h-[100px]"
            defaultValue="Hi {name}, thanks for your time earlier! Here's the information we discussed..."
          />
        </div>
        <Button variant="outline">Connect WhatsApp</Button>
      </CardContent>
    </Card>
  );

  const renderNotificationSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Configure how you receive notifications about calls, leads, and system updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Email Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive email alerts for new leads and completed calls
            </p>
          </div>
          <Button variant="outline" size="sm">Enable</Button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Call Completion Alerts</Label>
            <p className="text-sm text-muted-foreground">
              Get notified when AI calls are completed
            </p>
          </div>
          <Button variant="outline" size="sm">Configure</Button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Daily Reports</Label>
            <p className="text-sm text-muted-foreground">
              Receive daily summary of call performance
            </p>
          </div>
          <Button variant="outline" size="sm">Enable</Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderSecuritySettings = () => (
    <Card>
      <CardHeader>
        <CardTitle>Security & Privacy</CardTitle>
        <CardDescription>
          Manage your account security and data privacy settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current Password</Label>
          <Input id="currentPassword" type="password" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <Input id="newPassword" type="password" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input id="confirmPassword" type="password" />
        </div>
        <Button>Change Password</Button>
      </CardContent>
    </Card>
  );

  const renderDataSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle>Data & Backup</CardTitle>
        <CardDescription>
          Export your data, manage backups, and control data retention
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Export Call Data</Label>
            <p className="text-sm text-muted-foreground">
              Download all your call records and analytics
            </p>
          </div>
          <Button variant="outline" size="sm">Export</Button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Export Lead Data</Label>
            <p className="text-sm text-muted-foreground">
              Download all your lead information
            </p>
          </div>
          <Button variant="outline" size="sm">Export</Button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Data Retention</Label>
            <p className="text-sm text-muted-foreground">
              Configure how long data is kept
            </p>
          </div>
          <Button variant="outline" size="sm">Configure</Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Navigation */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Settings Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { icon: User, label: "Profile & Account", id: "profile" },
                  { icon: Phone, label: "ElevenLabs Integration", id: "elevenlabs" },
                  { icon: MessageCircle, label: "WhatsApp Settings", id: "whatsapp" },
                  { icon: Bell, label: "Notifications", id: "notifications" },
                  { icon: Shield, label: "Security & Privacy", id: "security" },
                  { icon: Database, label: "Data & Backup", id: "data" },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setActiveCategory(item.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      activeCategory === item.id
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "hover:bg-muted"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Settings Content */}
          <div className="lg:col-span-2 space-y-6">
            {renderSettingsContent()}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
