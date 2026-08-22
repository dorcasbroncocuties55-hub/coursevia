/**
 * CoachServicesManager
 * Full CRUD for coaching services with Figma UI
 * Reads from coach_services table in Supabase
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import CoachLayout from "@/components/layouts/CoachLayout";
import { Plus, Search, Filter, Grid, MoreVertical, Folder, Calendar, Tag, DollarSign, User, Users, Activity, Smile, Sun, Moon, Heart, PlusCircle } from "lucide-react";
import { toast } from "sonner";

interface Service {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  category?: string;
  icon_color?: string;
  created_at: string;
}

const iconColors = [
  { bg: "#FFECE8", icon: "#E55B3C" },
  { bg: "#F2ECFE", icon: "#7F56D9" },
  { bg: "#EBF3FF", icon: "#2F80ED" },
  { bg: "#FFF1E6", icon: "#D97706" },
  { bg: "#EAF7EE", icon: "#10B981" },
  { bg: "#FFEBF5", icon: "#D53F8C" },
];

const iconOptions = [User, Users, Activity, Smile, Sun, Moon, Heart, Folder];

function getIconColor(index: number) {
  return iconColors[index % iconColors.length];
}

function getIcon(index: number) {
  const IconComponent = iconOptions[index % iconOptions.length];
  return IconComponent;
}

export default function CoachServicesManager() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Load services
  useEffect(() => {
    if (!user?.id) return;
    loadServices();
  }, [user?.id]);

  const loadServices = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("therapist_profiles")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!profile?.id) {
        setServices([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("coach_services")
        .select("*")
        .eq("coach_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setServices((data as Service[]) || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  // Computed stats
  const totalServices = services.length;
  const activeServices = services.filter(s => s.is_active).length;
  const totalBookings = 248; // TODO: calculate from bookings table
  const totalEarnings = services.reduce((sum, s) => sum + (s.price || 0), 0);

  // Filtered services
  const filtered = services.filter(s => {
    const matchesSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || s.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? s.is_active : !s.is_active);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <CoachLayout>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", padding: 40, gap: 32, background: "#F8FAFC", minHeight: 900 }}>

        {/* Header */}
        <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", maxWidth: 1260 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <h1 style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 28, lineHeight: "34px", color: "#0B4F60", margin: 0 }}>Services</h1>
            <p style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 14, lineHeight: "17px", color: "#64748B", margin: 0 }}>Manage the coaching services you offer to your clients.</p>
          </div>
          <button onClick={() => navigate("/therapist/services/new")} style={{ display: "flex", alignItems: "center", padding: "12px 18px", gap: 8, background: "#0B4F60", borderRadius: 8, border: "none", cursor: "pointer" }}>
            <Plus size={14} color="#fff" />
            <span style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 14, color: "#fff" }}>Add New Service</span>
          </button>
        </div>

        {/* KPI Row */}
        <div style={{ display: "flex", gap: 20, width: "100%", maxWidth: 1260, flexWrap: "wrap" }}>
          {[
            { label: "Total Services", value: totalServices, note: "All services created", icon: Folder, bg: "#EBF3FF", iconColor: "#2F80ED", valueColor: "#0F172A", noteColor: "#2F80ED" },
            { label: "Active Services", value: activeServices, note: "Currently active", icon: Calendar, bg: "#EEF2F6", iconColor: "#4F46E5", valueColor: "#0F172A", noteColor: "#4F46E5" },
            { label: "Total Bookings", value: totalBookings, note: "Across all services", icon: Tag, bg: "#FFF1E6", iconColor: "#D97706", valueColor: "#0F172A", noteColor: "#D97706" },
            { label: "Total Earnings", value: `$${totalEarnings.toFixed(2)}`, note: "From all services", icon: DollarSign, bg: "#EAF7EE", iconColor: "#10B981", valueColor: "#0F172A", noteColor: "#10B981" },
          ].map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", padding: 20, gap: 16, flex: "1 1 280px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16 }}>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: 48, height: 48, background: kpi.bg, borderRadius: 24 }}>
                  <Icon size={20} color={kpi.iconColor} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                  <span style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 13, color: "#64748B", textTransform: "uppercase" }}>{kpi.label}</span>
                  <span style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 28, color: kpi.valueColor }}>{kpi.value}</span>
                  <span style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 12, color: kpi.noteColor }}>{kpi.note}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filter Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", maxWidth: 1260, flexWrap: "wrap", gap: 12 }}>
          {/* Search */}
          <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", gap: 8, width: 300, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8 }}>
            <Search size={16} color="#64748B" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search services..." style={{ flex: 1, border: "none", outline: "none", fontFamily: "Inter", fontSize: 14, color: "#0F172A", background: "transparent" }} />
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 12 }}>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ display: "flex", alignItems: "center", padding: "10px 16px", gap: 8, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, fontFamily: "Inter", fontWeight: 500, fontSize: 14, color: "#0F172A", cursor: "pointer" }}>
              <option value="all">All Categories</option>
              <option value="individual">Individual</option>
              <option value="couples">Couples</option>
              <option value="family">Family</option>
              <option value="group">Group</option>
            </select>

            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ display: "flex", alignItems: "center", padding: "10px 16px", gap: 8, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, fontFamily: "Inter", fontWeight: 500, fontSize: 14, color: "#0F172A", cursor: "pointer" }}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <button style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 10, width: 36, height: 36, background: "#0B4F60", borderRadius: 8, border: "none", cursor: "pointer" }}>
              <Grid size={16} color="#fff" />
            </button>
          </div>
        </div>

        {/* Services Grid */}
        {loading ? (
          <div style={{ width: "100%", textAlign: "center", padding: 60, fontFamily: "Inter", color: "#64748B" }}>Loading services...</div>
        ) : filtered.length === 0 ? (
          <div style={{ width: "100%", maxWidth: 1260, textAlign: "center", padding: 60, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16 }}>
            <p style={{ fontFamily: "Inter", fontSize: 16, color: "#64748B", marginBottom: 20 }}>No services found</p>
            <button onClick={() => navigate("/therapist/services/new")} style={{ padding: "12px 24px", background: "#0B4F60", color: "#fff", border: "none", borderRadius: 8, fontFamily: "Inter", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
              Create Your First Service
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%", maxWidth: 1260 }}>
            {/* Grid rows (4 per row) */}
            {Array.from({ length: Math.ceil(filtered.length / 4) }).map((_, rowIndex) => (
              <div key={rowIndex} style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {filtered.slice(rowIndex * 4, rowIndex * 4 + 4).map((service, i) => {
                  const colorScheme = getIconColor(rowIndex * 4 + i);
                  const Icon = getIcon(rowIndex * 4 + i);
                  return (
                    <div key={service.id} style={{ display: "flex", flexDirection: "column", padding: 24, gap: 16, flex: "1 1 280px", maxWidth: 300, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16 }}>
                      {/* Top */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: 40, height: 40, background: colorScheme.bg, borderRadius: 20 }}>
                            <Icon size={18} color={colorScheme.icon} />
                          </div>
                          <h3 style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 16, color: "#0F172A", margin: 0 }}>{service.title}</h3>
                        </div>
                        <button style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 0 8px" }}>
                          <MoreVertical size={16} color="#64748B" />
                        </button>
                      </div>

                      {/* Description */}
                      <p style={{ fontFamily: "Inter", fontSize: 14, lineHeight: "140%", color: "#64748B", margin: 0, minHeight: 40, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {service.description || "No description provided"}
                      </p>

                      {/* Divider */}
                      <div style={{ height: 0, border: "1px solid #E2E8F0" }} />

                      {/* Footer */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: 24 }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{service.duration_minutes} min</span>
                            <span style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 11, color: "#64748B" }}>Duration</span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 14, color: "#0F172A" }}>${service.price}</span>
                            <span style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 11, color: "#64748B" }}>Price</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", padding: "4px 10px", background: service.is_active ? "#EAF7EE" : "#F1F5F9", borderRadius: 100 }}>
                          <span style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 12, color: service.is_active ? "#10B981" : "#64748B" }}>
                            {service.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Bottom Banner */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 24, width: "100%", maxWidth: 1260, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: 48, height: 48, background: "#EBF3FF", borderRadius: 24 }}>
              <PlusCircle size={20} color="#2F80ED" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 16, color: "#0F172A" }}>Offer a new service</span>
              <span style={{ fontFamily: "Inter", fontSize: 14, color: "#64748B" }}>Add a new coaching service to help more clients and grow your practice.</span>
            </div>
          </div>
          <button onClick={() => navigate("/therapist/services/new")} style={{ padding: "10px 16px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, fontFamily: "Inter", fontWeight: 600, fontSize: 14, color: "#0B4F60", cursor: "pointer" }}>
            Add New Service
          </button>
        </div>
      </div>
    </CoachLayout>
  );
}
