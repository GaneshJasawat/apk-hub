import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/install/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { data: app, error } = await supabaseAdmin
          .from("apps")
          .select("id,title,apk_url,web_url,app_type,downloads")
          .eq("id", params.id)
          .maybeSingle();
        if (error) return new Response(error.message, { status: 500 });

        // Fire-and-forget download counter bump
        supabaseAdmin
          .from("apps")
          .update({ downloads: (app.downloads ?? 0) + 1 })
          .eq("id", app.id)
          .then(() => {});

        if (app.app_type === "weblink" && app.web_url) {
          return new Response(null, {
            status: 302,
            headers: { Location: app.web_url },
          });
        }

        if (!app?.apk_url) return new Response("APK not found", { status: 404 });

        const upstream = await fetch(app.apk_url);
        if (!upstream.ok || !upstream.body) {
          return new Response("Upstream fetch failed", { status: 502 });
        }

        const safe = app.title.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 60) || "app";
        const headers = new Headers();
        headers.set("Content-Type", "application/vnd.android.package-archive");
        headers.set("Content-Disposition", `attachment; filename="${safe}.apk"`);
        const len = upstream.headers.get("content-length");
        if (len) headers.set("Content-Length", len);
        headers.set("Cache-Control", "public, max-age=300");
        headers.set("X-Content-Type-Options", "nosniff");

        return new Response(upstream.body, { status: 200, headers });
      },
    },
  },
});