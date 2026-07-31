type Props = {
  badges?: Array<{
    id: string;
    name: string;
    description?: string | null;
  }>;
};

export default function ProviderBadgeList({ badges = [] }: Props) {
  if (!badges.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <span
          key={badge.id}
          className="inline-flex items-center rounded-full border bg-white px-3 py-1 text-xs font-semibold shadow-sm"
          title={badge.description || badge.name}
        >
          🏆 {badge.name}
        </span>
      ))}
    </div>
  );
}