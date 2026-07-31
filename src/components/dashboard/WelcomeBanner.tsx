import { ReactNode } from "react";
import { Link } from "react-router-dom";

interface WelcomeBannerProps {
  role: string;
  userName: string;
  subtitle: string;
  isVerified?: boolean;
  primaryAction?: {
    label: string;
    href: string;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
  gradient?: "blue" | "teal" | "purple" | "green";
}

const gradientClasses = {
  blue: "from-blue-600 to-blue-700",
  teal: "from-teal-600 to-cyan-600",
  purple: "from-purple-600 to-indigo-600",
  green: "from-emerald-600 to-green-600",
};

export const WelcomeBanner = ({
  role,
  userName,
  subtitle,
  isVerified,
  primaryAction,
  secondaryAction,
  gradient = "teal",
}: WelcomeBannerProps) => {
  return (
    <div className={`rounded-2xl bg-gradient-to-r ${gradientClasses[gradient]} p-8 text-white shadow-lg`}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <p className="text-sm font-medium text-white/80 capitalize">{role} Dashboard</p>
            {isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-xs font-medium">
                ✓ Verified
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {userName} 👋
          </h1>
          <p className="text-white/90 text-lg max-w-2xl">
            {subtitle}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {primaryAction && (
            <Link
              to={primaryAction.href}
              className="rounded-lg bg-white/20 backdrop-blur-sm px-6 py-3 text-sm font-semibold text-white hover:bg-white/30 transition-colors"
            >
              {primaryAction.label}
            </Link>
          )}
          {secondaryAction && (
            <Link
              to={secondaryAction.href}
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-white/90 transition-colors"
            >
              {secondaryAction.label}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};