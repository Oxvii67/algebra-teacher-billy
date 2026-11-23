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
  icon: LucideIcon;
  mobile?: boolean;
}

export const NAV: NavItem[] = [
  { href: "/", label: "Home", icon: House, mobile: true },
  { href: "/studio", label: "Math Studio", icon: PenTool, mobile: true },
  { href: "/tutor", label: "Teacher Chat", icon: MessageSquare, mobile: true },
  { href: "/drill", label: "Spot the Mistake", icon: Target },
  { href: "/practice-test", label: "Practice Test", icon: ClipboardList, mobile: true },
  { href: "/calculator", label: "Graphing Calculator", icon: Calculator, mobile: true },
  { href: "/videos", label: "Video Finder", icon: Video },
  { href: "/cheat-sheet", label: "Formula Sheet", icon: BookOpen },
  { href: "/history", label: "History and Folders", icon: FolderOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];
