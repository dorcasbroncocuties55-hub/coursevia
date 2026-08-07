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
  // Always show actual image if src exists and asImage is true
  if (asImage) {
    if (src) {
      return (
        <img 
          src={src} 
          alt={name || "Profile"} 
          className={`object-cover rounded-lg ${className || ""}`}
          onError={(e) => {
            // If image fails to load, hide it and show initials
            e.currentTarget.style.display = 'none';
            const fallback = document.createElement('div');
            fallback.className = `flex items-center justify-center rounded-lg ${fallbackClassName || "bg-slate-950 text-white font-semibold"} ${className || ""}`;
            fallback.textContent = initialsFromName(name);
            e.currentTarget.parentElement?.appendChild(fallback);
          }}
        />
      );
    }
    // No src - show initials in rounded square
    return (
      <div className={`flex items-center justify-center rounded-lg ${fallbackClassName || "bg-slate-950 text-white font-semibold"} ${className || ""}`}>
        {initialsFromName(name)}
      </div>
    );
  }

  // Default circular avatar behavior (when asImage is false)
  return (
    <Avatar className={className}>
      {src ? <AvatarImage src={src} alt={name || "Profile"} className="object-cover" /> : null}
      <AvatarFallback className={fallbackClassName || "bg-slate-950 text-white font-semibold"}>
        {initialsFromName(name)}
      </AvatarFallback>
    </Avatar>
  );
}
