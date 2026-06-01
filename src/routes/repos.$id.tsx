import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Download, GitBranch, Lock, Globe, Trash2, Code2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getRepoDownloadUrl, deleteRepo } from "@/lib/repos.functions";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/repos/$id")({
  component: RepoDetail,
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center">
      <div className="text-center">
        <p className="text-muted-foreground">Repository not found.</p>
        <Link to="/repos" className="mt-4 inline-block text-primary underline">Back to repositories</Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="grid min-h-screen place-items-center">
      <p className="text-muted-foreground">{error.message}</p>
    </div>
  ),
});

function RepoDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();

  const { data: repo, isLoading } = useQuery({
    queryKey: ["repo", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repositories")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <p className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground">Loading…</p>
      </div>
    );
  }
  if (!repo) return null;

  const canManage = user?.id === repo.user_id || isAdmin;

  async function download() {
    if (!repo) return;
    try {
      const { url } = await getRepoDownloadUrl({ data: { repoId: repo.id } });
      window.open(url, "_blank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  }

  async function onDelete() {
    if (!repo) return;
    if (!confirm("Delete this repository and its source code?")) return;
    try {
      await deleteRepo({ data: { repoId: repo.id } });
      toast.success("Repository deleted");
      qc.invalidateQueries({ queryKey: ["repos"] });
      window.location.href = "/repos";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link to="/repos" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All repositories
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
              <GitBranch className="h-6 w-6 text-primary" /> {repo.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                  repo.visibility === "public"
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-accent text-accent-foreground"
                }`}
              >
                {repo.visibility === "public" ? (
                  <><Globe className="h-3 w-3" /> Public</>
                ) : (
                  <><Lock className="h-3 w-3" /> Private</>
                )}
              </span>
              {repo.language && <span>· {repo.language}</span>}
              {repo.size_bytes != null && <span>· {formatSize(repo.size_bytes)}</span>}
              <span>· Created {new Date(repo.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={download} size="lg" className="gap-2 rounded-full">
              <Download className="h-4 w-4" /> Download ZIP
            </Button>
            {canManage && (
              <Button onClick={onDelete} size="lg" variant="destructive" className="gap-2 rounded-full">
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
          </div>
        </div>

        <section className="mt-8 rounded-2xl bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Code2 className="h-4 w-4" /> About
          </div>
          <p className="mt-2 whitespace-pre-wrap text-card-foreground/90">
            {repo.description || "No description provided."}
          </p>
        </section>
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