import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface QuickAction {
  label: string;
  href: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
  priority?: "high" | "medium" | "low";
}

interface QuickActionsProps {
  title: string;
  actions: QuickAction[];
}

export const QuickActions = ({ title, actions }: QuickActionsProps) => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {actions.map((action) => (
          <Link
            key={action.href}
            to={action.href}
            className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group"
          >
            <div className="flex items-center gap-4">
              {action.icon && (
                <div className="rounded-lg bg-gray-100 p-2 group-hover:bg-gray-200 transition-colors">
                  <action.icon className="h-5 w-5 text-gray-600" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{action.label}</p>
                  {action.badge && (
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      action.priority === "high"
                        ? "bg-red-100 text-red-700"
                        : action.priority === "medium"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      {action.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">{action.description}</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
};