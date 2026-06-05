import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Download, ArrowLeft, Package, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { getCached, setCache } from "@/lib/offline-cache";

export const Route = createFileRoute("/app/$id")({
  component: AppDetail,
  errorComponent: ({ error }) => (
    <div className="grid min-h-screen place-items-center">
      <p className="text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center">
      <div className="text-center">
        <p className="text-muted-foreground">App not found.</p>
        <Link to="/" className="mt-4 inline-block text-primary underline">Back home</Link>
      </div>
    </div>
  ),
});

function AppDetail() {
  const { id } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["app", id],
    queryFn: async () => {
      const { data: app, error } = await supabase
        .from("apps")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!app) throw notFound();
      const { data: shots } = await supabase
        .from("app_screenshots")
        .select("*")
        .eq("app_id", id)
        .order("position", { ascending: true });
      const result = { app, shots: shots ?? [] };
      setCache(`app:${id}`, result);
      return result;
    },
    retry: false,
  });

  const [cachedDetail, setCachedDetail] = useState<any>(undefined);
  useEffect(() => {
    getCached<any>(`app:${id}`).then(setCachedDetail);
  }, [id]);

  const displayData = data ?? cachedDetail;
  const loading = isLoading && !cachedDetail;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <p className="mx-auto max-w-4xl px-4 py-10 text-muted-foreground">Loading...</p>
      </div>
    );
  }
  if (!displayData) return null;
  const { app, shots } = displayData;

  const isWeblink = app.app_type === "weblink";
  const installHref = !isWeblink && app.apk_url ? `/api/public/install/${app.id}` : undefined;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="h-28 w-28 shrink-0 overflow-hidden rounded-3xl bg-muted">
            {app.icon_url ? (
              <img src={app.icon_url} alt={app.title} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-primary-foreground" style={{ backgroundImage: "var(--gradient-primary)" }}>
                <Package className="h-12 w-12" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{app.title}</h1>
              <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${isWeblink ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}`}>
                {isWeblink ? <><Globe className="h-3 w-3" /> Web</> : "APK"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {app.category}{app.version ? ` \u2022 v${app.version}` : ""}{app.package_name ? ` \u2022 ${app.package_name}` : ""}
            </p>
            {app.short_description && <p className="mt-2 text-base">{app.short_description}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {isWeblink ? (
                <a href={app.web_url || "#"} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="gap-2 rounded-full">
                    <Globe className="h-4 w-4" /> Open Web Link
                  </Button>
                </a>
              ) : (
                <Button asChild={!!installHref} disabled={!installHref} size="lg" className="gap-2 rounded-full">
                  {installHref ? (
                    <a href={installHref}>
                      <Download className="h-4 w-4" /> Install APK
                    </a>
                  ) : (
                    <span><Download className="h-4 w-4" /> No APK uploaded</span>
                  )}
                </Button>
              )}
              <span className="text-sm text-muted-foreground">{app.downloads} downloads</span>
            </div>
          </div>
        </div>

        {app.video_url && (
          <section className="mt-10">
            <h2 className="mb-3 text-lg font-semibold">Trailer</h2>
            <video src={app.video_url} controls className="w-full rounded-2xl bg-black" />
          </section>
        )}

        {shots.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-lg font-semibold">Screenshots</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {shots.map((s) => (
                <img
                  key={s.id}
                  src={s.image_url}
                  alt="screenshot"
                  className="h-72 w-auto rounded-2xl object-cover"
                  style={{ boxShadow: "var(--shadow-card)" }}
                />
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">About this app</h2>
          <p className="whitespace-pre-wrap text-card-foreground/90">{app.description || "No description provided."}</p>
        </section>
      </main>
    </div>
  );
}
