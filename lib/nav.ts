export type NavItem = {
  href: string;
  label: string;
  emoji: string;
};

export const NAV: NavItem[] = [
  { href: "/", label: "Nest", emoji: "🥚" },
  { href: "/family", label: "Family", emoji: "🐾" },
  { href: "/hall", label: "Hall", emoji: "🌊" },
  { href: "/profile", label: "Profile", emoji: "👤" },
];
