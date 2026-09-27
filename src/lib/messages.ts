import { SIGN_ELEMENTS, SIGN_SYMBOLS, type Client, type Language, type PlanetName, type SkySnapshot, type ZodiacSign } from './types';

const LOCAL_SIGNS: Record<Language, Record<ZodiacSign, string>> = {
  en: { Aries: 'Aries', Taurus: 'Taurus', Gemini: 'Gemini', Cancer: 'Cancer', Leo: 'Leo', Virgo: 'Virgo', Libra: 'Libra', Scorpio: 'Scorpio', Sagittarius: 'Sagittarius', Capricorn: 'Capricorn', Aquarius: 'Aquarius', Pisces: 'Pisces' },
  fr: { Aries: 'Bélier', Taurus: 'Taureau', Gemini: 'Gémeaux', Cancer: 'Cancer', Leo: 'Lion', Virgo: 'Vierge', Libra: 'Balance', Scorpio: 'Scorpion', Sagittarius: 'Sagittaire', Capricorn: 'Capricorne', Aquarius: 'Verseau', Pisces: 'Poissons' },
  tn: { Aries: 'الحمل', Taurus: 'الثور', Gemini: 'الجوزاء', Cancer: 'السرطان', Leo: 'الأسد', Virgo: 'العذراء', Libra: 'الميزان', Scorpio: 'العقرب', Sagittarius: 'القوس', Capricorn: 'الجدي', Aquarius: 'الدلو', Pisces: 'الحوت' },
};
const LOCAL_PLANETS: Record<Language, Record<PlanetName, string>> = {
  en: { Sun: 'Sun', Moon: 'Moon', Mercury: 'Mercury', Venus: 'Venus', Mars: 'Mars', Jupiter: 'Jupiter', Saturn: 'Saturn', Uranus: 'Uranus', Neptune: 'Neptune', Pluto: 'Pluto' },
  fr: { Sun: 'Soleil', Moon: 'Lune', Mercury: 'Mercure', Venus: 'Vénus', Mars: 'Mars', Jupiter: 'Jupiter', Saturn: 'Saturne', Uranus: 'Uranus', Neptune: 'Neptune', Pluto: 'Pluton' },
  tn: { Sun: 'الشمس', Moon: 'القمر', Mercury: 'عطارد', Venus: 'الزهرة', Mars: 'المريخ', Jupiter: 'المشتري', Saturn: 'زحل', Uranus: 'أورانوس', Neptune: 'نبتون', Pluto: 'بلوتو' },
};

const ELEMENT_REFLECTIONS: Record<Language, Record<'Fire' | 'Earth' | 'Air' | 'Water', string[]>> = {
  en: {
    Fire: ['Give one idea a brave first step, without trying to finish everything.', 'Put your energy behind what matters, not every interruption.', 'Notice where initiative feels exciting rather than rushed.', 'Choose one clear intention, then leave room for surprise.'],
    Earth: ['Make a small, practical adjustment that supports your future self.', 'Simplify a routine before taking on another commitment.', 'Notice what is already growing through patience and care.', 'Give your body and schedule a little breathing room today.'],
    Air: ['Ask a better question before deciding on an answer.', 'A thoughtful conversation may help you see a fresh angle.', 'Write down the idea that keeps returning to you.', 'Make room for curiosity instead of needing instant certainty.'],
    Water: ['Pay attention to the feeling beneath the headline.', 'Protect your energy while staying open to connection.', 'A gentle pause can help you hear what you really need.', 'Offer yourself the same kindness you give to others.'],
  },
  fr: {
    Fire: ['Fais un premier pas courageux vers une seule idée.', 'Garde ton énergie pour ce qui compte vraiment.', 'Remarque où ton élan est joyeux plutôt que précipité.', 'Choisis une intention claire et laisse place à l’imprévu.'],
    Earth: ['Apporte un petit ajustement concret à ta routine.', 'Simplifie avant d’ajouter un nouvel engagement.', 'Vois ce qui grandit déjà grâce à ta patience.', 'Accorde un peu d’espace à ton corps et à ton agenda.'],
    Air: ['Pose une meilleure question avant de trancher.', 'Une conversation peut ouvrir un autre point de vue.', 'Note l’idée qui revient sans cesse.', 'Laisse de la place à la curiosité, sans forcer la réponse.'],
    Water: ['Écoute l’émotion derrière les événements.', 'Protège ton énergie tout en restant ouvert·e au lien.', 'Une pause douce peut éclairer ton vrai besoin.', 'Offre-toi la même douceur que tu offres aux autres.'],
  },
  tn: {
    Fire: ['ابدأ بخطوة صغيرة وشجاعة في حاجة تهمّك.', 'خلّي طاقتك للحاجات اللي تستاهل.', 'شوف وين الحماس يفرّحك موش يستعجلك.', 'حدّد نية واضحة وخلي مساحة للمفاجآت.'],
    Earth: ['بدّل حاجة بسيطة في روتينك تنفعك لقدّام.', 'بسّط نهارك قبل ما تزيد التزامات.', 'لاحظ اللي قاعد يكبر بصبرك.', 'أعطي وقت لراحتك ولتنظيم نهارك.'],
    Air: ['اسأل سؤال أوضح قبل ما تقرّر.', 'حديث باهي ينجم يوريك زاوية جديدة.', 'اكتب الفكرة اللي ترجعلك كل مرّة.', 'خلّي الفضول يحضّرلك الإجابة بلا استعجال.'],
    Water: ['اسمع إحساسك وراء اللي صاير.', 'احمي طاقتك وخليك قريب للي تحبهم.', 'وقفة هادئة تعاونك تفهم شنوّة تحتاج.', 'عامل روحك بنفس الحنية اللي تعطيها لغيرك.'],
  },
};

const STEPS: Record<Language, string[]> = {
  en: ['Take five quiet minutes before checking your phone.', 'Write one sentence about what you want to make space for.', 'Reach out to someone you trust with one honest thought.', 'Finish one small task and let that be enough.', 'Make a little time for something beautiful or creative.', 'Choose a calm boundary you can keep today.', 'Notice one good thing that you almost missed.'],
  fr: ['Prends cinq minutes au calme avant de regarder ton téléphone.', 'Écris une phrase sur ce à quoi tu veux faire de la place.', 'Partage une pensée sincère avec une personne de confiance.', 'Termine une petite tâche, et laisse-la suffire.', 'Prends un moment pour quelque chose de beau ou créatif.', 'Choisis une limite douce que tu peux respecter aujourd’hui.', 'Remarque une belle chose que tu avais presque manquée.'],
  tn: ['خذ خمسة دقايق هدوء قبل التليفون.', 'اكتب جملة على الحاجة اللي تحب تفسح لها بلاصة.', 'احكي بصراحة مع شخص ترتاحلو.', 'كمّل حاجة صغيرة وخليها تكفي لليوم.', 'اعطي وقت لحاجة جميلة ولا فيها إبداع.', 'حط حدّ بسيط ومريح تنجم تحافظ عليه.', 'لاحظ حاجة باهية كنت باش تفوتها.'],
};

const PHASE_NAMES: Record<Language, Record<string, string>> = {
  en: {
    'New Moon': 'New Moon', 'Waxing Crescent': 'Waxing Crescent', 'First Quarter': 'First Quarter',
    'Waxing Gibbous': 'Waxing Gibbous', 'Full Moon': 'Full Moon', 'Waning Gibbous': 'Waning Gibbous',
    'Last Quarter': 'Last Quarter', 'Waning Crescent': 'Waning Crescent',
  },
  fr: {
    'New Moon': 'nouvelle lune', 'Waxing Crescent': 'premier croissant', 'First Quarter': 'premier quartier',
    'Waxing Gibbous': 'lune gibbeuse croissante', 'Full Moon': 'pleine lune', 'Waning Gibbous': 'lune gibbeuse décroissante',
    'Last Quarter': 'dernier quartier', 'Waning Crescent': 'dernier croissant',
  },
  tn: {
    'New Moon': 'محاق', 'Waxing Crescent': 'هلال متزايد', 'First Quarter': 'تربيع أوّل',
    'Waxing Gibbous': 'قمر متزايد', 'Full Moon': 'بدر', 'Waning Gibbous': 'قمر متناقص',
    'Last Quarter': 'تربيع أخير', 'Waning Crescent': 'هلال متناقص',
  },
};

const ASPECT_NAMES: Record<Language, Record<string, string>> = {
  en: { conjunction: 'meets', sextile: 'sextiles', square: 'squares', trine: 'trines', opposition: 'opposes' },
  fr: { conjunction: 'rejoint', sextile: 'est en sextile avec', square: 'est en carré avec', trine: 'est en trigone avec', opposition: 's’oppose à' },
  tn: { conjunction: 'يتلاقى مع', sextile: 'في تسديس مع', square: 'في تربيع مع', trine: 'في تثليث مع', opposition: 'في مقابلة مع' },
};

export interface MessageParts { body: string; invitation: string }

function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

function formattedDate(sky: SkySnapshot, language: Language): string {
  const locale = language === 'tn' ? 'ar-TN' : language === 'fr' ? 'fr-FR' : 'en-GB';
  return new Intl.DateTimeFormat(locale, { timeZone: sky.timeZone, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(sky.calculatedAt));
}

function signPhrase(sign: ZodiacSign | null, language: Language): string {
  if (!sign) return language === 'fr' ? 'pour toi' : language === 'tn' ? 'ليك' : 'for you';
  if (language === 'fr') return `pour ton Soleil en ${SIGN_SYMBOLS[sign]} ${LOCAL_SIGNS.fr[sign]}`;
  if (language === 'tn') return `على برجك الشمسي ${SIGN_SYMBOLS[sign]} ${LOCAL_SIGNS.tn[sign]}`;
  return `for your ${SIGN_SYMBOLS[sign]} ${sign} Sun`;
}

/** Interpretive text is distinct from the astronomical data; no fake natal chart or tarot draw. */
export function makeDailyMessage(client: Pick<Client, 'id' | 'name' | 'sun_sign' | 'preferred_language'>, sky: SkySnapshot, bookingUrl: string): MessageParts {
  const language = client.preferred_language || 'en';
  const moon = sky.planets.find((planet) => planet.name === 'Moon')!;
  const mercury = sky.planets.find((planet) => planet.name === 'Mercury')!;
  const venus = sky.planets.find((planet) => planet.name === 'Venus')!;
  const element = client.sun_sign ? SIGN_ELEMENTS[client.sun_sign] : SIGN_ELEMENTS[moon.sign];
  const index = dayNumber(sky.dateKey) + (client.sun_sign ? Math.floor(sky.planets.find((p) => p.name === 'Sun')!.longitude / 30) : 0);
  const reflection = ELEMENT_REFLECTIONS[language][element][((index % 4) + 4) % 4];
  const action = STEPS[language][((index % 7) + 7) % 7];
  const phase = PHASE_NAMES[language][sky.moon.phase];
  const date = formattedDate(sky, language);
  const firstName = client.name.trim().split(/\s+/)[0] || client.name;
  const aspect = sky.aspects.find((a) => a.body !== 'Sun') || sky.aspects[0];
  const aspectLine = aspect
    ? language === 'fr' ? `☽ La Lune ${ASPECT_NAMES.fr[aspect.kind]} ${LOCAL_PLANETS.fr[aspect.body]} aujourd’hui.`
      : language === 'tn' ? `☽ القمر ${ASPECT_NAMES.tn[aspect.kind]} ${LOCAL_PLANETS.tn[aspect.body]} اليوم.`
        : `☽ The Moon ${ASPECT_NAMES.en[aspect.kind]} ${aspect.body} today.`
    : '';
  const mercuryLit = Math.round(mercury.illuminatedPercent || 0);
  const venusLit = Math.round(venus.illuminatedPercent || 0);
  const skyLine = language === 'fr'
    ? `La Lune est en ${LOCAL_SIGNS.fr[moon.sign]} (${phase}, ${sky.moon.illumination} % éclairée). Mercure est en ${LOCAL_SIGNS.fr[mercury.sign]} (${mercuryLit} % éclairé), Vénus en ${LOCAL_SIGNS.fr[venus.sign]} (${venusLit} % éclairée).`
    : language === 'tn'
      ? `القمر في ${LOCAL_SIGNS.tn[moon.sign]} (${phase}، الإضاءة ${sky.moon.illumination}٪). عطارد في ${LOCAL_SIGNS.tn[mercury.sign]} (إضاءة ${mercuryLit}٪) والزهرة في ${LOCAL_SIGNS.tn[venus.sign]} (إضاءة ${venusLit}٪).`
      : `The Moon is in ${moon.sign} (${phase}, ${sky.moon.illumination}% illuminated). Mercury is in ${mercury.sign} (${mercuryLit}% lit); Venus is in ${venus.sign} (${venusLit}% lit).`;
  if (language === 'fr') return {
    body: `☾ TON CIEL DU JOUR · ${date}\nSalut ${firstName} ✨\n\n${skyLine}${aspectLine ? `\n${aspectLine}` : ''}\n\nUne piste ${signPhrase(client.sun_sign, language)} : ${reflection}\n\nUn petit geste : ${action}`,
    invitation: `Pour arrêter les messages, réponds STOP.\nEnvie d’une lecture vraiment personnelle ? Réserve ta séance avec Mazen :\n${bookingUrl}`,  
  };
  if (language === 'tn') return {
    body: `☾ سماك اليوم · ${date}\nعسلامة ${firstName} ✨\n\n${skyLine}${aspectLine ? `\n${aspectLine}` : ''}\n\nفكرة ${signPhrase(client.sun_sign, language)}: ${reflection}\n\nخطوة صغيرة: ${action}`,
    invitation: `باش توقف الرسائل، ابعث STOP.\nتحب قراءة معمّقة وخاصة بيك؟ احجز جلستك مع مازن:\n${bookingUrl}`,  
  };
  return {
    body: `☾ YOUR DAILY SKY · ${date}\nHi ${firstName} ✨\n\n${skyLine}${aspectLine ? `\n${aspectLine}` : ''}\n\nA thought ${signPhrase(client.sun_sign, language)}: ${reflection}\n\nOne small step: ${action}`,
    invitation: `To stop these messages, reply STOP.\nWant a reading that’s truly personal? Book a session with Mazen:\n${bookingUrl}`,  
  };
}

export function joinMessage(parts: MessageParts): string {
  return `${parts.body.trim()}\n\n${parts.invitation.trim()}`.trim();
}

export function whatsappLink(phone: string, text: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}
