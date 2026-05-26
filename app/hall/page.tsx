export default function HallPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-12">
      <div className="px-1">
        <p className="font-pixel text-[10px] uppercase tracking-[0.25em] text-primary">
          The Hall
        </p>
        <h1 className="font-pixel mt-1 text-2xl text-foreground sm:text-3xl">
          What&apos;s happening in the network.
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          A live feed of evolutions, hatchings, and feeding chains across the
          Circles trust graph.
        </p>
      </div>

      <div className="cartridge grid min-h-72 place-items-center p-8">
        <div className="text-center">
          <p aria-hidden className="text-4xl">🌊</p>
          <p className="font-pixel mt-4 text-[10px] uppercase tracking-wider text-muted-foreground">
            Nothing to show yet.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            The hall fills up when the network starts moving.
          </p>
        </div>
      </div>
    </div>
  );
}
