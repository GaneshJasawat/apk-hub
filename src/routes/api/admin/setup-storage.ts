import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/admin/setup-storage")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as { secret?: string };
          if (body.secret !== process.env.ADMIN_SECRET) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401,
              headers: { "content-type": "application/json" },
            });
          }

          const required = ["icons", "screenshots", "videos", "apks"];
          const existing = await supabaseAdmin.storage.listBuckets();
          const existingIds = new Set(existing.data?.map((b) => b.id) ?? []);

          const results: string[] = [];
          for (const id of required) {
            if (!existingIds.has(id)) {
              const { error } = await supabaseAdmin.storage.createBucket(id, {
                public: true,
                fileSizeLimit: 524288000,
              });
              if (error) results.push(`${id}: error=${error.message}`);
              else results.push(`${id}: created`);
            } else {
              const { error } = await supabaseAdmin.storage.updateBucket(id, {
                public: true,
                fileSizeLimit: 524288000,
              });
              if (error) results.push(`${id}: update error=${error.message}`);
              else results.push(`${id}: exists, limit updated`);
            }
          }

          return new Response(JSON.stringify({ ok: true, results }), {
            headers: { "content-type": "application/json" },
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: String(err) }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
