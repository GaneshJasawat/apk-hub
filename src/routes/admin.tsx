import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, Shield, ExternalLink, Database, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const { user, loading } = useAuth();
  const isAdmin = useIsAdmin();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupResult, setSetupResult] = useState<string[] | null>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["admin-apps"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apps")
        .select("id,title,category,downloads,created_at,user_id,app_type")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function remove(id: string) {
    if (!confirm("Delete this app permanently?")) return;
    const { error } = await supabase.from("apps").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("App deleted");
      qc.invalidateQueries({ queryKey: ["admin-apps"] });
      qc.invalidateQueries({ queryKey: ["apps"] });
    }
  }

  if (loading) return null;
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="mx-auto max-w-2xl px-4 py-20 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Admins only</h1>
          <p className="mt-2 text-muted-foreground">You don't have access to this page.</p>
          <Link to="/" className="mt-6 inline-block">
            <Button>Back to store</Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        </div>
        <p className="mt-1 text-muted-foreground">Manage every app on the platform.</p>

        <div
          className="mt-8 overflow-hidden rounded-2xl bg-card"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          {isLoading ? (
            <p className="p-6 text-muted-foreground">Loading…</p>
          ) : apps.length === 0 ? (
            <p className="p-6 text-muted-foreground">No apps yet.</p>
          ) : (
              <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Downloads</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{a.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${a.app_type === "weblink" ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}`}>
                        {a.app_type === "weblink" ? "Web" : "APK"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{a.category}</td>
                    <td className="px-4 py-3">{a.downloads}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <Link to="/app/$id" params={{ id: a.id }}>
                          <Button size="sm" variant="outline" className="gap-1">
                            <ExternalLink className="h-3.5 w-3.5" /> View
                          </Button>
                        </Link>
                        <Button size="sm" variant="destructive" className="gap-1" onClick={() => remove(a.id)}>
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <section className="mt-10 rounded-2xl bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Storage setup</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Create or update Supabase storage buckets (icons, screenshots, videos, apks)
            with a 500 MB per-file limit. Requires <code>ADMIN_SECRET</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code>
            set in your environment variables.
          </p>
          <details className="mt-2 text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">Show setup SQL (run in Supabase SQL Editor)</summary>
            <pre className="mt-1 overflow-auto rounded-lg bg-muted p-3 text-xs">
{`-- Run this in https://supabase.com/dashboard/project/woxvwvzvzclwnwkqhcsu/sql/new
insert into storage.buckets (id, name, public) values
  ('icons','icons',true),
  ('screenshots','screenshots',true),
  ('videos','videos',true),
  ('apks','apks',true)
on conflict (id) do nothing;

create policy "public_read_assets" on storage.objects for select
  using (bucket_id in ('icons','screenshots','videos','apks'));

create policy "auth_upload_assets" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('icons','screenshots','videos','apks')
    and (storage.foldername(name))[1] = auth.uid()::text
  );`}
            </pre>
          </details>
          <div className="mt-4 flex items-center gap-3">
            <Button disabled={setupBusy} onClick={async () => {
              setSetupBusy(true);
              setSetupResult(null);
              try {
                const secret = prompt("Enter ADMIN_SECRET:") || "";
                if (!secret) return;
                const res = await fetch("/api/admin/setup-storage", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ secret }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Request failed");
                setSetupResult(data.results ?? []);
                toast.success("Storage buckets ready");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Setup failed");
              } finally {
                setSetupBusy(false);
              }
            }}>
              <Database className="h-4 w-4" /> {setupBusy ? "Setting up..." : "Init storage buckets"}
            </Button>
          </div>
          {setupResult && (
            <ul className="mt-3 space-y-1 text-sm">
              {setupResult.map((r, i) => {
                const ok = !r.includes("error=");
                return (
                  <li key={i} className="flex items-center gap-1.5">
                    {ok ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                    {r}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
