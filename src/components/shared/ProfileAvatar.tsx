import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Props = {
  src?: string | null;
  name?: string | null;
  className?: string;
  fallbackClassName?: string;
  asImage?: boolean; // Show as regular image instead of circular avatar
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

export default function ProfileAvatar({ src, name, className, fallbackClassName, asImage }: Props) {
  // If asImage is true and we have a src, show it as a regular image
  if (asImage && src) {
    return (
      <img 
        src={src} 
        alt={name || "Profile"} 
        className={`object-cover ${className || ""}`}
      />
    );
  }

  // If asImage is true but no src, show initials in a rounded square
  if (asImage) {
    return (
      <div className={`flex items-center justify-center rounded-lg ${fallbackClassName || "bg-slate-950 text-white font-semibold"} ${className || ""}`}>
        {initialsFromName(name)}
      </div>
    );
  }

  // Default circular avatar behavior
  return (
    <Avatar className={className}>
      {src ? <AvatarImage src={src} alt={name || "Profile"} className="object-cover" /> : null}
      <AvatarFallback className={fallbackClassName || "bg-slate-950 text-white font-semibold"}>
        {initialsFromName(name)}
      </AvatarFallback>
    </Avatar>
  );
}
