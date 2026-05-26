export default function FamilyPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-12">
      <div className="px-1">
        <p className="font-pixel text-[10px] uppercase tracking-[0.25em] text-primary">
          Family Album
        </p>
        <h1 className="font-pixel mt-1 text-2xl text-foreground sm:text-3xl">
          Your grown creatures.
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Every blob that reaches Adult joins this grid — with its species,
          name, birthdate, and the friends who helped raise it.
        </p>
      </div>

      <div className="cartridge grid min-h-72 place-items-center p-8">
        <div className="text-center">
          <p aria-hidden className="text-4xl">🐾</p>
          <p className="font-pixel mt-4 text-[10px] uppercase tracking-wider text-muted-foreground">
            Nobody has grown up yet.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Feed your blob every day and they&apos;ll show up here.
          </p>
        </div>
      </div>
    </div>
  );
}
