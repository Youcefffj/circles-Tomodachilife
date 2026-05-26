import Link from 'next/link';

import { CirclesLogo } from '@/components/brand/CirclesLogo';
import { CurrentPage } from '@/components/layout/CurrentPage';
import { MobileNav } from '@/components/layout/MobileNav';
import { WalletStatus } from '@/components/wallet/WalletStatus';

export function Header() {
  return (
    <header className="col-span-full flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex items-center gap-3">
        <MobileNav />
        <Link
          href="/"
          className="group flex items-center gap-2.5 tracking-tight"
        >
          <span
            aria-hidden
            className="cartridge-sm flex h-8 w-8 items-center justify-center rounded-md bg-[var(--card)] p-0 transition-transform group-hover:-translate-y-0.5"
          >
            <CirclesLogo width={20} height={20} />
          </span>
          <span className="font-pixel hidden text-base sm:inline">Hatch</span>
          <span className="font-pixel hidden text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:inline">
            v0.1
          </span>
        </Link>
        <CurrentPage />
      </div>
      <WalletStatus />
    </header>
  );
}
