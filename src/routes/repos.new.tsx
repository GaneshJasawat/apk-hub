import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload as UploadIcon, FileArchive, Lock, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/repos/new")({ component: NewRepoPage });

function NewRepoPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [zip, setZip] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) return toast.error("Repository name is required");
    if (!zip) return toast.error("Attach a ZIP file of your source code");
    if (!/\.zip$/i.test(zip.name)) return toast.error("File must be a .zip");

    setBusy(true);
    try {
      const path = `${user.id}/${crypto.randomUUID()}.zip`;
      const { error: upErr } = await supabase.storage
        .from("repos")
        .upload(path, zip, { cacheControl: "3600", upsert: false, contentType: "application/zip" });
      if (upErr) throw upErr;

      const { data: repo, error } = await supabase
        .from("repositories")
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description.trim(),
          language: language.trim() || null,
          visibility,
          zip_path: path,
          size_bytes: zip.size,
        })
        .select()
        .single();
      if (error) throw error;

      toast.success("Repository created!");
      nav({ to: "/repos/$id", params: { id: repo.id } });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight">New repository</h1>
        <p className="mt-1 text-muted-foreground">Upload your source code as a ZIP archive.</p>

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-6 rounded-3xl bg-card p-6 sm:p-8"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="name">Repository name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-awesome-project"
              maxLength={80}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              placeholder="What is this project about?"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lang">Primary language</Label>
            <Input
              id="lang"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="TypeScript, Python, Rust…"
              maxLength={40}
            />
          </div>

          <div className="space-y-2">
            <Label>Visibility</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <VisibilityCard
                selected={visibility === "public"}
                onSelect={() => setVisibility("public")}
                icon={<Globe className="h-5 w-5" />}
                title="Public"
                desc="Anyone can view and download."
              />
              <VisibilityCard
                selected={visibility === "private"}
                onSelect={() => setVisibility("private")}
                icon={<Lock className="h-5 w-5" />}
                title="Private"
                desc="Only you (and admins) can access."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Source code ZIP *</Label>
            <label className="flex cursor-pointer flex-col gap-1 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm hover:bg-muted">
              <span className="flex items-center gap-2 font-medium">
                <FileArchive className="h-4 w-4" /> Select .zip file
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {zip ? `${zip.name} (${(zip.size / 1024 / 1024).toFixed(2)} MB)` : "Click to choose"}
              </span>
              <input
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                onChange={(e) => setZip(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <Button type="submit" disabled={busy} size="lg" className="w-full gap-2">
            <UploadIcon className="h-4 w-4" /> {busy ? "Uploading…" : "Create repository"}
          </Button>
        </form>
      </main>
    </div>
  );
}

function VisibilityCard({
  selected, onSelect, icon, title, desc,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
        selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
      }`}
    >
      <span className={`mt-0.5 ${selected ? "text-primary" : "text-muted-foreground"}`}>{icon}</span>
      <span>
        <span className="block font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
    </button>
  );
}