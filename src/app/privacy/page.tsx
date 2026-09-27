import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export const metadata = { title: 'Privacy & your free sky note • Tarot Tunisia' };

export default function PrivacyPage() {
  return <main className="legal-shell">
    <Link className="back-link" href="/free-reading"><ArrowLeft size={16} /> Back to the free offer</Link>
    <div className="legal-card">
      <div className="legal-icon"><ShieldCheck size={24} /></div>
      <p className="eyebrow">TAROT TUNISIA · YOUR DATA</p>
      <h1>Privacy, simply.</h1>
      <p>Signing up is optional. We use your name, WhatsApp number, chosen language, and any optional birth date, sign or location you enter to send your free daily sky note and respond to your inquiries. Only Mazen, the CRM administrator, can access your information.</p>
      <h2>What we keep</h2>
      <p>Your submitted details, the times you accepted the offer’s consent checkboxes, and the last day a message was marked as sent. Your date of birth is optional. To limit spam, we temporarily keep a salted daily fingerprint of your network address, not the raw address; counters are removed after around eight days. We do not sell your details or share them with advertisers. Records are stored in the CRM database (Supabase) until you ask for deletion or the service closes.</p>
      <h2>Your choice</h2>
      <p>You can stop messages any time: reply <strong>STOP</strong> to Mazen on WhatsApp at <a href="https://wa.me/21622481622" target="_blank" rel="noreferrer">+216 22 481 622</a>. Mazen will switch off daily messages in the CRM. You can also ask Mazen to see, correct or delete your details using the same contact. No messages are sent automatically: Mazen reviews and sends them individually.</p>
      <h2>About the readings</h2>
      <p>Planet and Moon placements are calculated for 12:00 in Tunis each day. Messages are reflective entertainment, not a personal natal chart or medical, legal or financial advice. This offer is for adults aged 18+.</p>
      <p className="legal-fine">Last updated 26 September 2026 · <a href="https://tarot-tn.vercel.app/" target="_blank" rel="noreferrer">Tarot Tunisia homepage ↗</a></p>
    </div>
  </main>;
}
