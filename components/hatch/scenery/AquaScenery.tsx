"use client";

/**
 * Aqua-specific tank layers: a drifting caustic light spot on the floor
 * + a few slim kelp silhouettes swaying at the back.
 */
export function AquaScenery() {
  return (
    <>
      {/* Drifting caustic light spot on the floor */}
      <div
        aria-hidden
        className="anim-floor-caustic pointer-events-none absolute bottom-1 left-1/2"
        style={{
          width: "55%",
          height: 36,
          background:
            "radial-gradient(ellipse at center, oklch(0.95 0.07 200 / 0.85), oklch(0.82 0.1 220 / 0.4) 40%, transparent 80%)",
          filter: "blur(8px)",
          mixBlendMode: "screen",
          transform: "translateX(-50%)",
        }}
      />

      {/* Slim kelp silhouettes — 4 strands at the back, gently swaying */}
      <Kelp leftPct={6}  height={140} delay={0}   />
      <Kelp leftPct={14} height={100} delay={0.7} />
      <Kelp leftPct={84} height={120} delay={0.3} />
      <Kelp leftPct={93} height={90}  delay={1.0} />
    </>
  );
}

function Kelp({
  leftPct,
  height,
  delay,
}: {
  leftPct: number;
  height: number;
  delay: number;
}) {
  return (
    <span
      aria-hidden
      className="anim-kelp absolute bottom-0"
      style={{
        left: `${leftPct}%`,
        width: 6,
        height,
        background:
          "linear-gradient(to top, oklch(0.18 0.1 200 / 0.85), oklch(0.28 0.12 195 / 0.65) 60%, transparent)",
        borderRadius: "50%",
        filter: "blur(0.8px)",
        animationDelay: `${delay}s`,
      }}
    />
  );
}
