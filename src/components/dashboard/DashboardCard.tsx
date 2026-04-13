import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";

interface DashboardCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  href?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  color?: "blue" | "green" | "purple" | "orange" | "red" | "teal";
  loading?: boolean;
}

const colorClasses = {
  blue: "bg-blue-50 text-blue-600 border-blue-100",
  green: "bg-emerald-50 text-emerald-600 border-emerald-100",
  purple: "bg-purple-50 text-purple-600 border-purple-100",
  orange: "bg-orange-50 text-orange-600 border-orange-100",
  red: "bg-red-50 text-red-600 border-red-100",
  teal: "bg-teal-50 text-teal-600 border-teal-100",
};

export const DashboardCard = ({
  title,
  value,
  description,
  icon,
  href,
  trend,
  color = "blue",
  loading = false,
}: DashboardCardProps) => {
  const content = (
    <div className={`rounded-xl border bg-white p-6 shadow-sm transition-all hover:shadow-md ${href ? "cursor-pointer hover:border-primary/30" : ""}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
          <p className="text-3xl font-bold text-foreground mb-1">
            {loading ? (
              <span className="animate-pulse bg-muted rounded h-8 w-16 block"></span>
            ) : (
              value
            )}
          </p>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.isPositive ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={`text-sm font-medium ${trend.isPositive ? "text-emerald-600" : "text-red-600"}`}>
                {trend.value}%
              </span>
              <span className="text-sm text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`rounded-lg p-3 ${colorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>
      {href && (
        <div className="flex items-center gap-1 mt-4 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          View details <ArrowRight className="h-4 w-4" />
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="group">
        {content}
      </Link>
    );
  }

  return content;
};