import { Link } from "@tanstack/react-router";
import { Package, Download, Globe } from "lucide-react";

type AppCardProps = {
  id: string;
  title: string;
  category: string;
  short_description: string | null;
  icon_url: string | null;
  downloads: number;
  app_type: string;
};

export function AppCard({ id, title, category, short_description, icon_url, downloads, app_type }: AppCardProps) {
  return (
    <Link
      to="/app/$id"
      params={{ id }}
      className="group flex gap-3 rounded-2xl bg-card p-3 transition-all hover:-translate-y-0.5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-muted">
        {icon_url ? (
          <img src={icon_url} alt={title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div
            className="grid h-full w-full place-items-center text-primary-foreground"
            style={{ backgroundImage: "var(--gradient-primary)" }}
          >
            <Package className="h-7 w-7" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-semibold text-card-foreground">{title}</h3>
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${app_type === "weblink" ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}`}>
            {app_type === "weblink" ? <><Globe className="h-2.5 w-2.5" /> Web</> : "APK"}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{category}</p>
        {short_description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{short_description}</p>
        )}
        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Download className="h-3 w-3" /> {downloads}
        </div>
      </div>
    </Link>
  );
}
