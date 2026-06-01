import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const incrementAppDownloads = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ appId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { data: app, error: readError } = await supabaseAdmin
      .from("apps")
      .select("downloads")
      .eq("id", data.appId)
      .maybeSingle();

    if (readError) throw new Error(readError.message);
    if (!app) throw new Error("App not found");

    const downloads = app.downloads + 1;
    const { error } = await supabaseAdmin
      .from("apps")
      .update({ downloads })
      .eq("id", data.appId);

    if (error) throw new Error(error.message);
    return { downloads };
  });