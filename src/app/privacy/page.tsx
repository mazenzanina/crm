import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export const metadata = { title: 'Privacy & your free sky note • Tarot TN' };

export default function PrivacyPage() {
  return <main className="legal-shell">
    <Link className="back-link" href="/free-reading"><ArrowLeft size={16} /> Back to the free offer</Link>
    <div className="legal-card">
      <div className="legal-icon"><ShieldCheck size={24} /></div>
      <p className="eyebrow">TAROT TN · YOUR DATA</p>
      <h1>Privacy, simply.</h1>
      <p>Signing up is optional. We use your name, WhatsApp number, chosen language, and any optional birth date, local birth time, sign or location you enter to send your free daily sky note and respond to your inquiries. Only the authorized Tarot TN CRM administrator can access your information.</p>
      <h2>What we keep</h2>
      <p>Your submitted details, the times you accepted the offer’s consent checkboxes, and the last day a message was marked as sent. Your date and time of birth are optional. Dates are displayed as DD/MM/YYYY and stored as ISO dates; birth times are stored as local HH:MM without a time zone or full natal-chart calculation. To limit spam, we temporarily keep a salted daily fingerprint of your network address, not the raw address; counters are removed after around eight days. We do not sell your details or share them with advertisers. Records are stored in the CRM database (Supabase) until you ask for deletion or the service closes.</p>
      <h2>Your choice</h2>
      <p>You can stop messages any time: reply <strong>STOP</strong> to Tarot TN on WhatsApp at <a href="https://wa.me/21622481622" target="_blank" rel="noreferrer">+216 22 481 622</a>. The Tarot TN administrator will switch off daily messages in the CRM. You can also ask us to see, correct or delete your details using the same contact. No messages are sent automatically: the administrator reviews and sends them individually.</p>
      <h2>About the readings</h2>
      <p>Planet and Moon placements are calculated for 12:00 in Tunis each day. The symbolic daily tarot card is selected digitally, not physically drawn; its number is a reflective prompt, not a measured energy score. Messages are reflective entertainment, not a personal natal chart or medical, legal or financial advice. This offer is for adults aged 18+.</p>
      <p className="legal-fine">Last updated 28 September 2026 · <a href="https://tarot-tn.vercel.app/" target="_blank" rel="noreferrer">Tarot TN homepage ↗</a></p>
    </div>
  </main>;
}
