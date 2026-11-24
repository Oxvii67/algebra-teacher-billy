import { pageMeta } from "@/lib/pageMeta";
export const metadata = pageMeta("/privacy", "Privacy policy", "What Algebra Teacher Billy stores, where your problems go, and what it does not do.");

const UPDATED = "November 24, 2026";

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-8 pb-8 text-[15px] leading-relaxed">
      <header>
        <h1 className="page-title">Privacy policy</h1>
        <p className="mt-2 text-muted">Last updated {UPDATED}.</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">What Billy stores</h2>
        <p>
          <strong>Without an account</strong>, everything you save (solved problems, folders, practice tests, streak and progress) stays in your
          browser&apos;s local storage on this device. It is not sent to our database.
        </p>
        <p>
          <strong>With an account</strong>, we store your email address and the same study data in our database so it follows you to other devices. If you
          sign in with Google, we receive your name, email address and profile picture from Google. Passwords are handled by Supabase, our sign-in
          provider, and are never visible to us.
        </p>
        <p>
          <strong>Unfinished work</strong>, such as your chats with Billy, the problem on the Solve page and your place in a lesson video, is kept in your
          browser on this device, with or without an account. It is not sent to our database. You can delete any chat from the Ask Billy page.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Where your problems go</h2>
        <p>
          To solve a problem, Billy sends its text or image to an AI model: Google Gemini first, and Groq or OpenRouter as backups when Gemini is busy.
          Only the problem and your instructions are sent, never your email or account details. Typed practice test answers that do not match the key
          exactly are sent the same way so Billy can check them.
        </p>
        <p>
          The Speak button uses your browser&apos;s own voice typing. Some browsers, including Chrome and Safari, send the audio to their maker to turn it
          into text. We receive only the text.
        </p>
        <p>
          Lesson videos play from YouTube in privacy-enhanced mode (youtube-nocookie.com). When you search for a lesson, your search words go to the AI model
          to pick the topic, and may be sent to YouTube to find matching videos.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Services we use</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Supabase: accounts and saved study data.</li>
          <li>Vercel: hosts the site and keeps short-lived request logs, such as IP address and pages requested.</li>
          <li>Google Gemini, Groq and OpenRouter: work out solutions.</li>
          <li>YouTube: lesson videos.</li>
        </ul>
        <p>Each of these handles data under its own privacy policy.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">What we do not do</h2>
        <p>Billy shows no ads, does not sell or share your data for advertising, and does not use tracking cookies. The only cookies keep you signed in.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Students under 13</h2>
        <p>Accounts are for students 13 and older. Younger students can use Billy without an account, which keeps everything on their own device.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Deleting your data</h2>
        <p>
          Guest data: clear this site&apos;s data in your browser settings. Account data: email the support address shown on Billy&apos;s Google sign-in
          screen and ask for your account to be deleted. We delete the account and everything saved to it.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Changes</h2>
        <p>If this policy changes, the date at the top changes with it.</p>
      </section>
    </article>
  );
}
