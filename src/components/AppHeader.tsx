import { Link } from "@tanstack/react-router";
import { Package, Upload, LogOut, LogIn, Shield, Code2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  const { user, signOut } = useAuth();
  const isAdmin = useIsAdmin();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <span
            className="grid h-9 w-9 place-items-center rounded-xl text-primary-foreground"
            style={{ backgroundImage: "var(--gradient-primary)" }}
          >
            <Package className="h-5 w-5" />
          </span>
          <span className="tracking-tight">ApkHub</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link to="/repos">
            <Button variant="ghost" size="sm" className="gap-2">
              <Code2 className="h-4 w-4" /> <span className="hidden sm:inline">Repos</span>
            </Button>
          </Link>
          {isAdmin && (
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="gap-2">
                <Shield className="h-4 w-4" /> <span className="hidden sm:inline">Admin</span>
              </Button>
            </Link>
          )}
          <Link to="/upload">
            <Button variant="ghost" size="sm" className="gap-2">
              <Upload className="h-4 w-4" /> <span className="hidden sm:inline">Upload</span>
            </Button>
          </Link>
          {user ? (
            <Button variant="outline" size="sm" onClick={() => signOut()} className="gap-2">
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
            </Button>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="gap-2">
                <LogIn className="h-4 w-4" /> Sign in
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
