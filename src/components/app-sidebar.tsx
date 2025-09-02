"use client"

import * as React from "react"
import {
  Code,
  Home,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
  user: {
    name: "JSON Dev",
    email: "dev@jsontools.com",
    avatar: "/avatars/dev.jpg",
  },
  teams: [
    {
      name: "JSON Dev Tools",
      logo: Code,
      plan: "Professional",
    },
  ],
  navMain: [
    {
      title: "Home",
      url: "/",
      icon: Home,
      isActive: true,
    },
    {
      title: "JSON Tools",
      url: "#",
      icon: Code,
      items: [
        { title: "JSON Validator", url: "/tools/validator" },
        { title: "JSON Path Explorer", url: "/tools/path" },
        { title: "JSON to Table", url: "/tools/table" },
        { title: "Go Log Debugger", url: "/tools/go-log-debugger" },
        { title: "JSON Beautifier", url: "/tools/json-beautifier" },
        { title: "Webhook Debugger", url: "/tools/webhook-debugger" },
      ],
    },
  ],
  projects: [],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between p-2">
          <NavUser user={data.user} />
          <ThemeToggle />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
