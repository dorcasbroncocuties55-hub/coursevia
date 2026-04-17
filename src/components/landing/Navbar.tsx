import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ShoppingCart, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { roleToDashboardPath } from "@/lib/authRoles";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import { getCartItems } from "@/lib/cart";

const navLinks = [
  { label: "Courses", href: "/courses" },
  { label: "Coaches", href: "/coaches" },
  { label: "Creators", href: "/creators" },
  { label: "Therapists", href: "/therapists" },
  { label: "Pricing", href: "/pricing" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();
  const { user, profile, primaryRole, logout } = useAuth();

  useEffect(() => {
    const updateCartCount = () => {
      setCartCount(getCartItems().length);
    };
    
    updateCartCount();
    
    // Listen for storage events (cart updates from other tabs)
    window.addEventListener("storage", updateCartCount);
    
    // Custom event for same-tab updates
    window.addEventListener("cartUpdated", updateCartCount);
    
    return () => {
      window.removeEventListener("storage", updateCartCount);
      window.removeEventListener("cartUpdated", updateCartCount);
    };
  }, []);

  const dashboardHref = useMemo(() => {
    // If user hasn't completed onboarding, always go to onboarding
    if (user && profile && !profile.onboarding_completed) {
      return "/onboarding";
    }
    // Always use profile.role first - it's the user's actual chosen role
    const role = profile?.role || primaryRole;
    if (role) return roleToDashboardPath(role);
    if (user) return "/onboarding";
    return "/";
  }, [primaryRole, profile?.role, profile?.onboarding_completed, user]);

  const accountName =
    profile?.full_name || user?.email?.split("@")[0] || "My account";

  const handleBrandClick = () => {
    setMobileOpen(false);
  };

  const goProtected = (destinationPath: "/cart") => {
    if (user) {
      navigate(destinationPath);
    } else {
      navigate("/auth-gate", { state: { destinationPath } });
    }
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error("Logout error:", e);
    }
    // Always navigate to login regardless
    navigate("/login", { replace: true });
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <nav className="container-wide flex h-16 items-center justify-between gap-4">
        <Link
          to="/"
          onClick={handleBrandClick}
          className="shrink-0 text-xl font-bold tracking-tight text-foreground"
        >
          Coursevia
        </Link>

        <div className="hidden min-w-0 flex-1 items-center justify-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" onClick={() => goProtected("/cart")} className="relative">
            <ShoppingCart size={16} className="mr-2" />
            Cart
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {cartCount}
              </span>
            )}
          </Button>

          {user ? (
            <>
              <Link
                to={dashboardHref}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Dashboard
              </Link>

              <Link
                to={dashboardHref}
                className="flex items-center gap-2 rounded-full px-2 py-1.5 transition-colors hover:bg-muted"
              >
                <ProfileAvatar
                  src={profile?.avatar_url}
                  name={accountName}
                  className="h-8 w-8"
                />
                <span className="max-w-[130px] truncate text-sm font-medium text-foreground">
                  {accountName}
                </span>
              </Link>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                aria-label="Log out"
              >
                <LogOut size={18} />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Log in</Link>
              </Button>

              <Button size="sm" asChild>
                <Link to="/signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="text-foreground md:hidden"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border bg-background md:hidden"
          >
            <div className="container-wide flex flex-col gap-3 py-4">
              {user ? (
                <Link
                  to={dashboardHref}
                  className="mb-1 flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3"
                  onClick={() => setMobileOpen(false)}
                >
                  <ProfileAvatar
                    src={profile?.avatar_url}
                    name={accountName}
                    className="h-11 w-11"
                  />
                  <div>
                    <p className="font-semibold text-foreground">{accountName}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {primaryRole || profile?.role || "account"}
                    </p>
                  </div>
                </Link>
              ) : null}

              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              <Button variant="outline" size="sm" onClick={() => goProtected("/cart")} className="relative">
                <ShoppingCart size={16} className="mr-2" />
                Cart
                {cartCount > 0 && (
                  <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {cartCount}
                  </span>
                )}
              </Button>

              {user ? (
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <Link to={dashboardHref} onClick={() => setMobileOpen(false)}>
                      Dashboard
                    </Link>
                  </Button>
                  <Button size="sm" className="flex-1" onClick={handleLogout}>
                    Log out
                  </Button>
                </div>
              ) : (
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <Link to="/login">Log in</Link>
                  </Button>

                  <Button size="sm" asChild className="flex-1">
                    <Link to="/signup">Get Started</Link>
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;