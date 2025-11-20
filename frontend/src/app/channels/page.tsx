"use client";

import { useEffect } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { MainLayout } from "@/components/Layout/MainLayout";
import { useAppStore } from "@/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  MessageCircle,
  Instagram,
  Facebook,
  PhoneCall,
  Globe,
  ShieldCheck,
  Link2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type ChannelStatus = "connected" | "action_required" | "draft";

interface ChannelConfig {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  status: ChannelStatus;
  statusLabel: string;
  helperText: string;
  features: string[];
  primaryAction: string;
  secondaryAction: string;
}

const channelConfigs: ChannelConfig[] = [
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Connect your WhatsApp Business API to send and receive realtime conversations.",
    icon: MessageCircle,
    status: "action_required",
    statusLabel: "Webhook required",
    helperText: "Use your Meta Developer Console credentials and verified business number.",
    features: [
      "Official Business API support",
      "Two-way conversations synced with inbox",
      "Webhook fallback + delivery receipts",
    ],
    primaryAction: "Configure webhook",
    secondaryAction: "View docs",
  },
  {
    id: "instagram",
    name: "Instagram DM",
    description: "Respond to IG DM inquiries directly from your AI inbox and workflows.",
    icon: Instagram,
    status: "draft",
    statusLabel: "Pending review",
    helperText: "Requires Meta App approval for messaging permissions.",
    features: [
      "Auto-response templates & flows",
      "Story reply capture",
      "AI routing based on keyword intent",
    ],
    primaryAction: "Start review",
    secondaryAction: "Channel settings",
  },
  {
    id: "messenger",
    name: "Facebook Messenger",
    description: "Sync conversations from your Facebook page to the shared inbox.",
    icon: Facebook,
    status: "connected",
    statusLabel: "Live",
    helperText: "Connected as @FunnelAI. Webhook pinged 12 mins ago.",
    features: [
      "Page inbox syncing",
      "Auto assignment rules",
      "AI assistant handoff triggers",
    ],
    primaryAction: "Manage channel",
    secondaryAction: "View logs",
  },
  {
    id: "sms",
    name: "SMS & Voice",
    description: "Configure Twilio or custom SIP credentials for outreach and reminders.",
    icon: PhoneCall,
    status: "action_required",
    statusLabel: "Number missing",
    helperText: "Provision a sending number to activate SMS + call flows.",
    features: [
      "Two-factor fallbacks",
      "Local presence numbers",
      "Automated opt-out handling",
    ],
    primaryAction: "Add number",
    secondaryAction: "Bring your carrier",
  },
  {
    id: "webchat",
    name: "Website Chat",
    description: "Embed Funnel AI chat widget on your site to capture high-intent leads.",
    icon: Globe,
    status: "connected",
    statusLabel: "Tracking activity",
    helperText: "Widget live on marketing.funnel.ai with 96% uptime.",
    features: [
      "24/7 AI concierge",
      "Lead enrichment",
      "Calendar + payment handoffs",
    ],
    primaryAction: "Customize widget",
    secondaryAction: "Copy snippet",
  },
];

const badgeVariant: Record<ChannelStatus, "default" | "secondary" | "outline" | "destructive"> = {
  connected: "default",
  action_required: "destructive",
  draft: "secondary",
};

export default function ChannelsPage() {
  const { setCurrentPage } = useAppStore();

  useEffect(() => {
    setCurrentPage("channels");
  }, [setCurrentPage]);

  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold">Channels</h1>
                <p className="text-muted-foreground">
                  Configure every conversation entry point Funnel AI can respond to.
                </p>
              </div>
              <Button variant="outline" className="gap-2">
                <Link2 className="h-4 w-4" />
                Connect new channel
              </Button>
            </div>
            <Separator />
          </div>

          <Card className="bg-card/60 border-dashed">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Webhook posture</CardTitle>
                <CardDescription>
                  Keep each channel verified and listening for new lead events.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                3 of 5 channels healthy
              </Badge>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Live channels</p>
                <p className="text-2xl font-semibold">3</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Actions required</p>
                <p className="text-2xl font-semibold text-amber-600">2</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last webhook ping</p>
                <p className="text-2xl font-semibold">3m ago</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {channelConfigs.map((channel) => (
              <Card key={channel.id}>
                <CardHeader className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <channel.icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{channel.name}</CardTitle>
                      <CardDescription>{channel.description}</CardDescription>
                    </div>
                    <Badge
                      variant={badgeVariant[channel.status]}
                      className="ml-auto whitespace-nowrap"
                    >
                      {channel.statusLabel}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
                    {channel.helperText}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                      Capabilities
                    </p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {channel.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Automations stay paused until this channel is live.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm">{channel.primaryAction}</Button>
                    <Button size="sm" variant="outline">
                      {channel.secondaryAction}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    </AuthGuard>
  );
}
