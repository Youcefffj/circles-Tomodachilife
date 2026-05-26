"use client";

import { useEffect, useState } from "react";

/**
 * Client-side QR renderer. Dynamically imports `qrcode` so the lib
 * (~20 KB gzip) is only fetched when this component actually mounts —
 * the standalone CTA is the only consumer right now, and most visits
 * happen inside the Circles host iframe (where this component never
 * renders).
 */
export function QrCode({
  url,
  size = 220,
  alt = "QR code",
}: {
  url: string;
  size?: number;
  alt?: string;
}) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const out = await QRCode.toString(url, {
          type: "svg",
          margin: 1,
          width: size,
          color: {
            // Deep ink dots on transparent — we set the light background
            // on the wrapper so the cartridge styling shows through.
            dark: "#0a1124",
            light: "#00000000",
          },
          errorCorrectionLevel: "M",
        });
        if (!cancelled) setSvg(out);
      } catch (err) {
        console.error("[QrCode] generation failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, size]);

  return (
    <div
      className="cartridge-sm relative grid place-items-center bg-[var(--cream)] p-3"
      role="img"
      aria-label={alt}
      style={{ width: size + 26, height: size + 26 }}
    >
      {svg ? (
        <div
          style={{ width: size, height: size }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div
          className="grid place-items-center text-[10px] uppercase tracking-wider text-muted-foreground"
          style={{ width: size, height: size }}
        >
          …
        </div>
      )}
    </div>
  );
}
