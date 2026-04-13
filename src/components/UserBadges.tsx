export default function UserBadges({ badges }) {
  return (
    <div>
      {badges.map((b) => (
        <span key={b.id} className="badge">
          🏆 {b.name}
        </span>
      ))}
    </div>
  );
}