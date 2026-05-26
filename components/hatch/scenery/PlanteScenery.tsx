"use client";

/**
 * Plante-specific tank layers: dappled sun rays from above + a thick
 * carpet of grass tufts at the floor.
 */
export function PlanteScenery() {
  return (
    <>
      {/* Dappled sun rays — 2 diagonal beams from the top */}
      <Sunray topPct={-5}  leftPct={-15} width={55} skew={-22} delay={0}   />
      <Sunray topPct={-10} leftPct={35}  width={40} skew={-18} delay={1.5} />

      {/* Forest-floor carpet: 8 grass tufts of varied heights */}
      <Grass leftPct={4}  height={38} delay={0}   shade={0.85} />
      <Grass leftPct={12} height={52} delay={0.4} shade={1}    />
      <Grass leftPct={22} height={32} delay={0.2} shade={0.78} />
      <Grass leftPct={32} height={46} delay={0.9} shade={0.95} />
      <Grass leftPct={62} height={42} delay={0.55} shade={0.88} />
      <Grass leftPct={72} height={58} delay={0.1} shade={1}    />
      <Grass leftPct={82} height={36} delay={0.7} shade={0.82} />
      <Grass leftPct={92} height={50} delay={0.3} shade={0.92} />
    </>
  );
}

function Sunray({
  topPct,
  leftPct,
  width,
  skew,
  delay,
}: {
  topPct: number;
  leftPct: number;
  width: number;
  skew: number;
  delay: number;
}) {
  return (
    <div
      aria-hidden
      className="anim-sunray pointer-events-none absolute"
      style={{
        top: `${topPct}%`,
        left: `${leftPct}%`,
        width: `${width}%`,
        height: "130%",
        background:
          "linear-gradient(165deg, oklch(0.95 0.14 90 / 0.55) 0%, oklch(0.85 0.16 95 / 0.25) 35%, transparent 70%)",
        transform: `skewX(${skew}deg)`,
        filter: "blur(10px)",
        mixBlendMode: "screen",
        animationDelay: `${delay}s`,
      }}
    />
  );
}

function Grass({
  leftPct,
  height,
  delay,
  shade,
}: {
  leftPct: number;
  height: number;
  delay: number;
  shade: number;
}) {
  return (
    <span
      aria-hidden
      className="anim-grass absolute bottom-0"
      style={{
        left: `${leftPct}%`,
        width: 4,
        height,
        background: `linear-gradient(to top,
          oklch(0.22 0.12 145 / ${shade}),
          oklch(0.45 0.18 130 / ${shade * 0.85}),
          oklch(0.6  0.18 120 / 0))`,
        borderRadius: "50% 50% 30% 30%",
        filter: "blur(0.5px)",
        animationDelay: `${delay}s`,
      }}
    />
  );
}
