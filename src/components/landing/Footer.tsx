import { Link } from "react-router-dom";

const footerLinks = {
  Platform: [
    { label: "Courses", href: "/courses" },
    { label: "Coaches", href: "/coaches" },
    { label: "Creators", href: "/creators" },
    { label: "Pricing", href: "/pricing" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" },
    { label: "Help Center", href: "/help" },
  ],
  Legal: [
    { label: "Terms of Service", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Refund Policy", href: "/refund-policy" },
  ],
};

const Footer = () => {
  return (
    <footer className="border-t border-border bg-secondary/30">
      <div className="container-wide py-10 lg:py-16">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="text-xl font-bold text-foreground">
              Coursevia
            </Link>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-xs">
              The all-in-one platform for learning, coaching, and creating.
            </p>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-foreground mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors active:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Coursevia. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Funds are held in escrow · Verified by Coursevia
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
