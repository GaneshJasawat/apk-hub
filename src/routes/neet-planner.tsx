import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain } from "lucide-react";

export const Route = createFileRoute("/neet-planner")({ component: NeetPlanner });

function NeetPlanner() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <span
              className="grid h-7 w-7 place-items-center rounded-lg text-primary-foreground text-xs"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              <Brain className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight">NEET Planner</span>
          </Link>
          <Link to="/">
            <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">Back to ApkHub</span>
          </Link>
        </div>
      </header>
      <div className="flex-1">
        <iframe
          src="/neet-planner/index.html"
          className="w-full h-full border-none"
          style={{ minHeight: "calc(100vh - 3rem)" }}
          title="NEET Study Planner"
          allow="notifications"
        />
      </div>
    </div>
  );
}
