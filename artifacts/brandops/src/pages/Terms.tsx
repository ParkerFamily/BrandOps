import { Link } from "wouter";
import { Zap, ArrowLeft } from "lucide-react";

const LAST_UPDATED = "May 31, 2026";
const COMPANY = "BrandOps";
const EMAIL = "legal@brandops.io";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <div className="space-y-3 text-white/60 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

export default function Terms() {
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
          <h1 className="text-4xl font-black tracking-tight">Terms of Service</h1>
          <p className="text-white/40 text-sm">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-10">
          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using {COMPANY} ("the Platform," "we," "us," or "our"), you agree to be bound by
              these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Platform.
            </p>
            <p>
              These Terms apply to all users of the Platform, including brands, Creator Managers, and individual
              creators. Different provisions may apply depending on your role, as indicated throughout these Terms.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>
              {COMPANY} is a software platform that enables brands to manage user-generated content (UGC) campaigns
              — including creating campaign briefs, recruiting creators to produce video content, reviewing
              submissions, and automating creator payouts. Creators produce original video content that brands
              license for use on their own channels, advertisements, and social media.
            </p>
            <p>
              {COMPANY} is <strong className="text-white">not</strong> an influencer marketplace. Creator social
              audience size and follower counts are not a primary factor on our platform. The focus is on content
              production quality, turnaround time, and approval rates.
            </p>
            <p>
              We reserve the right to modify, suspend, or discontinue any part of the Platform at any time with
              reasonable notice where practicable.
            </p>
          </Section>

          <Section title="3. Accounts and Registration">
            <p>
              To use the Platform, you must create an account and provide accurate, current, and complete
              information. You are responsible for maintaining the confidentiality of your account credentials
              and for all activities that occur under your account.
            </p>
            <p>
              You must be at least 18 years of age to create an account. By registering, you represent and warrant
              that you meet this requirement.
            </p>
            <p>
              We reserve the right to suspend or terminate accounts that violate these Terms, contain false
              information, or engage in fraudulent activity.
            </p>
          </Section>

          <Section title="4. Brand Obligations">
            <p>
              As a brand user, you agree to:
            </p>
            <ul className="space-y-2 list-none pl-0">
              {[
                "Provide accurate and complete campaign briefs that clearly describe the content you require.",
                "Review and respond to creator submissions within a reasonable timeframe (we recommend no more than 14 days).",
                "Pay creators the agreed amount upon approval of their submissions, using the Platform's payout system.",
                "Not use creator content beyond the scope of the license granted under these Terms without additional written agreement.",
                "Not request content that is illegal, defamatory, discriminatory, or in violation of any third-party rights.",
                "Maintain a valid payment method on file to fund active campaigns and process payouts.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[#C6FF00] mt-0.5 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="5. Creator Obligations">
            <p>As a creator or Creator Manager, you agree to:</p>
            <ul className="space-y-2 list-none pl-0">
              {[
                "Only submit original content that you have the right to license to the brand.",
                "Comply with all campaign brief requirements, including content guidelines, brand safety requirements, and deadlines.",
                "Not submit content that is illegal, defamatory, pornographic, violent, or that infringes any third-party intellectual property.",
                "Not submit AI-generated content unless the campaign brief explicitly permits it.",
                "Provide accurate payout information and maintain a valid Stripe-connected account to receive payments.",
                "Disclose any material connection to a brand in any public use of submitted content, as required by applicable law.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[#C6FF00] mt-0.5 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="6. Content Licensing">
            <p>
              When a brand approves a creator's submission, the creator grants to the brand a worldwide,
              non-exclusive, royalty-free, perpetual license to use, reproduce, distribute, display, and create
              derivative works of the submitted content for any lawful commercial purpose, including paid
              advertising, organic social media posts, and website content.
            </p>
            <p>
              The creator retains ownership of the underlying content but acknowledges that the brand may use the
              licensed content without further compensation beyond the agreed campaign payout, unless otherwise
              specified in the campaign brief.
            </p>
            <p>
              By submitting content through the Platform, you represent and warrant that: (a) you are the original
              creator or have all necessary rights to the content; (b) the content does not infringe any
              third-party intellectual property rights; and (c) the content complies with all applicable laws.
            </p>
          </Section>

          <Section title="7. Payments and Payouts">
            <p>
              All payment processing is handled by Stripe, Inc. By using the Platform's payment features, you
              agree to Stripe's Terms of Service and Privacy Policy. {COMPANY} is not responsible for payment
              processing errors caused by Stripe.
            </p>
            <p>
              <strong className="text-white">Brands:</strong> You authorize {COMPANY} to charge your payment
              method on file for subscription fees and to hold campaign budgets in escrow pending creator
              submission approval. Subscription fees are non-refundable except as required by applicable law.
            </p>
            <p>
              <strong className="text-white">Creators:</strong> Payouts are initiated by {COMPANY} after a brand
              approves your submission. Payout timing depends on your Stripe account status and may take 2–5
              business days. {COMPANY} does not guarantee any minimum payout amount or frequency of campaigns.
            </p>
            <p>
              {COMPANY} charges a platform fee of up to 15% on each creator payout, deducted before disbursement.
              The exact fee applicable to your account is displayed in your account settings.
            </p>
          </Section>

          <Section title="8. Subscription Plans">
            <p>
              {COMPANY} offers paid subscription plans for brand users. Plan features, pricing, and billing cycles
              are displayed on the Billing page within the Platform. We reserve the right to change plan pricing
              with 30 days' notice.
            </p>
            <p>
              Free trials, where offered, automatically convert to paid subscriptions at the end of the trial period
              unless you cancel before the trial ends. You can cancel your subscription at any time from the Billing
              page — cancellation takes effect at the end of the current billing period.
            </p>
          </Section>

          <Section title="9. Prohibited Use">
            <p>You agree not to:</p>
            <ul className="space-y-2 list-none pl-0">
              {[
                "Use the Platform for any unlawful purpose or in violation of any applicable regulations.",
                "Attempt to gain unauthorized access to any part of the Platform or its systems.",
                "Scrape, crawl, or extract data from the Platform in bulk without written permission.",
                "Use the Platform to send unsolicited communications (spam) to other users.",
                "Impersonate any person or entity or falsely state your affiliation with a person or entity.",
                "Interfere with or disrupt the integrity or performance of the Platform.",
                "Reverse engineer, decompile, or disassemble any part of the Platform.",
                "Use the Platform to conduct any form of fraudulent activity, including fake submissions or false reviews.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-red-400 mt-0.5 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="10. AI Features">
            <p>
              The Platform includes AI-powered features including campaign brief assistance, submission review,
              and the AI Assistant. These features are powered by third-party large language models (currently
              OpenAI). AI outputs are generated algorithmically and may contain inaccuracies — do not rely on
              them as legal, financial, or professional advice.
            </p>
            <p>
              By using AI features, you agree that your inputs may be processed by third-party AI providers
              subject to their respective terms and privacy policies. We do not use your campaign data to train
              AI models without your explicit consent.
            </p>
          </Section>

          <Section title="11. Intellectual Property">
            <p>
              The Platform, including its design, code, trademarks, and all content created by {COMPANY}
              (excluding user-submitted content), is the exclusive property of {COMPANY} and its licensors. You
              are granted a limited, non-exclusive, non-transferable license to use the Platform for its
              intended purposes.
            </p>
            <p>
              You may not copy, modify, distribute, sell, or lease any part of the Platform, or reverse engineer
              or attempt to extract the source code, without written permission.
            </p>
          </Section>

          <Section title="12. Disclaimers">
            <p>
              THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR
              IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
              PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED,
              ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
            </p>
          </Section>

          <Section title="13. Limitation of Liability">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, {COMPANY.toUpperCase()} AND ITS DIRECTORS,
              EMPLOYEES, PARTNERS, AND LICENSORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
              CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF OR INABILITY TO USE THE PLATFORM,
              EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
            <p>
              IN NO EVENT SHALL {COMPANY.toUpperCase()}'S TOTAL LIABILITY TO YOU EXCEED THE GREATER OF (A) THE
              AMOUNT YOU PAID TO {COMPANY.toUpperCase()} IN THE TWELVE MONTHS PRECEDING THE CLAIM, OR (B) $100 USD.
            </p>
          </Section>

          <Section title="14. Indemnification">
            <p>
              You agree to indemnify and hold harmless {COMPANY}, its affiliates, officers, directors, employees,
              and agents from and against any claims, liabilities, damages, losses, and expenses (including
              reasonable attorneys' fees) arising from: (a) your use of the Platform; (b) your violation of
              these Terms; (c) your content submitted through the Platform; or (d) your violation of any
              third-party rights.
            </p>
          </Section>

          <Section title="15. Termination">
            <p>
              We may terminate or suspend your access to the Platform immediately, without prior notice, if you
              breach these Terms or engage in any conduct we deem harmful to the Platform or other users.
            </p>
            <p>
              You may terminate your account at any time by contacting us at {EMAIL}. Upon termination, your
              right to use the Platform ceases immediately. Content you have submitted may be retained by brands
              under licenses already granted prior to termination.
            </p>
          </Section>

          <Section title="16. Governing Law and Dispute Resolution">
            <p>
              These Terms are governed by the laws of the State of Delaware, United States, without regard to
              its conflict of law provisions.
            </p>
            <p>
              Any disputes arising from these Terms shall first be attempted to be resolved through good-faith
              negotiation. If unresolved within 30 days, disputes shall be submitted to binding arbitration
              under the American Arbitration Association's Commercial Arbitration Rules. You waive the right
              to participate in class action lawsuits or class-wide arbitration.
            </p>
          </Section>

          <Section title="17. Changes to These Terms">
            <p>
              We reserve the right to modify these Terms at any time. We will provide notice of material changes
              by posting the updated Terms on this page and updating the "Last updated" date. Continued use of
              the Platform after changes constitutes your acceptance of the revised Terms.
            </p>
          </Section>

          <Section title="18. Contact Us">
            <p>
              If you have questions about these Terms, please contact us at:
            </p>
            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/8 space-y-1">
              <p className="font-semibold text-white">{COMPANY}</p>
              <p>Email: <a href={`mailto:${EMAIL}`} className="text-[#C6FF00] hover:underline">{EMAIL}</a></p>
            </div>
          </Section>
        </div>

        {/* Footer nav */}
        <div className="pt-10 border-t border-white/8 flex flex-wrap gap-6 text-xs text-white/30">
          <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</Link>
          <Link href="/" className="hover:text-white/60 transition-colors">← Back to BrandOps</Link>
        </div>
      </main>
    </div>
  );
}
