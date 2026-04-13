import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Props = {
  src?: string | null;
  name?: string | null;
  className?: string;
  fallbackClassName?: string;
};

const initialsFromName = (name?: string | null) => {
  const parts = (name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return "CV";
  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
};

export default function ProfileAvatar({ src, name, className, fallbackClassName }: Props) {
  return (
    <Avatar className={className}>
      {src ? <AvatarImage src={src} alt={name || "Profile"} className="object-cover" /> : null}
      <AvatarFallback className={fallbackClassName || "bg-slate-950 text-white font-semibold"}>
        {initialsFromName(name)}
      </AvatarFallback>
    </Avatar>
  );
}
