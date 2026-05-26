'use client';

import { useWallet } from '@/components/wallet/WalletProvider';
import { cn, shortenAddress } from '@/lib/utils';

export function WalletStatus() {
  const { address, isConnected } = useWallet();

  return (
    <div
      className={cn(
        'cartridge-sm font-pixel flex items-center gap-2 px-2.5 py-1.5 text-[10px] uppercase tracking-wider',
        isConnected ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'h-1.5 w-1.5 rounded-sm',
          isConnected
            ? 'anim-led bg-[oklch(0.7_0.18_140)]'
            : 'bg-muted-foreground/60',
        )}
      />
      <span>{address ? shortenAddress(address) : 'No wallet'}</span>
    </div>
  );
}
