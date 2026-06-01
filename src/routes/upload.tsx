import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload as UploadIcon, Image as ImageIcon, Video, FileBox, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/upload")({ component: UploadPage });

const CATEGORIES = ["Games", "Tools", "Social", "Productivity", "Entertainment", "Education", "Other"];

async function uploadFile(bucket: string, userId: string, file: File) {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const contentType =
    ext === "apk"
      ? "application/vnd.android.package-archive"
      : file.type || undefined;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType,
  });
  if (error) {
    const hint =
      error.message.includes("bucket") ? `Bucket '${bucket}' may not exist. Run the setup SQL in Supabase dashboard.` :
      error.message.includes("policy") || error.message.includes("row-level security") ? "Upload not allowed. Make sure you are signed in." :
      error.message.includes("size") || error.message.includes("413") ? "File too large (free tier limit is ~10 MB, upgrade or increase limit in Supabase settings)." :
      null;
    throw new Error(hint ? `${error.message} — ${hint}` : error.message);
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

function UploadPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  const [title, setTitle] = useState("");
  const [packageName, setPackageName] = useState("");
  const [version, setVersion] = useState("");
  const [category, setCategory] = useState("Other");
  const [shortDesc, setShortDesc] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState<File | null>(null);
  const [apk, setApk] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [shots, setShots] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [appType, setAppType] = useState<"apk" | "weblink">("apk");
  const [webUrl, setWebUrl] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) return toast.error("Title required");
    if (appType === "weblink" && !webUrl.trim()) return toast.error("Web URL required");
    if (appType === "apk" && apk && apk.size > 500_000_000) return toast.error("APK exceeds 500 MB limit");
    setBusy(true);
    try {
      const iconUrl = icon ? await uploadFile("icons", user.id, icon) : null;
      const apkUrl = appType === "apk" && apk ? await uploadFile("apks", user.id, apk) : null;
      const videoUrl = video ? await uploadFile("videos", user.id, video) : null;

      const { data: app, error } = await supabase
        .from("apps")
        .insert({
          user_id: user.id,
          title: title.trim(),
          package_name: packageName.trim() || null,
          version: version.trim() || null,
          category,
          short_description: shortDesc.trim() || null,
          description: description.trim(),
          icon_url: iconUrl,
          apk_url: apkUrl,
          video_url: videoUrl,
          app_type: appType,
          web_url: appType === "weblink" ? webUrl.trim() : null,
        })
        .select()
        .single();
      if (error) throw error;

      if (shots.length) {
        const urls = await Promise.all(shots.map((s) => uploadFile("screenshots", user.id, s)));
        const rows = urls.map((u, i) => ({ app_id: app.id, image_url: u, position: i }));
        const { error: sErr } = await supabase.from("app_screenshots").insert(rows);
        if (sErr) throw sErr;
      }

      toast.success("App published!");
      nav({ to: "/app/$id", params: { id: app.id } });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const TypeCard = ({ value, icon, label, desc }: { value: "apk" | "weblink"; icon: React.ReactNode; label: string; desc: string }) => (
    <button type="button" onClick={() => setAppType(value)} className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${appType === value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
      <span className={`mt-0.5 ${appType === value ? "text-primary" : "text-muted-foreground"}`}>{icon}</span>
      <span>
        <span className="block font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
    </button>
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Publish a new app</h1>
        <p className="mt-1 text-muted-foreground">Fill in the details to list your app on ApkHub.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-6 rounded-3xl bg-card p-6 sm:p-8" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="space-y-2">
            <Label>App type</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <TypeCard value="apk" icon={<FileBox className="h-5 w-5" />} label="APK app" desc="Upload an Android APK file." />
              <TypeCard value="weblink" icon={<Globe className="h-5 w-5" />} label="Web link" desc="Link to a website or PWA." />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="title">App title *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg">Package name</Label>
              <Input id="pkg" placeholder="com.example.app" value={packageName} onChange={(e) => setPackageName(e.target.value)} maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ver">Version</Label>
              <Input id="ver" placeholder="1.0.0" value={version} onChange={(e) => setVersion(e.target.value)} maxLength={20} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cat">Category</Label>
              <select id="cat" value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="short">Short description</Label>
              <Input id="short" value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} maxLength={140} placeholder="One-line tagline" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="desc">Full description</Label>
              <Textarea id="desc" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={4000} placeholder="What does your app do? Key features, why people will love it?" />
            </div>
            {appType === "weblink" && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="webUrl">Web URL *</Label>
                <Input id="webUrl" type="url" placeholder="https://example.com" value={webUrl} onChange={(e) => setWebUrl(e.target.value)} required />
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FileField label="App icon (PNG/JPG)" icon={<ImageIcon className="h-4 w-4" />} accept="image/*" onChange={(f) => setIcon(f[0] ?? null)} value={icon ? [icon] : []} />
            {appType === "apk" && (
              <FileField label="APK file" icon={<FileBox className="h-4 w-4" />} accept=".apk,application/vnd.android.package-archive" onChange={(f) => setApk(f[0] ?? null)} value={apk ? [apk] : []} />
            )}
            <FileField label="Trailer video (optional)" icon={<Video className="h-4 w-4" />} accept="video/*" onChange={(f) => setVideo(f[0] ?? null)} value={video ? [video] : []} />
            <FileField label="Screenshots (up to 8)" icon={<ImageIcon className="h-4 w-4" />} accept="image/*" multiple onChange={(f) => setShots(f.slice(0, 8))} value={shots} />
          </div>

          <Button type="submit" disabled={busy} size="lg" className="w-full gap-2">
            <UploadIcon className="h-4 w-4" /> {busy ? "Publishing..." : "Publish app"}
          </Button>
        </form>
      </main>
    </div>
  );
}

function FileField({
  label, icon, accept, multiple, onChange, value,
}: {
  label: string;
  icon: React.ReactNode;
  accept: string;
  multiple?: boolean;
  onChange: (files: File[]) => void;
  value: File[];
}) {
  return (
    <label className="flex cursor-pointer flex-col gap-1 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm hover:bg-muted">
      <span className="flex items-center gap-2 font-medium">{icon} {label}</span>
      <span className="text-xs text-muted-foreground truncate">
        {value.length === 0 ? "Click to choose" : value.map((f) => f.name).join(", ")}
      </span>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => onChange(Array.from(e.target.files ?? []))}
      />
    </label>
  );
}
