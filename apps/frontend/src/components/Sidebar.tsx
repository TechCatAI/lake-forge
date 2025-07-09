'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sheet, SheetTrigger, SheetContent } from './ui/sheet';
import Button from './ui/button';
import ScrollArea from './ui/scroll-area';
import MenuIcon from './icons/menu';
import { LayoutDashboard, Table, ListChecks } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Table Config', href: '/table-config', icon: Table },
  { name: 'DQ Rules', href: '/dq-rules', icon: ListChecks },
] as const;

function NavLinks({ pathname, collapsed }: { pathname: string | null; collapsed: boolean }) {
  return (
    <nav className="p-4">
      <ul className="flex flex-col gap-2">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800',
                pathname === item.href && 'font-semibold text-primary',
              )}
            >
              <item.icon className="h-5 w-5" />
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
    const c = localStorage.getItem('sidebar-collapsed');
    if (c === '1') setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  return (
    <>
      <Sheet>
        <SheetTrigger>
          <Button className="m-4 md:hidden" aria-label="Open navigation">
            <MenuIcon className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="md:hidden p-0">
          <ScrollArea className="h-full">
            <NavLinks pathname={pathname} collapsed={false} />
          </ScrollArea>
        </SheetContent>
      </Sheet>
      <aside
        className={cn(
          'hidden md:flex md:flex-col fixed left-0 top-0 h-screen border-r bg-background transition-all',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <button className="m-4" onClick={() => setCollapsed((v) => !v)}>
          <MenuIcon className="h-5 w-5" />
        </button>
        <NavLinks pathname={pathname} collapsed={collapsed} />
      </aside>
    </>
  );
}
