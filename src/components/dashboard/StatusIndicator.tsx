import { ReactNode } from "react";
import { CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";

interface StatusIndicatorProps {
  label: string;
  status: "success" | "warning" | "error" | "pending";
  value: string;
  description?: string;
  icon?: ReactNode;
}

const statusConfig = {
  success: {
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    iconColor: "text-emerald-500",
    defaultIcon: CheckCircle,
  },
  warning: {
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    iconColor: "text-amber-500",
    defaultIcon: AlertCircle,
  },
  error: {
    bgColor: "bg-red-50",
    textColor: "text-red-700",
    iconColor: "text-red-500",
    defaultIcon: XCircle,
  },
  pending: {
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    iconColor: "text-blue-500",
    defaultIcon: Clock,
  },
};

export const StatusIndicator = ({
  label,
  status,
  value,
  description,
  icon,
}: StatusIndicatorProps) => {
  const config = statusConfig[status];
  const IconComponent = icon || config.defaultIcon;

  return (
    <div className={`rounded-xl border ${config.bgColor} px-4 py-4 shadow-sm`}>
      <div className="flex items-center gap-3">
        <IconComponent className={`h-5 w-5 ${config.iconColor}`} />
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            {label}
          </p>
          <p className={`text-sm font-semibold ${config.textColor} mt-1`}>
            {value}
          </p>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
};