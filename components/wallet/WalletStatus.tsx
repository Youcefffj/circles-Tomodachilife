'use client';

import { useState } from 'react';

import { QrCode } from '@/components/hatch/QrCode';
import { useWallet } from '@/components/wallet/WalletProvider';
import { cn, shortenAddress } from '@/lib/utils';

const APP_URL = 'https://hatchlife.vercel.app/';
const PLAYGROUND_URL = `https://circles.gnosis.io/playground?url=${encodeURIComponent(APP_URL)}`;

/**
 * Header chip — when a wallet is injected by the Circles host, shows the
 * connected address + a pulsing green LED. When standalone, becomes a
 * "Connect wallet" button that opens the QR modal so the visitor can
 * jump to the playground on their phone with one scan.
 */
export function WalletStatus() {
  const { address, isConnected } = useWallet();
  const [open, setOpen] = useState(false);

  if (isConnected) {
    return (
      <div
        className={cn(
          'cartridge-sm font-pixel flex items-center gap-2 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-foreground',
        )}
      >
        <span aria-hidden className="anim-led h-1.5 w-1.5 rounded-sm bg-[oklch(0.7_0.18_140)]" />
        <span>{shortenAddress(address!)}</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'btn-pixel font-pixel flex items-center gap-2 rounded-md px-3 py-2 text-[10px] uppercase tracking-wider transition-colors',
          'bg-[var(--species-accent)] text-[var(--cream)] hover:bg-[oklch(0.66_0.18_220)]',
        )}
      >
        <span aria-hidden className="text-sm leading-none">📱</span>
        <span>Connect wallet</span>
      </button>
      {open && <ConnectModal onClose={() => setOpen(false)} />}
    </>
  );
}

function ConnectModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="cartridge relative w-full max-w-md p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="font-pixel absolute right-3 top-3 text-base text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>

        <div className="text-center">
          <p className="font-pixel text-[10px] uppercase tracking-[0.25em] text-[var(--species-accent)]">
            Step into Hatch
          </p>
          <h2 className="font-pixel mt-2 text-xl text-foreground sm:text-2xl">
            Scan with your phone.
          </h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Hatch lives inside the Circles host. Scan to open the playground
            on your phone with Metri ready.
          </p>
        </div>

        <div className="mt-6 grid place-items-center">
          <QrCode url={PLAYGROUND_URL} size={220} alt="Open HatchLife in Circles playground" />
        </div>

        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">
            On the same device?
          </p>
          <a
            className="font-pixel text-xs uppercase tracking-wider text-[var(--species-accent)] underline"
            href={PLAYGROUND_URL}
            target="_blank"
            rel="noreferrer"
            onClick={onClose}
          >
            Open in the playground →
          </a>
        </div>
      </div>
    </div>
  );
}
