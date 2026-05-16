import Link from "next/link"
import { Twitter, Linkedin, Instagram, Github } from "lucide-react"
import { HeyGMark } from "./heyg-mark"

const footerLinks = {
  product: [
    { label: "How it works", href: "#how-it-works" },
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Dashboard demo", href: "/dashboard" },
  ],
  company: [
    { label: "About", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Press", href: "#" },
    { label: "Contact", href: "#" },
  ],
  legal: [
    { label: "Terms", href: "#" },
    { label: "Privacy", href: "#" },
    { label: "Security", href: "#" },
    { label: "DPA", href: "#" },
  ],
  support: [
    { label: "Help center", href: "#" },
    { label: "FAQ", href: "#faq" },
    { label: "Status", href: "#" },
    { label: "Report abuse", href: "#" },
  ],
}

export function Footer() {
  return (
    <div className="relative">
      <footer id="contact" className="relative z-20 border-t border-border py-16 px-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center mb-4">
                <HeyGMark className="text-xl text-foreground" />
              </Link>
              <p className="text-sm text-muted-foreground mb-6">
                The AI voice concierge with two brains: your business and your customers.
              </p>
              <div className="flex gap-4">
                {[Twitter, Linkedin, Instagram, Github].map((Icon, i) => (
                  <Link
                    key={i}
                    href="#"
                    className="w-9 h-9 border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                  </Link>
                ))}
              </div>
            </div>

            {(["product", "company", "legal", "support"] as const).map((group) => (
              <div key={group}>
                <h4 className="text-sm font-medium text-foreground mb-4 uppercase tracking-wider capitalize">
                  {group}
                </h4>
                <ul className="space-y-3">
                  {footerLinks[group].map((link, i) => (
                    <li key={i}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">© 2026 hey, G! All rights reserved.</p>
            <p className="text-xs text-muted-foreground">Built for the small businesses that answer every call.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
