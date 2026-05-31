import { Link } from "wouter";
import { Zap, ArrowLeft } from "lucide-react";

const LAST_UPDATED = "May 31, 2026";
const COMPANY = "BrandOps";
const EMAIL = "privacy@brandops.io";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <div className="space-y-3 text-white/60 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function DataRow({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-4 py-3 border-b border-white/5 last:border-0">
      <span className="text-white/80 font-medium text-sm">{label}</span>
      <span className="text-white/50 text-sm">{detail}</span>
    </div>
  );
}

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-white/8 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-7 h-7 shrink-0">
              <div className="absolute inset-0 bg-[#C6FF00]/20 rounded-lg blur-sm" />
              <div className="relative w-7 h-7 rounded-lg bg-[#C6FF00]/10 border border-[#C6FF00]/30 flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-[#C6FF00]" />
              </div>
            </div>
            <span className="font-black text-base tracking-tight group-hover:text-[#C6FF00] transition-colors">BrandOps</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-16 space-y-12">
        {/* Hero */}
        <div className="space-y-3 pb-8 border-b border-white/8">
          <p className="text-xs text-[#C6FF00] font-semibold uppercase tracking-widest">Legal</p>
          <h1 className="text-4xl font-black tracking-tight">Privacy Policy</h1>
          <p className="text-white/40 text-sm">Last updated: {LAST_UPDATED}</p>
          <p className="text-white/50 text-sm max-w-2xl">
            {COMPANY} is committed to protecting your privacy. This Policy explains what data we collect,
            how we use it, and your rights regarding your information.
          </p>
        </div>

        <div className="space-y-10">
          <Section title="1. Who We Are">
            <p>
              {COMPANY} ("we," "us," or "our") operates a UGC campaign operations platform at{" "}
              <span className="text-white">brandops.io</span>. We act as the data controller for personal
              information processed in connection with your use of our Platform.
            </p>
            <p>
              Questions about this Privacy Policy can be directed to{" "}
              <a href={`mailto:${EMAIL}`} className="text-[#C6FF00] hover:underline">{EMAIL}</a>.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <p>We collect the following categories of information:</p>

            <div className="rounded-xl border border-white/8 overflow-hidden mt-4">
              <div className="px-4 py-3 bg-white/[0.04] border-b border-white/8">
                <p className="text-xs font-semibold text-white uppercase tracking-widest">Account & Identity</p>
              </div>
              <div className="px-4 divide-y divide-white/5">
                <DataRow label="Name" detail="Provided at registration or via Google OAuth." />
                <DataRow label="Email address" detail="Used for account identification and communications." />
                <DataRow label="Profile photo" detail="Sourced from Google account if you sign in with Google." />
                <DataRow label="Account type" detail="Whether you are a Brand or Creator, from your onboarding." />
              </div>
            </div>

            <div className="rounded-xl border border-white/8 overflow-hidden">
              <div className="px-4 py-3 bg-white/[0.04] border-b border-white/8">
                <p className="text-xs font-semibold text-white uppercase tracking-widest">Platform Activity</p>
              </div>
              <div className="px-4 divide-y divide-white/5">
                <DataRow label="Campaigns" detail="Campaign titles, briefs, budgets, and status you create or participate in." />
                <DataRow label="Submissions" detail="Video submissions, feedback, and approval/rejection decisions." />
                <DataRow label="Onboarding data" detail="Goals, budget range, niche, team size — used to personalize your experience." />
                <DataRow label="AI chat history" detail="Conversations with the AI Assistant are stored server-side." />
              </div>
            </div>

            <div className="rounded-xl border border-white/8 overflow-hidden">
              <div className="px-4 py-3 bg-white/[0.04] border-b border-white/8">
                <p className="text-xs font-semibold text-white uppercase tracking-widest">Payment Information</p>
              </div>
              <div className="px-4 divide-y divide-white/5">
                <DataRow label="Payment method" detail="Card details are handled entirely by Stripe — we never see or store raw card data." />
                <DataRow label="Payout account" detail="Stripe Connect account details for creator payouts — managed by Stripe." />
                <DataRow label="Transaction history" detail="Records of campaign payouts and subscription charges." />
              </div>
            </div>

            <div className="rounded-xl border border-white/8 overflow-hidden">
              <div className="px-4 py-3 bg-white/[0.04] border-b border-white/8">
                <p className="text-xs font-semibold text-white uppercase tracking-widest">Technical Data</p>
              </div>
              <div className="px-4 divide-y divide-white/5">
                <DataRow label="IP address" detail="Logged for security and fraud prevention." />
                <DataRow label="Device / browser" detail="User agent, device type, and browser version." />
                <DataRow label="Usage data" detail="Pages visited, features used, and session duration." />
                <DataRow label="Cookies" detail="Session tokens and preference storage (see Section 5)." />
              </div>
            </div>
          </Section>

          <Section title="3. How We Use Your Information">
            <p>We use your information to:</p>
            <ul className="space-y-2 list-none pl-0">
              {[
                "Operate and provide the Platform, including campaign management, submissions review, and payout processing.",
                "Personalize your experience using your onboarding profile (account type, goals, budget, niche).",
                "Power AI features — your campaign data is injected as context into AI responses to give you relevant, data-aware answers.",
                "Process payments and payouts through Stripe.",
                "Send transactional emails (payout confirmations, campaign updates, account alerts). We do not send marketing emails without your explicit consent.",
                "Prevent fraud, abuse, and unauthorized access.",
                "Comply with legal obligations.",
                "Improve the Platform through aggregated, anonymized usage analytics.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[#C6FF00] mt-0.5 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="4. Legal Basis for Processing (EEA / UK Users)">
            <p>If you are located in the European Economic Area or UK, we process your data on the following legal bases:</p>
            <ul className="space-y-2 list-none pl-0">
              {[
                { basis: "Contract", detail: "To provide the Platform and fulfill our obligations to you." },
                { basis: "Legitimate interest", detail: "To improve the Platform, detect fraud, and ensure security." },
                { basis: "Legal obligation", detail: "To comply with applicable laws and regulations." },
                { basis: "Consent", detail: "For optional features like marketing communications, where explicitly obtained." },
              ].map(({ basis, detail }) => (
                <li key={basis} className="flex gap-2">
                  <span className="text-[#C6FF00] mt-0.5 shrink-0">•</span>
                  <span><strong className="text-white">{basis}:</strong> {detail}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="5. Cookies and Local Storage">
            <p>
              We use browser cookies and{" "}
              <code className="text-xs bg-white/10 rounded px-1.5 py-0.5">localStorage</code> to:
            </p>
            <ul className="space-y-2 list-none pl-0">
              {[
                "Maintain your authenticated session (Firebase session cookies).",
                "Store your onboarding preferences locally (no server call needed).",
                "Remember your workspace profile (display name, website).",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[#C6FF00] mt-0.5 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p>
              We do not use third-party advertising cookies or tracking pixels. You can clear cookies and
              localStorage at any time through your browser settings, though this will sign you out.
            </p>
          </Section>

          <Section title="6. Third-Party Services">
            <div className="space-y-4">
              {[
                {
                  name: "Firebase (Google)",
                  purpose: "Authentication and primary data storage (Firestore). Your account credentials are managed by Firebase Auth.",
                  link: "https://firebase.google.com/support/privacy",
                },
                {
                  name: "Stripe",
                  purpose: "Payment processing, subscription billing, and creator payouts. Stripe handles all payment card data — we never see raw card numbers.",
                  link: "https://stripe.com/privacy",
                },
                {
                  name: "OpenAI",
                  purpose: "Powers the AI Assistant and AI-generated campaign insights. Your messages and injected campaign context are sent to OpenAI's API.",
                  link: "https://openai.com/policies/privacy-policy",
                },
              ].map(({ name, purpose, link }) => (
                <div key={name} className="p-4 rounded-xl border border-white/8 bg-white/[0.02]">
                  <p className="font-semibold text-white text-sm mb-1">{name}</p>
                  <p className="text-white/50 text-xs">{purpose}</p>
                  <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-[#C6FF00] hover:underline mt-1 inline-block">
                    Privacy Policy →
                  </a>
                </div>
              ))}
            </div>
          </Section>

          <Section title="7. Data Sharing">
            <p>We do not sell your personal data. We share data only:</p>
            <ul className="space-y-2 list-none pl-0">
              {[
                "With the third-party service providers described in Section 6, as necessary to provide the Platform.",
                "With brands — creators' submitted content and basic profile info is visible to the brand running the campaign.",
                "With creators — brands' campaign briefs and feedback are visible to participating creators.",
                "When required by law, court order, or governmental authority.",
                "In connection with a merger, acquisition, or sale of assets, with appropriate notice.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[#C6FF00] mt-0.5 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="8. Data Retention">
            <p>
              We retain your account data for as long as your account is active. If you delete your account,
              we will delete your personal data within 90 days, except:
            </p>
            <ul className="space-y-2 list-none pl-0">
              {[
                "Transaction records, which may be retained for up to 7 years for accounting and legal compliance.",
                "Content that has been licensed to brands under approved submissions — the license survives account deletion.",
                "Anonymized analytics data that cannot identify you.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[#C6FF00] mt-0.5 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="9. Your Rights">
            <p>Depending on your location, you may have the right to:</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { right: "Access", desc: "Request a copy of the personal data we hold about you." },
                { right: "Correction", desc: "Request correction of inaccurate or incomplete data." },
                { right: "Deletion", desc: "Request deletion of your personal data ('right to be forgotten')." },
                { right: "Portability", desc: "Receive your data in a machine-readable format." },
                { right: "Restriction", desc: "Request that we restrict processing of your data." },
                { right: "Objection", desc: "Object to processing based on legitimate interest." },
              ].map(({ right, desc }) => (
                <div key={right} className="p-3.5 rounded-xl border border-white/8 bg-white/[0.02]">
                  <p className="text-white font-semibold text-sm mb-1">{right}</p>
                  <p className="text-white/45 text-xs">{desc}</p>
                </div>
              ))}
            </div>
            <p>
              To exercise any of these rights, email us at{" "}
              <a href={`mailto:${EMAIL}`} className="text-[#C6FF00] hover:underline">{EMAIL}</a>. We will
              respond within 30 days.
            </p>
          </Section>

          <Section title="10. Security">
            <p>
              We implement industry-standard security measures including TLS encryption in transit,
              access controls, and regular security reviews. Authentication is managed by Firebase Auth
              with support for Google OAuth.
            </p>
            <p>
              No system is 100% secure. If you believe your account has been compromised, contact us
              immediately at <a href={`mailto:${EMAIL}`} className="text-[#C6FF00] hover:underline">{EMAIL}</a>.
            </p>
          </Section>

          <Section title="11. Children's Privacy">
            <p>
              The Platform is not directed at children under 13 (or under 16 in the EEA). We do not
              knowingly collect personal data from children. If you believe a child has provided us with
              personal data, please contact us and we will delete it promptly.
            </p>
          </Section>

          <Section title="12. International Transfers">
            <p>
              Your data may be processed in the United States and other countries where our service
              providers operate. For EEA/UK users, we ensure appropriate safeguards (such as Standard
              Contractual Clauses) are in place for cross-border transfers.
            </p>
          </Section>

          <Section title="13. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes
              by posting the updated Policy on this page and updating the "Last updated" date. For
              significant changes, we may also notify you by email.
            </p>
          </Section>

          <Section title="14. Contact Us">
            <p>For privacy-related inquiries, please contact:</p>
            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/8 space-y-1">
              <p className="font-semibold text-white">{COMPANY} — Privacy Team</p>
              <p>Email: <a href={`mailto:${EMAIL}`} className="text-[#C6FF00] hover:underline">{EMAIL}</a></p>
            </div>
          </Section>
        </div>

        {/* Footer nav */}
        <div className="pt-10 border-t border-white/8 flex flex-wrap gap-6 text-xs text-white/30">
          <Link href="/terms" className="hover:text-white/60 transition-colors">Terms of Service</Link>
          <Link href="/" className="hover:text-white/60 transition-colors">← Back to BrandOps</Link>
        </div>
      </main>
    </div>
  );
}
