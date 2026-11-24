import { pageMeta } from "@/lib/pageMeta";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { AccountPanel } from "./AccountPanel";

export const metadata = pageMeta("/settings", "Settings and themes", "Choose a theme and manage your account.", { index: false });

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="page-title">Settings</h1>
        <p className="mt-1 text-muted">Theme changes apply instantly and are saved on this device.</p>
      </header>
      <AccountPanel />
      <section className="card p-5">
        <h2 className="mb-4 text-lg font-semibold">Theme</h2>
        <ThemeSwitcher />
      </section>
    </div>
  );
}
