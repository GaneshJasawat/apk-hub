import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, GitBranch, Lock, Globe, Plus, Code2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/repos/")({ component: ReposPage });

function ReposPage() {
  const [q, setQ] = useState("");
  const { data: repos = [], isLoading } = useQuery({
    queryKey: ["repos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repositories")
        .select("id,name,description,language,visibility,user_id,size_bytes,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = repos.filter((r) =>
    q === "" || r.name.toLowerCase().includes(q.toLowerCase()) ||
    (r.description ?? "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Code2 className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">Repositories</h1>
            </div>
            <p className="mt-1 text-muted-foreground">
              Share your source code as a ZIP. Public for everyone, or private for just you.
            </p>
          </div>
          <Link to="/repos/new">
            <Button className="gap-2 rounded-full">
              <Plus className="h-4 w-4" /> New repository
            </Button>
          </Link>
        </div>

        <div className="relative my-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search repositories…"
            className="pl-9 h-11 rounded-full"
          />
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-muted-foreground">No repositories yet.</p>
            <Link to="/repos/new" className="mt-4 inline-block">
              <Button className="mt-4 gap-2"><Plus className="h-4 w-4" /> Create the first one</Button>
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl bg-card p-5"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to="/repos/$id"
                      params={{ id: r.id }}
                      className="flex items-center gap-2 text-lg font-semibold text-primary hover:underline"
                    >
                      <GitBranch className="h-4 w-4 shrink-0" /> {r.name}
                    </Link>
                    {r.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {r.language && <span>{r.language}</span>}
                      {r.size_bytes != null && <span>{formatSize(r.size_bytes)}</span>}
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                      r.visibility === "public"
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-accent text-accent-foreground"
                    }`}
                  >
                    {r.visibility === "public" ? (
                      <><Globe className="h-3 w-3" /> Public</>
                    ) : (
                      <><Lock className="h-3 w-3" /> Private</>
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function formatSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}