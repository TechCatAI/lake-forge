'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sheet, SheetTrigger, SheetContent } from './ui/sheet';
import Button from './ui/button';
import ScrollArea from './ui/scroll-area';
import MenuIcon from './icons/menu';
import { cn } from '../lib/utils';

const navItems = [
  { name: 'Dashboard', href: '/' },
  { name: 'Table Config', href: '/table-config' },
  { name: 'DQ Rules', href: '/dq-rules' },
] as const;

function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav className="p-4">
      <ul className="flex flex-col gap-2">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                'block rounded px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800',
                pathname === item.href && 'font-semibold text-primary',
              )}
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
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
            <NavLinks pathname={pathname} />
          </ScrollArea>
        </SheetContent>
      </Sheet>
      <aside className="hidden md:flex md:flex-col fixed left-0 top-0 w-60 h-screen border-r bg-background">
        <NavLinks pathname={pathname} />
      </aside>
    </>
  );
}
