import type { Metadata } from "next";
import Link from "next/link";
import LegalPageLayout from "@/components/legal-page-layout";

export const metadata: Metadata = {
  title: "Privacy Policy | KIZ FARM",
  description: "How KIZ FARM collects, uses, shares and protects your personal data.",
  alternates: { canonical: "https://www.kizfarm.com/privacy" },
};

const CONTACT = "hello@kizfarm.com";

export default function Page() {
  return (
    <LegalPageLayout title="Privacy Policy" updated="11 October 2026">
      <p>
        KIZ FARM (&quot;KIZ FARM&quot;, &quot;we&quot;, &quot;us&quot;) is operated by KIZ EMPIREX LTD. KIZ FARM is a marketplace that connects buyers
        with verified farmers, together with a learning hub for agricultural courses. This policy explains what personal data we collect
        through our website (www.kizfarm.com) and our mobile app, why we collect it, who we share it with, and the choices and rights you
        have. We process personal data in line with the Nigeria Data Protection Act 2023 (NDPA).
      </p>

      <h2>1. Information we collect</h2>
      <h3>Information you give us</h3>
      <ul>
        <li><strong>Account details:</strong> name, email address, phone number and password (stored only in encrypted, hashed form), and a referral code if you use one.</li>
        <li><strong>Profile and delivery details:</strong> profile photo, address, city and state, and the delivery addresses you save.</li>
        <li>
          <strong>Farmer verification (farmers only):</strong> full name, farm name, farm type, location and farm address, Bank Verification Number
          (BVN), National Identification Number (NIN), a photo of a government-issued ID, a photo of yourself, photos of your farm, and the
          bank account details used to pay you.
        </li>
        <li><strong>Listings and courses:</strong> product details and photos you publish, and courses (including cover images) you create.</li>
        <li><strong>Orders:</strong> the products you buy or sell, quantities, prices, delivery details and order status.</li>
        <li><strong>Messages:</strong> chats between buyers and farmers, including photos and files you send.</li>
        <li><strong>Reviews</strong> you leave for products and courses.</li>
        <li><strong>Support requests</strong> you send us.</li>
      </ul>
      <h3>Information collected automatically</h3>
      <ul>
        <li><strong>Payment references:</strong> payments are processed by Flutterwave. We receive a payment reference, the amount and whether it succeeded. We never see or store your full card number, PIN or bank login.</li>
        <li><strong>Push notification token:</strong> if you allow notifications in the app, we store a token for your device so we can send you order, payment and message alerts.</li>
        <li><strong>Technical data:</strong> standard server logs such as IP address, device and browser type and time of access, used for security and troubleshooting.</li>
      </ul>
      <h3>Device permissions</h3>
      <p>
        The app asks for access to your photos or camera only when you choose to upload a picture (for example a product photo, a
        verification document, a chat photo or a course cover). It asks for notification permission to send you alerts. You can change
        these permissions at any time in your phone&apos;s settings.
      </p>

      <h2>2. How we use your information</h2>
      <ul>
        <li>To create and secure your account and verify your email address.</li>
        <li>To process orders: calculate transport fares, take payments, arrange delivery, handle refunds and pay farmers.</li>
        <li>To verify farmers before they can sell, to reduce fraud.</li>
        <li>To let buyers and farmers chat with each other about products and orders.</li>
        <li>To send you notifications and emails about your orders, payments, messages, courses and account.</li>
        <li>To provide courses you buy and pay course creators.</li>
        <li>To keep the platform safe, prevent fraud and abuse, and enforce our rules.</li>
        <li>To meet legal, tax and accounting obligations.</li>
      </ul>
      <p>
        We rely on the following legal bases: performing our contract with you (running your account and orders), our legitimate
        interests (security, fraud prevention and improving the service), compliance with legal obligations (financial records), and
        your consent where we ask for it (for example notifications), which you can withdraw at any time.
      </p>
      <p>We do not sell your personal data, and we do not show third-party advertising.</p>

      <h2>3. Who we share it with</h2>
      <ul>
        <li><strong>Other users, as needed for an order:</strong> farmers see the buyer&apos;s name and the delivery details for their orders; buyers see the farm name and location; chat participants see each other&apos;s names and messages.</li>
        <li><strong>Delivery drivers:</strong> the delivery address and contact phone for the order they deliver.</li>
        <li>
          <strong>Service providers</strong> who process data on our behalf, under contract:
          Supabase (database, sign-in and file storage), Vercel (website hosting), Flutterwave (payments), Resend (email delivery), and
          Expo, Google Firebase Cloud Messaging and Apple Push Notification service (app notifications).
        </li>
        <li><strong>Authorities</strong> when required by law, or to protect the rights, property or safety of our users or the public.</li>
      </ul>
      <p>
        Some of these providers store or process data outside Nigeria. Where that happens we rely on the safeguards the NDPA requires,
        such as the provider&apos;s contractual data protection commitments.
      </p>

      <h2>4. How long we keep it</h2>
      <p>
        We keep your data while your account is active. When you delete your account we erase your personal details, addresses, bank
        details, verification documents and photos, and remove your products from the marketplace. Records of completed orders and
        payments are kept, with your personal details removed, for as long as the law requires for accounting, tax and dispute purposes.
        Messages you sent stay visible to the person you sent them to.
      </p>

      <h2>5. Keeping it secure</h2>
      <p>
        Data is encrypted in transit (HTTPS). Access is restricted so that users can only see their own data and the data needed for
        their orders; verification documents and chat attachments are stored privately. No method of storage or transmission is
        perfectly secure, but we work to protect your data and will notify you and the authorities of a breach where the law requires.
      </p>

      <h2>6. Your rights</h2>
      <p>Under the NDPA you have the right to:</p>
      <ul>
        <li>access the personal data we hold about you and get a copy of it;</li>
        <li>correct inaccurate data (most details can be edited in your profile);</li>
        <li>delete your account and personal data — see <Link href="/delete-account">how to delete your account</Link>;</li>
        <li>object to or restrict certain processing, and withdraw consent;</li>
        <li>receive your data in a portable format;</li>
        <li>complain to the Nigeria Data Protection Commission (NDPC).</li>
      </ul>
      <p>To exercise any of these rights, email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. We will respond within 30 days.</p>

      <h2>7. Children</h2>
      <p>KIZ FARM is intended for people aged 18 and over. We do not knowingly collect data from children; if you believe a child has created an account, contact us and we will delete it.</p>

      <h2>8. Changes to this policy</h2>
      <p>We may update this policy. If we make significant changes we will notify you in the app or by email. The date at the top shows when it was last updated.</p>

      <h2>9. Contact us</h2>
      <p>
        KIZ EMPIREX LTD (KIZ FARM)<br />
        Ekwulobia, Anambra State, Nigeria<br />
        Email: <a href={`mailto:${CONTACT}`}>{CONTACT}</a><br />
        Phone: <a href="tel:+2347031672282">+234 703 167 2282</a>
      </p>
    </LegalPageLayout>
  );
}
