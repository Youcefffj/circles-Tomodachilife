'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { NAV } from '@/lib/nav';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden flex-col gap-4 border-r border-sidebar-border bg-sidebar p-3 md:flex">
      {/* Wordmark */}
      <div className="px-3 pt-2 pb-1">
        <p className="font-pixel text-[9px] uppercase tracking-[0.22em] text-sidebar-foreground/55">
          A miniapp by
        </p>
        <p className="font-pixel mt-0.5 text-base text-sidebar-foreground">
          Hatch
        </p>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
              )}
            >
              {isActive && (
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-[var(--species-accent)]"
                />
              )}
              <span aria-hidden className="text-lg leading-none">
                {item.emoji}
              </span>
              <span className="font-pixel text-[11px] uppercase tracking-wider">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Cycle card */}
      <div className="mt-auto rounded-lg border border-sidebar-border/70 bg-[oklch(0.09_0.035_245)] p-3">
        <div className="flex items-center justify-between">
          <p className="font-pixel text-[9px] uppercase tracking-wider text-sidebar-foreground/55">
            Cycle 01
          </p>
          <span className="anim-led h-1.5 w-1.5 rounded-sm bg-[var(--species-accent)]" />
        </div>
        <p className="font-pixel mt-2 text-[11px] leading-relaxed text-sidebar-foreground/85">
          Money issued by people grows little creatures.
        </p>
        <div className="font-pixel mt-3 flex items-center justify-between text-[9px] uppercase tracking-wider">
          <span className="text-sidebar-foreground/55">Day</span>
          <span className="text-sidebar-foreground">03 / 07</span>
        </div>
      </div>
    </aside>
  );
}
