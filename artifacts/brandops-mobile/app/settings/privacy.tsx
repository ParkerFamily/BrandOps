import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { PRIVACY_POLICY_SECTIONS } from "@/lib/legal/brandopsLegal";

export default function PrivacyPolicyScreen() {
  return (
    <LegalDocumentView
      title="Privacy Policy"
      sections={PRIVACY_POLICY_SECTIONS}
      sibling={{ label: "Read our Terms of Service", href: "/settings/terms" }}
    />
  );
}
