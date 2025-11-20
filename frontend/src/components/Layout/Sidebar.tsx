"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Users,
  Phone,
  Calendar,
  MessageCircle,
  Settings,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  UserPlus,
  Inbox,
  Radio,
  Bot,
  Share2,
  Puzzle,
} from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
    {
    name: "Inbox",
    href: "/inbox",
    icon: Inbox,
  },
  {
    name: "Contacts",
    href: "/contacts",
    icon: Users,
  },
  {
    name: "AI Agents",
    href: "/agents",
    icon: Bot,
  },
  {
    name: "Broadcasts",
    href: "/broadcasts",
    icon: Radio,
  },
  {
    name: "Calls",
    href: "/calls",
    icon: Phone,
  },
  {
    name: "Calendar",
    href: "/calendar",
    icon: Calendar,
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
];

const bottomNavigation = [
  {
    name: "Help & Support",
    href: "/help",
    icon: HelpCircle,
  },
  {
    name: "Invite Users",
    href: "/invite",
    icon: UserPlus,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

const configurationNavigation = [
  {
    name: "Channels",
    href: "/channels",
    icon: Share2,
  },
  {
    name: "Integrations",
    href: "/integrations",
    icon: Puzzle,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, user } = useAppStore();

  const handleToggle = () => {
    console.log("Sidebar toggle clicked, current state:", sidebarOpen);
    setSidebarOpen(!sidebarOpen);
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getDisplayName = (name?: string) => {
    if (!name) return "User";
    return name.length > 20 ? name.slice(0, 20) + "..." : name;
  };

  return (
    <div
      className={cn(
        "fixed left-0 top-0 z-60 flex h-screen flex-col border-r bg-background transition-all duration-300",
        sidebarOpen ? "w-64" : "w-16"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center p-4 transition-all duration-300",
          sidebarOpen ? "justify-between" : "justify-center"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 transition-opacity duration-300",
            sidebarOpen ? "opacity-100" : "opacity-0 w-0"
          )}
        >
          <Image
            src="/image.png"
            alt="Funnel AI Logo"
            width={32}
            height={32}
            className="rounded"
          />
          <span className="font-semibold text-lg">Funnel AI</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggle}
          className={cn(
            "h-8 w-8 p-0 flex items-center justify-center flex-shrink-0 relative z-10",
            !sidebarOpen && "hover:bg-accent hover:border border-border"
          )}
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-4 w-4 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0" />
          )}
        </Button>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-11 transition-all duration-200",
                  !sidebarOpen && "px-2 justify-center"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{item.name}</span>}
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4">
        <Separator />

        {/* Configuration Links */}
        <nav className="space-y-1 px-2">
          {configurationNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-11",
                    !sidebarOpen && "px-2 justify-center"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {sidebarOpen && <span className="truncate">{item.name}</span>}
                </Button>
              </Link>
            );
          })}
        </nav>

        <Separator />
        
        {/* Bottom Navigation */}
        <nav className="space-y-1 p-2">
          {bottomNavigation.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-11",
                    !sidebarOpen && "px-2 justify-center"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {sidebarOpen && <span className="truncate">{item.name}</span>}
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
