export const LEGAL_LAST_UPDATED = "June 3, 2026";
export const LEGAL_CONTACT_EMAIL = "support@brandopsapp.com";
export const LEGAL_WEB_URL = "https://brandopsapp.com";

export type LegalSection = {
  title: string;
  paragraphs: string[];
};

export const PRIVACY_POLICY_SECTIONS: LegalSection[] = [
  {
    title: "Introduction",
    paragraphs: [
      "BrandOps (“we”, “us”, or “our”) operates the BrandOps mobile application and web platform at brandopsapp.com. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services.",
      "By using BrandOps, you agree to this Privacy Policy and our Terms of Service. If you do not agree, do not use the app.",
    ],
  },
  {
    title: "Information we collect",
    paragraphs: [
      "Account information: name, email address, authentication identifiers (including Firebase Auth and Google Sign-In), workspace role (creator or brand), and profile preferences.",
      "Content you provide: UGC videos, submission metadata, campaign notes, messages, and files uploaded to Firebase Storage.",
      "Payment information: payout and billing status processed through Stripe. We do not store full payment card numbers on our servers.",
      "Device and usage data: push notification tokens (OneSignal), app diagnostics, crash logs, and general usage needed to operate and improve the service.",
    ],
  },
  {
    title: "How we use information",
    paragraphs: [
      "We use your information to authenticate you, sync campaigns and submissions, deliver notifications, process creator payouts, provide customer support, prevent fraud, and comply with legal obligations.",
      "Brands can view submissions you send to their campaigns. Creators can view status updates on campaigns they join.",
    ],
  },
  {
    title: "Sharing and processors",
    paragraphs: [
      "We share data with service providers that help us run BrandOps, including Google Firebase (auth, database, storage), Stripe (payments), OneSignal (push notifications), and OpenAI where AI features are enabled.",
      "We do not sell your personal information. We may disclose information if required by law or to protect rights, safety, and integrity of the platform.",
    ],
  },
  {
    title: "Data retention",
    paragraphs: [
      "We retain account and submission data while your account is active and as needed to provide the service, resolve disputes, and meet legal requirements. You may request deletion of your account by contacting us.",
    ],
  },
  {
    title: "Your choices",
    paragraphs: [
      "You can update profile information in the app, manage push permissions in iOS Settings, and request access or deletion by emailing us.",
      "California and other regional privacy rights may apply. Contact us to exercise applicable rights.",
    ],
  },
  {
    title: "Children",
    paragraphs: ["BrandOps is not directed to children under 13. We do not knowingly collect data from children under 13."],
  },
  {
    title: "Changes",
    paragraphs: [
      "We may update this Privacy Policy from time to time. Material changes will be reflected by updating the “Last updated” date. Continued use after changes constitutes acceptance.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [
      `Questions about privacy: ${LEGAL_CONTACT_EMAIL}`,
      `Website: ${LEGAL_WEB_URL}`,
    ],
  },
];

export const TERMS_OF_SERVICE_SECTIONS: LegalSection[] = [
  {
    title: "Agreement",
    paragraphs: [
      "These Terms of Service (“Terms”) govern your access to and use of BrandOps mobile and web services. By creating an account or using BrandOps, you agree to these Terms and our Privacy Policy.",
    ],
  },
  {
    title: "Eligibility",
    paragraphs: [
      "You must be at least 18 years old (or the age of majority in your jurisdiction) and able to form a binding contract. You are responsible for activity under your account.",
    ],
  },
  {
    title: "Accounts and workspaces",
    paragraphs: [
      "BrandOps supports creator and brand workspaces. You are responsible for keeping credentials secure and for accurate account information.",
      "You may not impersonate others, share accounts in ways that violate these Terms, or use the service for unlawful purposes.",
    ],
  },
  {
    title: "Campaigns and submissions",
    paragraphs: [
      "Creators submit UGC to campaigns operated by brands. You represent that you have rights to content you upload and that it does not infringe third-party rights or violate applicable law.",
      "Brands may approve, reject, or request revisions. Payout timing and amounts depend on campaign terms shown in the app and successful payout setup (e.g., Stripe Connect for creators).",
    ],
  },
  {
    title: "Acceptable use",
    paragraphs: [
      "You may not upload malware, spam, hate content, illegal material, or content that violates platform policies. We may remove content or suspend accounts that violate these Terms.",
    ],
  },
  {
    title: "Payments",
    paragraphs: [
      "Paid features, campaign budgets, and creator payouts are processed through third-party payment providers. Fees, taxes, and chargebacks are handled according to provider rules and campaign configuration.",
    ],
  },
  {
    title: "Intellectual property",
    paragraphs: [
      "BrandOps retains rights in the platform, trademarks, and software. You retain ownership of your content, but grant BrandOps and the relevant brand a license to use submitted UGC for campaign review, approval workflows, and delivery as described in the campaign brief.",
    ],
  },
  {
    title: "Disclaimers",
    paragraphs: [
      "BrandOps is provided “as is” without warranties of uninterrupted or error-free operation. We do not guarantee campaign outcomes, earnings, or brand acceptance of submissions.",
    ],
  },
  {
    title: "Limitation of liability",
    paragraphs: [
      "To the maximum extent permitted by law, BrandOps and its affiliates are not liable for indirect, incidental, special, or consequential damages arising from your use of the service.",
    ],
  },
  {
    title: "Termination",
    paragraphs: [
      "You may stop using BrandOps at any time. We may suspend or terminate access for violations of these Terms or to protect the platform.",
    ],
  },
  {
    title: "Changes",
    paragraphs: [
      "We may modify these Terms. Updated Terms take effect when posted with a new “Last updated” date. Continued use constitutes acceptance.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [
      `Questions about these Terms: ${LEGAL_CONTACT_EMAIL}`,
      `Website: ${LEGAL_WEB_URL}`,
    ],
  },
];
