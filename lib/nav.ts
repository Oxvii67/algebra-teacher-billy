import {
  BookOpen,
  Calculator,
  ClipboardList,
  FolderOpen,
  House,
  MessageSquare,
  PenTool,
  Settings,
  Target,
  Video,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  /** Label used in the 390px bottom bar. */
  short: string;
  icon: LucideIcon;
  mobile?: boolean;
}

export const NAV: NavItem[] = [
  { href: "/", label: "Home", short: "Home", icon: House, mobile: true },
  { href: "/studio", label: "Solve a problem", short: "Solve", icon: PenTool, mobile: true },
  { href: "/tutor", label: "Ask Billy", short: "Ask Billy", icon: MessageSquare, mobile: true },
  { href: "/drill", label: "Spot the mistake", short: "Drill", icon: Target },
  { href: "/practice-test", label: "Practice test", short: "Test", icon: ClipboardList, mobile: true },
  { href: "/calculator", label: "Graphing calculator", short: "Graph", icon: Calculator, mobile: true },
  { href: "/videos", label: "Lesson videos", short: "Videos", icon: Video },
  { href: "/cheat-sheet", label: "Formula sheet", short: "Formulas", icon: BookOpen },
  { href: "/binder", label: "Binder", short: "Binder", icon: FolderOpen },
  { href: "/settings", label: "Settings and themes", short: "Settings", icon: Settings },
];
