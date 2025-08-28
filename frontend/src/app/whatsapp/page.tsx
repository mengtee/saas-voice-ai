'use client';

import { useEffect } from 'react';
import { MainLayout } from '@/components/Layout/MainLayout';
import { useAppStore } from '@/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Send, FileText, TrendingUp, CheckCircle, Plus } from 'lucide-react';

export default function WhatsAppPage() {
  const { setCurrentPage } = useAppStore();

  useEffect(() => {
    setCurrentPage('whatsapp');
  }, [setCurrentPage]);

  // Mock WhatsApp data
  const campaigns = [
    { id: '1', name: 'Follow-up Campaign #1', status: 'active', sent: 234, delivered: 198, read: 156, replied: 23 },
    { id: '2', name: 'Appointment Reminders', status: 'completed', sent: 89, delivered: 87, read: 78, replied: 12 },
    { id: '3', name: 'Product Demo Follow-up', status: 'scheduled', sent: 0, delivered: 0, read: 0, replied: 0 },
  ];

  const recentMessages = [
    { id: '1', contact: 'John Smith', message: 'Hi! Thanks for the call earlier...', status: 'replied', time: '2 min ago' },
    { id: '2', contact: 'Sarah Johnson', message: 'Thank you for the information about...', status: 'read', time: '5 min ago' },
    { id: '3', contact: 'Mike Davis', message: 'I\'m interested in scheduling a demo...', status: 'delivered', time: '12 min ago' },
    { id: '4', contact: 'Emily Brown', message: 'Could you please send me more details...', status: 'sent', time: '18 min ago' },
  ];

  const templates = [
    { id: '1', name: 'Post-Call Follow-up', usage: 156, category: 'Follow-up' },
    { id: '2', name: 'Appointment Reminder', usage: 89, category: 'Reminders' },
    { id: '3', name: 'Demo Invitation', usage: 67, category: 'Sales' },
    { id: '4', name: 'Thank You Message', usage: 45, category: 'Courtesy' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">WhatsApp Follow-ups</h2>
            <p className="text-muted-foreground">
              Automated WhatsApp campaigns and message tracking
            </p>
          </div>
          <div className="flex gap-2">
            <Button>
              <Send className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Templates
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
              <p className="text-xs text-muted-foreground">
                +18% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">94.2%</div>
              <p className="text-xs text-muted-foreground">
                Successfully delivered
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12.8%</div>
              <p className="text-xs text-muted-foreground">
                Customer responses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">
                Currently running
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Active Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Performance</CardTitle>
            <CardDescription>
              Track the performance of your WhatsApp campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">{campaign.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                        campaign.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {campaign.status}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Sent</p>
                      <p className="font-medium">{campaign.sent.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Delivered</p>
                      <p className="font-medium">{campaign.delivered.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Read</p>
                      <p className="font-medium">{campaign.read.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Replied</p>
                      <p className="font-medium">{campaign.replied.toLocaleString()}</p>
                    </div>
                  </div>
                  {campaign.sent > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>{Math.round((campaign.delivered / campaign.sent) * 100)}% delivered</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${(campaign.delivered / campaign.sent) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Messages */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Messages</CardTitle>
              <CardDescription>
                Latest WhatsApp interactions with customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentMessages.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                      <MessageCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{msg.contact}</p>
                        <span className="text-xs text-muted-foreground">{msg.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{msg.message}</p>
                      <div className="mt-1">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          msg.status === 'replied' ? 'bg-green-100 text-green-800' :
                          msg.status === 'read' ? 'bg-blue-100 text-blue-800' :
                          msg.status === 'delivered' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {msg.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" className="w-full">
                  View All Messages
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Message Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Message Templates</CardTitle>
              <CardDescription>
                Most used templates for your campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.map((template) => (
                  <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{template.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          {template.category}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Used {template.usage} times
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm">
                        Use
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coming Soon Notice */}
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center">
              <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">Advanced WhatsApp Features Coming Soon</h3>
              <p className="text-muted-foreground">
                Rich media support, automated workflows, and advanced analytics will be available soon.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}