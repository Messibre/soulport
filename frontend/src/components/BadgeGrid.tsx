type Badge = {
  id: bigint;
  name: string;
  image: string;
  metadata: string;
  amount: bigint;
};

type BadgeGridProps = {
  badges: Badge[];
};

export function BadgeGrid({ badges }: BadgeGridProps) {
  if (badges.length === 0) {
    return (
      <div className="alert">
        <span>
          No badges minted yet. Import Web2 data or verify skills to start.
        </span>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {badges.map((badge) => (
        <article
          key={badge.id.toString()}
          className="card border border-base-300 bg-base-200/60 overflow-hidden"
        >
          <figure>
            <img
              src={badge.image}
              alt={badge.name}
              className="h-36 w-full object-cover"
            />
          </figure>
          <div className="card-body p-4">
            <h3 className="font-semibold">{badge.name}</h3>
            <p className="text-xs opacity-70">
              Token ID #{badge.id.toString()}
            </p>
            <p className="text-xs opacity-70">IPFS: {badge.metadata}</p>
            <div className="badge badge-primary badge-outline">
              x{badge.amount.toString()}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
