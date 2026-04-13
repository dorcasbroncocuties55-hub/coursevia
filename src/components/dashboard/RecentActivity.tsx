import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type: "booking" | "payment" | "course" | "video" | "message";
  title: string;
  description: string;
  timestamp: string;
  status?: "success" | "pending" | "failed";
  href?: string;
}

interface RecentActivityProps {
  title: string;
  items: ActivityItem[];
  loading?: boolean;
  emptyMessage?: string;
  viewAllHref?: string;
}

const getActivityIcon = (type: ActivityItem["type"]) => {
  switch (type) {
    case "booking":
      return "📅";
    case "payment":
      return "💳";
    case "course":
      return "📚";
    case "video":
      return "🎥";
    case "message":
      return "💬";
    default:
      return "📋";
  }
};

const getStatusColor = (status?: ActivityItem["status"]) => {
  switch (status) {
    case "success":
      return "bg-emerald-100 text-emerald-700";
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "failed":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export const RecentActivity = ({
  title,
  items,
  loading = false,
  emptyMessage = "No recent activity",
  viewAllHref,
}: RecentActivityProps) => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {viewAllHref && (
          <Link
            to={viewAllHref}
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View all
          </Link>
        )}
      </div>

      {loading ? (
        <div className="px-6 py-8 text-center">
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : !items.length ? (
        <div className="px-6 py-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm text-gray-500 mb-1">{emptyMessage}</p>
          <p className="text-xs text-gray-400">Your recent activity will appear here</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {items.map((item) => {
            const content = (
              <div className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="text-2xl">{getActivityIcon(item.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.title}
                    </p>
                    {item.status && (
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mb-1">
                    {item.description}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );

            if (item.href) {
              return (
                <Link key={item.id} to={item.href}>
                  {content}
                </Link>
              );
            }

            return <div key={item.id}>{content}</div>;
          })}
        </div>
      )}
    </div>
  );
};