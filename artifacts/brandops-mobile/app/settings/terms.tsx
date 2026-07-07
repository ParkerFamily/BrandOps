import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { TERMS_OF_SERVICE_SECTIONS } from "@/lib/legal/brandopsLegal";

export default function TermsOfServiceScreen() {
  return (
    <LegalDocumentView
      title="Terms of Service"
      sections={TERMS_OF_SERVICE_SECTIONS}
      sibling={{ label: "Read our Privacy Policy", href: "/settings/privacy" }}
    />
  );
}
