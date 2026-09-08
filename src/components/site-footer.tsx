import { Link } from "@tanstack/react-router";
import {
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Phone,
  type LucideIcon,
} from "lucide-react";

import logoAsset from "../assets/logo.png";
import paymentMethodsUrl from "../assets/payment-methods.png";

function TikTok({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-.88-.07A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

const socials: { label: string; Icon: LucideIcon | typeof TikTok; href: string }[] = [
  { label: "Facebook", Icon: Facebook, href: "https://www.facebook.com/share/199ve8Fd2U/?mibextid=wwXIfr" },
  { label: "TikTok", Icon: TikTok, href: "https://www.tiktok.com/@mayorbeautyplace58?_r=1&_t=ZS-99ZMuqFhC7O" },
  { label: "Instagram", Icon: Instagram, href: "https://www.instagram.com/mayorbeautyplace?stkn=M2RucWVhamMzbHht" },
];

const learnMore = [
  { label: "My Account", to: "/book" },
  { label: "Before & After", to: "/before-and-after" },
  { label: "Help Center", to: "/contact" },
  { label: "Contact us", to: "/contact" },
] as const;

const quickLinks = [
  { label: "Term of services", to: "/about" },
  { label: "Privacy Policy", to: "/about" },
  { label: "Cookie Policy", to: "/about" },
] as const;

export function SiteFooter() {
  return (
    <footer className="bg-black px-6 pt-20 pb-6 text-on-dark md:px-12 md:pt-24 md:pb-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          {/* Brand + social */}
          <div className="max-w-xs">
            <Link to="/" aria-label="Mayor Beauty Place home" className="inline-block">
              <img
                src={logoAsset}
                alt="Mayor Beauty Place"
                width={160}
                height={80}
                className="h-14 w-auto object-contain"
                loading="lazy"
              />
            </Link>
            <p className="mt-5 text-sm leading-relaxed text-on-dark/70">
              Our beauty experts understand that each client is unique. They
              take the time to listen, learn about your preferences, and tailor
              their services to enhance your natural beauty.
            </p>
            <div className="mt-6 flex gap-3">
              {socials.map(({ label, Icon, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-brand-red transition-colors hover:bg-brand-red hover:text-on-brand"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Learn More */}
          <div>
            <h3 className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-on-dark">
              Learn More
            </h3>
            <ul className="space-y-3 text-sm">
              {learnMore.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className="text-on-dark/70 transition-colors hover:text-brand-red"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-on-dark">
              Quick Links
            </h3>
            <ul className="space-y-3 text-sm">
              {quickLinks.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className="text-on-dark/70 transition-colors hover:text-brand-red"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Reach Us */}
          <div>
            <h3 className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-on-dark">
              Reach Us
            </h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" />
                <p className="leading-relaxed text-on-dark/70">
                  110/112 Peckham Rye Lane
                  <br />
                  London, United Kingdom.
                  <br />
                  Post Code: SE15 4RZ
                </p>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-brand-red" />
                <a
                  href="mailto:info.mayorbeautyplace@gmail.com"
                  className="min-w-0 break-all text-on-dark/70 transition-colors hover:text-brand-red"
                >
                  info.mayorbeautyplace@gmail.com
                </a>
              </li>

              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-brand-red" />
                <a
                  href="tel:+447901910007"
                  className="text-on-dark/70 transition-colors hover:text-brand-red"
                >
                  (+44) 7901910007
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-brand-red" />
                <a
                  href="tel:+442083897978"
                  className="text-on-dark/70 transition-colors hover:text-brand-red"
                >
                  02083897978
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center gap-6 border-t border-on-dark/10 pt-8 md:flex-row md:justify-between">
          <p className="text-center text-xs text-on-dark/50 md:text-left">
            © 2026 Mayor Beauty Place. All rights reserved.
          </p>
          <div className="flex flex-col items-center gap-3 md:items-end">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-dark/40">
              We Accept
            </span>
            <img
              src={paymentMethodsUrl}
              alt="Accepted payment methods: Visa, PayPal, Mastercard, Maestro"
              loading="lazy"
              className="h-14 w-auto md:h-16"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
