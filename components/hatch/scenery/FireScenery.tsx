"use client";

/**
 * Fire-specific tank layers: hot floor glow, flames at the base,
 * smoke wisps rising. All CSS, no extra assets.
 */
export function FireScenery() {
  return (
    <>
      {/* Hot floor glow — radial red-orange pulse at the bottom */}
      <div
        aria-hidden
        className="anim-hot-floor pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2"
        style={{
          width: "85%",
          height: 90,
          background:
            "radial-gradient(ellipse at center bottom, oklch(0.78 0.22 35 / 0.85), oklch(0.55 0.2 25 / 0.5) 40%, transparent 75%)",
          filter: "blur(6px)",
          mixBlendMode: "screen",
        }}
      />

      {/* Flames at the base — 5 staggered flame shapes */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32">
        <Flame leftPct={10}  width={42} height={70}  delay={0}    z={1} />
        <Flame leftPct={28}  width={56} height={92}  delay={0.25} z={2} />
        <Flame leftPct={48}  width={70} height={120} delay={0.05} z={3} />
        <Flame leftPct={70}  width={54} height={88}  delay={0.4}  z={2} />
        <Flame leftPct={88}  width={40} height={66}  delay={0.15} z={1} />
      </div>

      {/* Smoke wisps drifting up from the floor */}
      <Smoke leftPct={22} delay={0}   />
      <Smoke leftPct={55} delay={2.2} />
      <Smoke leftPct={78} delay={4.5} />
    </>
  );
}

function Flame({
  leftPct,
  width,
  height,
  delay,
  z,
}: {
  leftPct: number;
  width: number;
  height: number;
  delay: number;
  z: number;
}) {
  return (
    <span
      aria-hidden
      className="anim-flame absolute bottom-0"
      style={{
        left: `${leftPct}%`,
        marginLeft: -width / 2,
        width,
        height,
        background: `radial-gradient(ellipse at 50% 100%,
          oklch(0.96 0.18 92) 0%,
          oklch(0.82 0.22 60) 22%,
          oklch(0.65 0.24 35) 55%,
          oklch(0.45 0.2 20 / 0.6) 80%,
          transparent 100%)`,
        borderRadius: "48% 48% 24% 24% / 80% 80% 20% 20%",
        filter: "blur(1.5px)",
        mixBlendMode: "screen",
        animationDelay: `${delay}s`,
        zIndex: z,
      }}
    />
  );
}

function Smoke({ leftPct, delay }: { leftPct: number; delay: number }) {
  return (
    <span
      aria-hidden
      className="anim-smoke pointer-events-none absolute bottom-12"
      style={{
        left: `${leftPct}%`,
        width: 70,
        height: 70,
        borderRadius: "50%",
        background:
          "radial-gradient(circle, oklch(0.72 0.02 30 / 0.5), oklch(0.55 0.02 30 / 0.18) 50%, transparent 80%)",
        filter: "blur(8px)",
        animationDelay: `${delay}s`,
      }}
    />
  );
}
