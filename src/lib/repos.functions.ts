import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Anyone can request a download URL; private repos require owner or admin.
export const getRepoDownloadUrl = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ repoId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: repo, error } = await supabaseAdmin
      .from("repositories")
      .select("id,user_id,visibility,zip_path,name")
      .eq("id", data.repoId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!repo) throw new Error("Repository not found");
    if (!repo.zip_path) throw new Error("No source code uploaded");

    if (repo.visibility === "private") {
      // Verify caller via bearer token
      const { getRequest } = await import("@tanstack/react-start/server");
      const req = getRequest();
      const auth = req?.headers.get("authorization") ?? "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) throw new Error("Sign in required for private repository");
      const { data: claims } = await supabaseAdmin.auth.getClaims(token);
      const uid = claims?.claims?.sub;
      if (!uid) throw new Error("Invalid session");
      if (uid !== repo.user_id) {
        const { data: role } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", uid)
          .eq("role", "admin")
          .maybeSingle();
        if (!role) throw new Error("You don't have access to this repository");
      }
    }

    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("repos")
      .createSignedUrl(repo.zip_path, 60 * 10, { download: `${repo.name}.zip` });
    if (sErr) throw new Error(sErr.message);
    return { url: signed.signedUrl };
  });

// Authenticated server fn for owner to delete a repo (also removes storage object).
export const deleteRepo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ repoId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: repo } = await supabaseAdmin
      .from("repositories")
      .select("user_id,zip_path")
      .eq("id", data.repoId)
      .maybeSingle();
    if (!repo) throw new Error("Not found");

    let isAdmin = repo.user_id === userId;
    if (!isAdmin) {
      const { data: role } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      isAdmin = !!role;
    }
    if (repo.user_id !== userId && !isAdmin) throw new Error("Forbidden");

    if (repo.zip_path) {
      await supabaseAdmin.storage.from("repos").remove([repo.zip_path]);
    }
    const { error } = await supabaseAdmin
      .from("repositories")
      .delete()
      .eq("id", data.repoId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });