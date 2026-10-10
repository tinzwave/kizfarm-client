import type { Metadata } from "next";
import Link from "next/link";
import LegalPageLayout from "@/components/legal-page-layout";

export const metadata: Metadata = {
  title: "Delete your account | KIZ FARM",
  description: "How to delete your KIZ FARM account and what happens to your data.",
  alternates: { canonical: "https://www.kizfarm.com/delete-account" },
};

const CONTACT = "hello@kizfarm.com";

export default function Page() {
  return (
    <LegalPageLayout title="Delete your KIZ FARM account" updated="10 October 2026">
      <p>
        You can delete your KIZ FARM account at any time, directly in the app or on the website. Deletion is permanent and cannot be undone.
      </p>

      <h2>In the KIZ FARM app</h2>
      <ol>
        <li>Open the app and sign in.</li>
        <li>Go to the <strong>Profile</strong> tab.</li>
        <li>Tap <strong>Delete my account</strong> at the bottom of the screen.</li>
        <li>Confirm twice. You will be signed out immediately.</li>
      </ol>

      <h2>On the website</h2>
      <ol>
        <li>Sign in at <Link href="/login">www.kizfarm.com/login</Link>.</li>
        <li>Open your <strong>Profile</strong> page (buyers) or <strong>Farm Profile</strong> page (farmers).</li>
        <li>In the <strong>Delete account</strong> section, select <strong>Delete my account</strong>, type <strong>DELETE</strong> and confirm.</li>
      </ol>

      <h2>Can&apos;t sign in?</h2>
      <p>
        Email <a href={`mailto:${CONTACT}?subject=Delete%20my%20KIZ%20FARM%20account`}>{CONTACT}</a> from the email address on your account
        with the subject &quot;Delete my KIZ FARM account&quot;. We will verify the request and delete the account within 30 days.
      </p>

      <h2>What is deleted</h2>
      <ul>
        <li>Your sign-in, so the account can never be used again (you can sign up again later with the same email).</li>
        <li>Your name, email address, phone number, profile photo and saved addresses.</li>
        <li>For farmers: farm details, BVN, NIN, ID and selfie photos, farm photos and bank account details.</li>
        <li>Your cart, wishlist, notifications and the push-notification registration of your devices.</li>
        <li>Your products are removed from the marketplace, and courses you created are unpublished.</li>
      </ul>

      <h2>What is kept, and for how long</h2>
      <ul>
        <li>
          Records of completed orders, payments, refunds and payouts are kept for as long as the law requires for accounting, tax and
          dispute purposes. They are anonymised: they show &quot;Deleted user&quot; and no longer contain your name or contact details.
        </li>
        <li>Messages you already sent remain visible to the person you sent them to.</li>
      </ul>
      <p>
        If your account has no orders, payments or messages, everything is deleted completely. See our{" "}
        <Link href="/privacy">Privacy Policy</Link> for more about how we handle your data.
      </p>
    </LegalPageLayout>
  );
}
