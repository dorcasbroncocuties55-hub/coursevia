import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, BookOpen } from "lucide-react";

const DEFAULT_COURSE_CATEGORIES = [
  "Development", "Business", "Design", "Marketing", "Finance",
  "Health & Wellness", "Technology", "Personal Development",
  "Photography", "Music", "Language", "Data Science",
  "Cybersecurity", "Cloud Computing", "AI & Machine Learning",
  "Entrepreneurship", "Leadership", "Communication",
];

const AdminCategories = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      setCategories(data || []);
    } catch (e) {
      // Table might not exist yet - show empty state
      setCategories([]);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const addCategory = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const { error } = await supabase.from("categories").insert({ name: newName.trim(), slug });
    if (error) toast.error(error.message);
    else { toast.success("Category added"); setNewName(""); fetchCategories(); }
    setAdding(false);
  };

  const seedDefaults = async () => {
    let added = 0;
    for (const name of DEFAULT_COURSE_CATEGORIES) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const { error } = await supabase.from("categories").insert({ name, slug });
      if (!error) added++;
    }
    toast.success(`Added ${added} default course categories`);
    fetchCategories();
  };

  const deleteCategory = async (id: string) => {
    await supabase.from("categories").delete().eq("id", id);
    toast.success("Category removed");
    fetchCategories();
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Course Categories</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage categories shown on the courses page</p>
          </div>
          {categories.length === 0 && (
            <Button variant="outline" size="sm" onClick={seedDefaults}>
              <BookOpen size={14} className="mr-1.5" /> Seed Default Categories
            </Button>
          )}
        </div>

        {/* Add new */}
        <div className="flex gap-2 max-w-md">
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="New category name (e.g. Data Science)"
            onKeyDown={e => e.key === "Enter" && addCategory()}
          />
          <Button onClick={addCategory} disabled={adding || !newName.trim()}>
            <Plus size={16} className="mr-1" /> Add
          </Button>
        </div>

        {/* List */}
        {categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <BookOpen size={32} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-3">No categories yet</p>
            <Button size="sm" onClick={seedDefaults}>Seed Default Course Categories</Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {categories.map(c => (
              <div key={c.id} className="rounded-xl border border-border bg-card p-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-sm font-medium text-foreground">{c.name}</span>
                </div>
                <button onClick={() => deleteCategory(c.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminCategories;
