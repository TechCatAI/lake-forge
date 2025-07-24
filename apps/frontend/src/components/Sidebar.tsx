'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sheet, SheetTrigger, SheetContent } from './ui/sheet';
import Button from './ui/button';
import ScrollArea from './ui/scroll-area';
import MenuIcon from './icons/menu';
import { cn } from '../lib/utils';
import { Home, Upload, Layers, ListChecks, Users, Clock } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Source Systems', href: '/source-system', icon: Upload },
  { name: 'Groups', href: '/groups', icon: Users },
  { name: 'Schedules', href: '/schedules', icon: Clock },
  { name: 'Raw Config', href: '/raw-config', icon: Upload },
  { name: 'Bronze Config', href: '/bronze-config', icon: Layers },
  { name: 'DQ Rules', href: '/dq-rules', icon: ListChecks },
] as const;

function NavLinks({ pathname, collapsed }: { pathname: string | null; collapsed?: boolean }) {
  return (
    <nav className="p-4">
      <ul className="flex flex-col gap-2">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 hover:bg-accent/20',
                pathname === item.href && 'bg-accent/30 text-accent',
                collapsed && 'justify-center px-2'
              )}
              title={item.name}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    setCollapsed(stored === '1');
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0');
    document.documentElement.style.setProperty(
      '--sidebar-width', collapsed ? '4rem' : '15rem'
    );
  }, [collapsed]);
  return (
    <>
      <Sheet>
        <SheetTrigger>
          <Button className="m-4 md:hidden" aria-label="Open navigation">
            <MenuIcon className="h-5 w-5 shrink-0" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="md:hidden p-0">
          <ScrollArea className="h-full">
            <NavLinks pathname={pathname} />
          </ScrollArea>
        </SheetContent>
      </Sheet>
      <aside
        className={cn(
          'hidden md:flex md:flex-col fixed left-0 top-0 h-screen border-r border-zinc-700 bg-zinc-900 text-gray-200 transition-all',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <button
          className="m-4 hidden md:block"
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle sidebar"
        >
          <MenuIcon className="h-5 w-5 shrink-0" />
        </button>
        <NavLinks pathname={pathname} collapsed={collapsed} />
      </aside>
    </>
  );
}
