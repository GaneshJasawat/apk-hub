import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Search, Upload, Sparkles, Globe, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { AppCard } from "@/components/AppCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Home });

const CATEGORIES = ["All", "Games", "Tools", "Social", "Productivity", "Entertainment", "Education", "Other"];
const TYPE_FILTERS = ["All", "APK", "Web"];

function Home() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["apps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apps")
        .select("id,title,short_description,category,icon_url,downloads,created_at,app_type")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const result = data ?? [];
      setCache("apps", result);
      return result;
    },
  });

  const [cachedApps, setCachedApps] = useState<any[] | null>(null);
  useEffect(() => {
    getCached<any[]>("apps").then(setCachedApps);
  }, []);

  const displayApps = (isLoading ? cachedApps : apps) ?? [];
  const loading = isLoading && !cachedApps;

  const filtered = displayApps.filter(
    (a) =>
      (cat === "All" || a.category === cat) &&
      (typeFilter === "All" || (typeFilter === "APK" ? a.app_type === "apk" : a.app_type === "weblink")) &&
      (q === "" || a.title.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <section
        className="relative overflow-hidden text-primary-foreground"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 0, transparent 40%), radial-gradient(circle at 80% 80%, white 0, transparent 40%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="flex items-center gap-2 text-sm font-medium opacity-90">
            <Sparkles className="h-4 w-4" /> An indie app marketplace
          </div>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight sm:text-6xl">
            Publish your app. Reach the world.
          </h1>
          <p className="mt-4 max-w-xl text-lg opacity-90">
            Upload your APK or link your web app with screenshots, a trailer and a great description.
            Browse what other creators are building.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/upload">
              <Button size="lg" variant="secondary" className="gap-2 rounded-full">
                <Upload className="h-4 w-4" /> Upload your app
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search apps..."
            className="pl-9 h-12 rounded-full"
          />
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                typeFilter === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {t === "All" ? null : t === "APK" ? <Package className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
              {t}
            </button>
          ))}
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                cat === c
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <h2 className="mb-4 text-xl font-bold tracking-tight">
          {cat === "All" ? "Recently added" : cat}
        </h2>

        {loading ? (
          <p className="text-muted-foreground">Loading apps...</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-muted-foreground">No apps yet. Be the first to upload!</p>
            <Link to="/upload" className="mt-4 inline-block">
              <Button className="mt-4">Upload an app</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((a) => (
              <AppCard key={a.id} {...a} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
