"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { MainLayout } from "@/components/Layout/MainLayout";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
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
import { Input } from "@/components/ui/input";
import {
  MessageCircle,
  Instagram,
  Facebook,
  PhoneCall,
  Globe,
  ShieldCheck,
  Link2,
  Send,
  PhoneOutgoing,
  Waves,
  Sparkles,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type ChannelStatus = "connected" | "action_required" | "draft";
type ChannelCategory =
  | "business"
  | "calls"
  | "sms"
  | "live_chat"
  | "email"
  | "custom";

interface ChannelConfig {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  accent: string;
  category: ChannelCategory;
  status: ChannelStatus;
  statusLabel: string;
  helperText: string;
  features: string[];
  primaryAction: string;
  secondaryAction?: string;
  metrics: string;
  tag?: {
    label: string;
    className: string;
  };
}

const channelConfigs: ChannelConfig[] = [
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Connect your WhatsApp Business API to send and receive realtime conversations.",
    icon: MessageCircle,
    iconColor: "text-emerald-600",
    accent: "from-emerald-50 via-white to-white",
    category: "business",
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
    metrics: "24 conversations today",
    tag: {
      label: "Popular",
      className: "border border-emerald-500/50 bg-emerald-500/15 text-emerald-200",
    },
  },
  {
    id: "instagram",
    name: "Instagram DM",
    description: "Respond to IG DM inquiries directly from your AI inbox and workflows.",
    icon: Instagram,
    iconColor: "text-pink-500",
    accent: "from-pink-50 via-white to-white",
    category: "business",
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
    metrics: "Meta review in progress",
  },
  {
    id: "messenger",
    name: "Facebook Messenger",
    description: "Sync conversations from your Facebook page to the shared inbox.",
    icon: Facebook,
    iconColor: "text-sky-500",
    accent: "from-sky-50 via-white to-white",
    category: "business",
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
    metrics: "Avg response 2m",
  },
  {
    id: "sms",
    name: "SMS & Voice",
    description: "Configure Twilio or custom SIP credentials for outreach and reminders.",
    icon: PhoneCall,
    iconColor: "text-amber-500",
    accent: "from-amber-50 via-white to-white",
    category: "sms",
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
    metrics: "0 verified numbers",
  },
  {
    id: "webchat",
    name: "Website Chat",
    description: "Embed Funnel AI chat widget on your site to capture high-intent leads.",
    icon: Globe,
    iconColor: "text-indigo-500",
    accent: "from-indigo-50 via-white to-white",
    category: "live_chat",
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
    metrics: "96% uptime",
  },
  {
    id: "telegram",
    name: "Telegram Bot",
    description: "Reply to Telegram prospects in real-time with AI routed workflows.",
    icon: Send,
    iconColor: "text-cyan-500",
    accent: "from-cyan-50 via-white to-white",
    category: "business",
    status: "draft",
    statusLabel: "Awaiting bot token",
    helperText: "Drop in your bot token + webhook URL.",
    features: ["Bot command handoff", "Encrypted messaging", "Auto translation"],
    primaryAction: "Add token",
    secondaryAction: "Docs",
    metrics: "Bot idle",
  },
  {
    id: "tiktok",
    name: "TikTok Business Messaging",
    description: "Engage creators via TikTok DM and capture leads instantly.",
    icon: Sparkles,
    iconColor: "text-fuchsia-500",
    accent: "from-fuchsia-50 via-white to-white",
    category: "business",
    status: "action_required",
    statusLabel: "Beta access",
    helperText: "Request partner approval to unlock messaging scopes.",
    features: ["Creator replies", "Story mentions", "Influencer routing"],
    primaryAction: "Request access",
    metrics: "Beta waitlist",
  },
  {
    id: "voice",
    name: "Voice Connect",
    description: "Route inbound calls to AI closers or your internal team.",
    icon: PhoneOutgoing,
    iconColor: "text-lime-500",
    accent: "from-lime-50 via-white to-white",
    category: "calls",
    status: "connected",
    statusLabel: "IVR live",
    helperText: "Forward calls from your sales line to auto-qualify leads.",
    features: ["IVR builder", "AI to rep warm transfer", "Call recording"],
    primaryAction: "Manage routing",
    metrics: "6 calls today",
  },
  {
    id: "custom",
    name: "Custom Channel",
    description: "Bring any proprietary channel with our webhook + API toolkit.",
    icon: Waves,
    iconColor: "text-slate-500",
    accent: "from-slate-50 via-white to-white",
    category: "custom",
    status: "connected",
    statusLabel: "Listening",
    helperText: "Ideal for marketplace inboxes or bespoke chat platforms.",
    features: ["Custom schema mapping", "Event streaming", "AI summarization"],
    primaryAction: "View credentials",
    secondaryAction: "Rotate keys",
    metrics: "Every 45s",
  },
];

const badgeVariant: Record<ChannelStatus, "default" | "secondary" | "outline" | "destructive"> = {
  connected: "default",
  action_required: "destructive",
  draft: "secondary",
};

const channelCategories: { id: ChannelCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "business", label: "Business Messaging" },
  { id: "calls", label: "Calls" },
  { id: "sms", label: "SMS" },
  { id: "live_chat", label: "Live Chat" },
  { id: "email", label: "Email" },
  { id: "custom", label: "Custom" },
];

const channelButtonStyles = {
  primary:
    "gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 w-[200px] justify-center whitespace-nowrap",
  secondary:
    "rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 w-[200px] justify-center whitespace-nowrap",
};

export default function ChannelsPage() {
  const { setCurrentPage } = useAppStore();
  const [activeCategory, setActiveCategory] = useState<ChannelCategory | "all">("all");
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    setCurrentPage("channels");
  }, [setCurrentPage]);

  const categoryCounts = useMemo(() => {
    return channelCategories.reduce<Record<string, number>>((acc, cat) => {
      if (cat.id === "all") {
        acc[cat.id] = channelConfigs.length;
      } else {
        acc[cat.id] = channelConfigs.filter((channel) => channel.category === cat.id).length;
      }
      return acc;
    }, {});
  }, []);

  const filteredChannels = channelConfigs.filter((channel) => {
    const matchesCategory = activeCategory === "all" || channel.category === activeCategory;
    const query = searchValue.trim().toLowerCase();
    const matchesSearch =
      !query ||
      channel.name.toLowerCase().includes(query) ||
      channel.description.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-900 p-8 text-slate-50 shadow-lg">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  Channel catalog
                </div>
                <h1 className="text-3xl font-semibold">Manage all inbound funnels</h1>
                <p className="text-slate-300">
                  Connect messaging apps, calls, and custom entry points so AI agents can respond wherever prospects reach out.
                </p>
                <div className="flex flex-wrap gap-3 text-sm text-slate-200">
                  <span>
                    Live channels: <strong>5</strong>
                  </span>
                  <Separator orientation="vertical" className="hidden h-4 md:block" />
                  <span>
                    Actions required: <strong className="text-amber-300">2</strong>
                  </span>
                  <Separator orientation="vertical" className="hidden h-4 md:block" />
                  <span>
                    Last webhook ping: <strong>3m ago</strong>
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-3 md:items-end">
                <Badge variant="outline" className="border-white/40 bg-white/10 text-white">
                  Trial ends in 6 days · Upgrade to stay live
                </Badge>
                <div className="flex gap-2">
                  <Button variant="secondary" className="bg-white/10 text-white hover:bg-white/20">
                    Onboarding checklist
                  </Button>
                  <Button className="bg-white text-slate-900 hover:bg-slate-100">
                    Upgrade now
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Channel Catalog
                  <Badge variant="secondary" className="text-xs">
                    {channelConfigs.length} available
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Filter by entry point, or search for the brand you want to connect.
                </CardDescription>
              </div>
              <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-end">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="Search Channel Catalog"
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" className="gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Advanced filters
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {channelCategories.map((category) => {
                  const isActive = activeCategory === category.id;
                  const count = categoryCounts[category.id] ?? 0;
                  return (
                    <Button
                      key={category.id}
                      variant={isActive ? "default" : "outline"}
                      onClick={() => setActiveCategory(category.id)}
                      className={cn(
                        "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm",
                        isActive && "border-slate-900 bg-slate-900 text-white shadow-none"
                      )}
                    >
                      <span>{category.label}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "ml-2 border-slate-200 bg-slate-50 px-2 text-xs text-slate-600",
                          isActive && "border-white bg-white/20 text-white"
                        )}
                      >
                        {count}
                      </Badge>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {filteredChannels.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
              <ShieldCheck className="mb-3 h-8 w-8 text-primary" />
              <p className="font-medium">No channels match this search.</p>
              <p className="text-sm">Try resetting filters or request a custom connector.</p>
              <Button variant="outline" className="mt-4 gap-2">
                <Link2 className="h-4 w-4" />
                Request connector
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 auto-rows-fr">
              {filteredChannels.map((channel) => (
                <Card
                  key={channel.id}
                  className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-0 opacity-90 transition group-hover:opacity-100",
                      "bg-gradient-to-br",
                      channel.accent
                    )}
                  />
                  <div className="relative flex h-full flex-col">
                    <CardHeader className="flex flex-col gap-4 px-6 pt-6">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-xl",
                            channel.iconColor
                          )}
                        >
                          <channel.icon className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{channel.name}</CardTitle>
                            {channel.tag && (
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-xs font-medium",
                                  channel.tag.className
                                )}
                              >
                                {channel.tag.label}
                              </span>
                            )}
                          </div>
                          <CardDescription>{channel.description}</CardDescription>
                        </div>
                        <Badge
                          variant={badgeVariant[channel.status]}
                          className="ml-auto whitespace-nowrap border border-slate-200 bg-white/80 text-slate-700"
                        >
                          {channel.statusLabel}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 px-6">
                      <div className="flex min-h-[86px] flex-wrap items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-inner">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        <span>{channel.helperText}</span>
                        <Separator orientation="vertical" className="hidden h-4 lg:block" />
                        <span className="text-xs text-slate-500">{channel.metrics}</span>
                      </div>
                      <div className="flex min-h-[48px] flex-wrap gap-2">
                        {channel.features.map((feature) => (
                          <span
                            key={feature}
                            className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs text-slate-700 shadow-sm"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter className="mt-auto flex flex-col gap-3 border-t border-white/60 px-6 py-4 pb-6 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-muted-foreground">
                        Automations stay paused until this channel is live.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" className={cn(channelButtonStyles.primary)}>
                          <Link2 className="h-4 w-4" />
                          {channel.primaryAction}
                        </Button>
                        {channel.secondaryAction && (
                          <Button
                            size="sm"
                            variant="outline"
                            className={cn(channelButtonStyles.secondary)}
                          >
                            {channel.secondaryAction}
                          </Button>
                        )}
                      </div>
                    </CardFooter>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </MainLayout>
    </AuthGuard>
  );
}
