export const metadata = { title: "Terms of service", alternates: { canonical: "/terms" } };

const UPDATED = "November 23, 2026";

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-8 pb-8 text-[15px] leading-relaxed">
      <header>
        <h1 className="page-title">Terms of service</h1>
        <p className="mt-2 text-muted">Last updated {UPDATED}.</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Using Billy</h2>
        <p>
          Algebra Teacher Billy is a free study tool. Use it to learn: check your own work, see how a method works, and practice. Follow your school&apos;s
          rules on homework and tests. Billy is not for use during exams.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Answers can be wrong</h2>
        <p>
          Billy checks each answer by substituting it back into the problem, but solutions come from AI models and can still contain mistakes. Read each
          step and verify it yourself before you rely on it.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your account</h2>
        <p>
          Keep your sign-in details to yourself. Accounts are for students 13 and older. We may suspend an account that abuses the service, for example by
          sending automated requests or content unrelated to math.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your content</h2>
        <p>The problems you send and the work you save stay yours. We use them only to run Billy for you, as described in the privacy policy.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">No warranty</h2>
        <p>
          Billy is provided as is, without warranty of any kind. To the extent the law allows, we are not liable for losses that come from using it,
          including grades.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Changes</h2>
        <p>We may update these terms. The date at the top shows the latest version, and using Billy after a change means you accept it.</p>
      </section>
    </article>
  );
}
