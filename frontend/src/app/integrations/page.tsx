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
  Plug,
  Database,
  Slack,
  CalendarCheck,
  Zap,
  CreditCard,
  Workflow,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type IntegrationStatus = "connected" | "available" | "coming_soon";

interface IntegrationConfig {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  status: IntegrationStatus;
  statusLabel: string;
  helperText: string;
  highlights: string[];
  primaryAction: string;
  secondaryAction?: string;
}

const integrations: IntegrationConfig[] = [
  {
    id: "hubspot",
    name: "HubSpot CRM",
    description: "Sync leads, notes, and lifecycle stages back to HubSpot.",
    icon: Database,
    status: "connected",
    statusLabel: "Syncing 3m ago",
    helperText: "Mapped to pipeline: Sales > Sales Qualified Lead.",
    highlights: ["Lead + deal sync", "Timeline notes", "Owner assignment"],
    primaryAction: "Manage mapping",
    secondaryAction: "Sync now",
  },
  {
    id: "slack",
    name: "Slack Alerts",
    description: "Alert the #hot-leads channel when VIP buyers reply.",
    icon: Slack,
    status: "available",
    statusLabel: "Ready to connect",
    helperText: "Use OAuth to install the Funnel AI Slack app.",
    highlights: ["Reply alerts", "Daily summary", "Escalation workflows"],
    primaryAction: "Connect workspace",
  },
  {
    id: "calendly",
    name: "Calendly",
    description: "Push booked meetings to Calendly and auto-invite reps.",
    icon: CalendarCheck,
    status: "connected",
    statusLabel: "Calendars live",
    helperText: "Using routing form CSM > AE rotation.",
    highlights: ["Round-robin booking", "Custom questions", "Reminders"],
    primaryAction: "Edit routing",
    secondaryAction: "Disable temporarily",
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Trigger over 5,000 apps when AI conversations change state.",
    icon: Zap,
    status: "available",
    statusLabel: "API token required",
    helperText: "Create a private key to authenticate with Zapier.",
    highlights: ["New lead event", "Conversation updated", "Payment collected"],
    primaryAction: "Create API key",
    secondaryAction: "View webhooks",
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Track deposits and payment links directly in contact threads.",
    icon: CreditCard,
    status: "coming_soon",
    statusLabel: "Beta waitlist",
    helperText: "Join the waitlist to test payment intelligence.",
    highlights: ["Checkout links", "Refund alerts", "AI payment prompts"],
    primaryAction: "Request access",
  },
  {
    id: "crm",
    name: "Salesforce",
    description: "Enterprise-grade sync with support for multi-org routing.",
    icon: Plug,
    status: "coming_soon",
    statusLabel: "On roadmap",
    helperText: "Prioritize this connector by voting inside Roadmap.",
    highlights: ["Custom object sync", "Field level mapping", "Bulk enrichment"],
    primaryAction: "Notify me",
  },
];

const integrationBadge: Record<IntegrationStatus, "default" | "secondary" | "outline" | "destructive"> =
  {
    connected: "default",
    available: "outline",
    coming_soon: "secondary",
  };

export default function IntegrationsPage() {
  const { setCurrentPage } = useAppStore();

  useEffect(() => {
    setCurrentPage("integrations");
  }, [setCurrentPage]);

  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold">Integrations</h1>
                <p className="text-muted-foreground">
                  Connect your CRM, messaging tools, and automation partners to Funnel AI.
                </p>
              </div>
              <Button className="gap-2">
                <Plug className="h-4 w-4" />
                Browse catalog
              </Button>
            </div>
            <Separator />
          </div>

          <Card className="border-dashed">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Automation sync health</CardTitle>
                <CardDescription>
                  Monitor the downstream connectors powering your workflows.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>4 integrations healthy</span>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>2 pending setup</span>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Last CRM push</p>
                <p className="text-2xl font-semibold">2 min ago</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Daily automations</p>
                <p className="text-2xl font-semibold">154</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Errored tasks</p>
                <p className="text-2xl font-semibold text-amber-600">3</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sandbox runs</p>
                <p className="text-2xl font-semibold">18</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {integrations.map((integration) => (
              <Card key={integration.id}>
                <CardHeader className="flex flex-row items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <integration.icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                    <CardDescription>{integration.description}</CardDescription>
                  </div>
                  <Badge
                    variant={integrationBadge[integration.status]}
                    className="ml-auto whitespace-nowrap"
                  >
                    {integration.statusLabel}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
                    {integration.helperText}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Highlights
                    </p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {integration.highlights.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <Workflow className="mt-0.5 h-4 w-4 text-primary" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    {integration.status === "connected"
                      ? "Data sync active. Use automations to control routing."
                      : integration.status === "available"
                      ? "Complete the connection to unlock automations."
                      : "Coming soon. We will notify you when beta opens."}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm">{integration.primaryAction}</Button>
                    {integration.secondaryAction && (
                      <Button size="sm" variant="outline">
                        {integration.secondaryAction}
                      </Button>
                    )}
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
