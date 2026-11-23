import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl font-semibold">Settings</h1>
        <p className="mt-1 text-muted">Theme changes apply instantly and are saved on this device.</p>
      </header>
      <section className="card p-5">
        <h2 className="mb-4 text-lg font-semibold">Theme</h2>
        <ThemeSwitcher />
      </section>
    </div>
  );
}
