import Link from 'next/link';
import { Home, LayoutDashboard, Database, Plug, Component, CalendarDays, Bolt, Layers, ListChecks, User, Cpu } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const navItems = [
  { title: 'Dashboard',      url: '/dashboard',     icon: LayoutDashboard,  navGroup: 'Observability' },
  { title: 'Source Systems', url: '/source-system', icon: Database,         navGroup: 'Connection'    },
  { title: 'Connection',     url: '/connection',    icon: Plug,             navGroup: 'Connection'    },
  { title: 'Groups',         url: '/groups',        icon: Component,        navGroup: 'Orchestration' },
  { title: 'Schedules',      url: '/schedules',     icon: CalendarDays,     navGroup: 'Orchestration' },
  { title: 'Raw Config',     url: '/raw-config',    icon: Bolt,             navGroup: 'Configuration' },
  { title: 'Bronze Config',  url: '/bronze-config', icon: Layers,           navGroup: 'Configuration' },
  { title: 'DQ Rules',       url: '/dq-rules',      icon: ListChecks,       navGroup: 'Data Quality'  },
  { title: 'DQ Suggestions', url: '/dq-suggestions', icon: ListChecks,     navGroup: 'Data Quality'  },
  { title: 'Compute Profiles', url: '/compute-profile', icon: Cpu, navGroup: 'Settings' },
]

export function AppSidebar() {
  /* group items by their navGroup value */
  const groups = navItems.reduce<Record<string, typeof navItems>>( (acc, item) => {
    (acc[item.navGroup] ??= []).push(item)
    return acc
  }, {})

  return (
    <Sidebar variant="floating" collapsible="icon">
      {/* header */}
        <SidebarHeader>
         <SidebarMenu>
          <SidebarMenuItem>
           <SidebarMenuButton asChild>
           <Link href="/">        {/* internal link */}
            <Home />
            <span>LakeForge</span>
          </Link>
           </SidebarMenuButton>
          </SidebarMenuItem>
         </SidebarMenu>
        </SidebarHeader>
      {/* main content */}
      <SidebarContent>
        {Object.entries(groups).map(([groupName, items]) => (
          <SidebarGroup key={groupName}>
            <SidebarGroupLabel>{groupName}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* footer */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton><User /> patrick@techcat.ai</SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
                <DropdownMenuItem>Account</DropdownMenuItem>
                <DropdownMenuItem>Global Settings</DropdownMenuItem>
                <DropdownMenuItem>Billing</DropdownMenuItem>
                <DropdownMenuItem>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}