import type { Client, Language, ZodiacSign, SkySnapshot } from './types';

export interface MessageParts { greeting: string; body: string; invitation: string }
type Localized = Record<Language, string>;
type Theme = 'begin' | 'craft' | 'choice' | 'rest' | 'change' | 'hope';

// These are reflection prompts, not a simulated physical draw or natal-chart calculations.
// The same client gets the same symbolic Major Arcana card and number for a given Tunis date.
const CARDS: { name: Localized; invitation: Localized; theme: Theme }[] = [
  { name: { en: 'The Fool', fr: 'Le Mat', tn: 'المغامر' }, invitation: { en: 'A beginning can be small and still be brave.', fr: 'Un début peut être petit et courageux.', tn: 'بداية صغيرة تنجم تكون شجاعة.' }, theme: 'begin' },
  { name: { en: 'The Magician', fr: 'Le Bateleur', tn: 'الساحر' }, invitation: { en: 'Use the tools already in your hands.', fr: 'Utilisez les ressources déjà entre vos mains.', tn: 'استعمل الحاجات اللي عندك توّة.' }, theme: 'craft' },
  { name: { en: 'The High Priestess', fr: 'La Papesse', tn: 'الكاهنة' }, invitation: { en: 'Listen before you decide what the silence means.', fr: 'Écoutez avant de donner un sens au silence.', tn: 'اسمع قبل ما تفسّر السكوت.' }, theme: 'rest' },
  { name: { en: 'The Empress', fr: 'L’Impératrice', tn: 'الإمبراطورة' }, invitation: { en: 'Give something good the care it needs to grow.', fr: 'Prenez soin de ce qui mérite de grandir.', tn: 'اعتني بحاجة باهية تستاهل تكبر.' }, theme: 'hope' },
  { name: { en: 'The Emperor', fr: 'L’Empereur', tn: 'الإمبراطور' }, invitation: { en: 'A gentle structure can protect your energy.', fr: 'Une structure souple peut préserver votre énergie.', tn: 'تنظيم بسيط ينجم يحمي طاقتك.' }, theme: 'craft' },
  { name: { en: 'The Hierophant', fr: 'Le Pape', tn: 'المعلّم' }, invitation: { en: 'Learn from a tradition, then ask if it fits you.', fr: 'Apprenez d’une tradition, puis voyez si elle vous convient.', tn: 'تعلّم من تقليد، وبعد شوف كان يليق بيك.' }, theme: 'choice' },
  { name: { en: 'The Lovers', fr: 'L’Amoureux', tn: 'العشّاق' }, invitation: { en: 'Let your choices match the values you say matter.', fr: 'Alignez vos choix avec les valeurs qui comptent.', tn: 'خلّي اختياراتك تشبه للقيم اللي تهمّك.' }, theme: 'choice' },
  { name: { en: 'The Chariot', fr: 'Le Chariot', tn: 'العربة' }, invitation: { en: 'Direction matters more than rushing.', fr: 'La direction compte plus que la vitesse.', tn: 'الاتجاه أهمّ من السرعة.' }, theme: 'begin' },
  { name: { en: 'Strength', fr: 'La Force', tn: 'القوّة' }, invitation: { en: 'Quiet courage is still courage.', fr: 'Le courage calme reste du courage.', tn: 'الشجاعة الهادية زادة شجاعة.' }, theme: 'hope' },
  { name: { en: 'The Hermit', fr: 'L’Hermite', tn: 'الناسك' }, invitation: { en: 'A little solitude can make your next word clearer.', fr: 'Un peu de recul peut éclaircir votre prochain mot.', tn: 'شوية وقت وحدك يوضّحلك شنوة تقول بعد.' }, theme: 'rest' },
  { name: { en: 'Wheel of Fortune', fr: 'La Roue de Fortune', tn: 'عجلة الحظّ' }, invitation: { en: 'Notice what is changing; choose your response.', fr: 'Observez ce qui change et choisissez votre réponse.', tn: 'لاحظ اللي يتبدّل واختار كيفاش تتصرّف.' }, theme: 'change' },
  { name: { en: 'Justice', fr: 'La Justice', tn: 'العدل' }, invitation: { en: 'Check the facts before judging the story.', fr: 'Vérifiez les faits avant de juger l’histoire.', tn: 'ثبّت في الحقايق قبل ما تحكم على الحكاية.' }, theme: 'choice' },
  { name: { en: 'The Hanged Man', fr: 'Le Pendu', tn: 'المعلّق' }, invitation: { en: 'A pause may reveal another angle.', fr: 'Une pause peut révéler un autre point de vue.', tn: 'وقفة صغيرة تنجّم تورّيك زاوية أخرى.' }, theme: 'rest' },
  { name: { en: 'Death', fr: 'La Mort', tn: 'الموت' }, invitation: { en: 'A symbol of endings and renewal, not a prediction of harm.', fr: 'Un symbole de fin et de renouveau, pas une prédiction de malheur.', tn: 'رمز لنهاية مرحلة وتجديد، موش تنبّؤ بضرر.' }, theme: 'change' },
  { name: { en: 'Temperance', fr: 'Tempérance', tn: 'الاعتدال' }, invitation: { en: 'Try the middle path before choosing an extreme.', fr: 'Essayez la voie du milieu avant les extrêmes.', tn: 'جرّب الوسط قبل ما تمشي للطرف.' }, theme: 'rest' },
  { name: { en: 'The Devil', fr: 'Le Diable', tn: 'الشيطان' }, invitation: { en: 'Name a habit you can loosen, without shame.', fr: 'Nommez une habitude à assouplir, sans honte.', tn: 'سمّي عادة تنجم تنقّص منها من غير لوم.' }, theme: 'choice' },
  { name: { en: 'The Tower', fr: 'La Tour', tn: 'البرج' }, invitation: { en: 'Question a shaky assumption; this is not a prediction of disaster.', fr: 'Questionnez une idée fragile ; ce n’est pas une prédiction de catastrophe.', tn: 'راجع فكرة ما هيش ثابتة؛ موش تنبّؤ بمصيبة.' }, theme: 'change' },
  { name: { en: 'The Star', fr: 'L’Étoile', tn: 'النجمة' }, invitation: { en: 'Restore hope without rushing a result.', fr: 'Retrouvez l’espoir sans précipiter le résultat.', tn: 'رجّع الأمل من غير ما تستعجل النتيجة.' }, theme: 'hope' },
  { name: { en: 'The Moon', fr: 'La Lune', tn: 'القمر' }, invitation: { en: 'Let a question remain open until you have more clarity.', fr: 'Laissez une question ouverte jusqu’à y voir plus clair.', tn: 'خلّي السؤال محلول حتى توضّح الصورة.' }, theme: 'rest' },
  { name: { en: 'The Sun', fr: 'Le Soleil', tn: 'الشمس' }, invitation: { en: 'Recognize one real source of warmth in your day.', fr: 'Reconnaissez une vraie source de chaleur dans votre journée.', tn: 'اعترف بحاجة فرّحتك بصدق اليوم.' }, theme: 'hope' },
  { name: { en: 'Judgement', fr: 'Le Jugement', tn: 'الحُكم' }, invitation: { en: 'Revisit an old choice with what you know now.', fr: 'Revisitez un ancien choix avec ce que vous savez aujourd’hui.', tn: 'ارجع لقرار قديم بعينيك متاع اليوم.' }, theme: 'change' },
  { name: { en: 'The World', fr: 'Le Monde', tn: 'العالم' }, invitation: { en: 'Acknowledge what you have completed before beginning again.', fr: 'Reconnaissez ce que vous avez accompli avant de recommencer.', tn: 'قدّر اللي كمّلتو قبل ما تبدا من جديد.' }, theme: 'craft' },
];

const SIGN_NAMES: Record<ZodiacSign, Localized> = {
  Aries: { en: 'Aries', fr: 'Bélier', tn: 'الحمل' }, Taurus: { en: 'Taurus', fr: 'Taureau', tn: 'الثور' },
  Gemini: { en: 'Gemini', fr: 'Gémeaux', tn: 'الجوزاء' }, Cancer: { en: 'Cancer', fr: 'Cancer', tn: 'السرطان' },
  Leo: { en: 'Leo', fr: 'Lion', tn: 'الأسد' }, Virgo: { en: 'Virgo', fr: 'Vierge', tn: 'العذراء' },
  Libra: { en: 'Libra', fr: 'Balance', tn: 'الميزان' }, Scorpio: { en: 'Scorpio', fr: 'Scorpion', tn: 'العقرب' },
  Sagittarius: { en: 'Sagittarius', fr: 'Sagittaire', tn: 'القوس' }, Capricorn: { en: 'Capricorn', fr: 'Capricorne', tn: 'الجدي' },
  Aquarius: { en: 'Aquarius', fr: 'Verseau', tn: 'الدلو' }, Pisces: { en: 'Pisces', fr: 'Poissons', tn: 'الحوت' },
};

const SIGN_THEMES: Record<ZodiacSign, Localized> = {
  Aries: { en: 'an honest first step', fr: 'un premier pas franc', tn: 'خطوة أولى صريحة' },
  Taurus: { en: 'a steady rhythm', fr: 'un rythme stable', tn: 'نسق ثابت' },
  Gemini: { en: 'a curious question', fr: 'une question curieuse', tn: 'سؤال فيه فضول' },
  Cancer: { en: 'a gentler boundary', fr: 'une limite bienveillante', tn: 'حدود بنينة وواضحة' },
  Leo: { en: 'a brave expression', fr: 'une expression courageuse', tn: 'تعبير بشجاعة' },
  Virgo: { en: 'a useful detail', fr: 'un détail utile', tn: 'تفصيل ينفع' },
  Libra: { en: 'a fair conversation', fr: 'un échange équitable', tn: 'حديث فيه إنصاف' },
  Scorpio: { en: 'an honest release', fr: 'un lâcher-prise sincère', tn: 'تخلّي صادق' },
  Sagittarius: { en: 'a wider horizon', fr: 'un horizon plus large', tn: 'أفق أوسع' },
  Capricorn: { en: 'a grounded plan', fr: 'un plan réaliste', tn: 'خطة واقعية' },
  Aquarius: { en: 'a fresh perspective', fr: 'un regard neuf', tn: 'نظرة جديدة' },
  Pisces: { en: 'a quiet intuition', fr: 'une intuition calme', tn: 'إحساس هادئ' },
};

const PHASES: Record<string, { name: Localized; prompt: Localized }> = {
  'New Moon': { name: { en: 'New Moon', fr: 'Nouvelle Lune', tn: 'محاق' }, prompt: { en: 'name one intention', fr: 'nommer une intention', tn: 'تحدّد نيّة واحدة' } },
  'Waxing Crescent': { name: { en: 'Waxing Crescent', fr: 'Premier croissant', tn: 'هلال متزايد' }, prompt: { en: 'try a first step', fr: 'essayer un premier pas', tn: 'تجرّب خطوة أولى' } },
  'First Quarter': { name: { en: 'First Quarter', fr: 'Premier quartier', tn: 'تربيع أوّل' }, prompt: { en: 'make a workable choice', fr: 'faire un choix concret', tn: 'تختار حاجة تنجم تعملها' } },
  'Waxing Gibbous': { name: { en: 'Waxing Gibbous', fr: 'Lune gibbeuse croissante', tn: 'قمر أحدب متزايد' }, prompt: { en: 'refine what is already in motion', fr: 'affiner ce qui avance déjà', tn: 'تنقّح اللي بديتو' } },
  'Full Moon': { name: { en: 'Full Moon', fr: 'Pleine Lune', tn: 'بدر' }, prompt: { en: 'notice what has become clear', fr: 'voir ce qui est devenu clair', tn: 'تلاحظ شنوة ولى واضح' } },
  'Waning Gibbous': { name: { en: 'Waning Gibbous', fr: 'Lune gibbeuse décroissante', tn: 'قمر أحدب متناقص' }, prompt: { en: 'share one lesson', fr: 'partager une leçon', tn: 'تشارك حاجة تعلّمتها' } },
  'Last Quarter': { name: { en: 'Last Quarter', fr: 'Dernier quartier', tn: 'تربيع أخير' }, prompt: { en: 'let go of an unhelpful habit', fr: 'laisser une habitude inutile', tn: 'تسيّب عادة ما تنفعكش' } },
  'Waning Crescent': { name: { en: 'Waning Crescent', fr: 'Dernier croissant', tn: 'هلال متناقص' }, prompt: { en: 'rest and make room', fr: 'se reposer et faire de la place', tn: 'ترتاح وتفسح مجال' } },
};

const THEMES: Record<Theme, { love: Localized; career: Localized; ritual: Localized }> = {
  begin: {
    love: { en: 'Ask one real question with warmth; do not rush the answer.', fr: 'Posez une vraie question avec douceur, sans presser la réponse.', tn: 'اسأل سؤال من قلبك بلطف، ومن غير ما تستعجل الردّ.' },
    career: { en: 'Name a first step you can finish today, however small.', fr: 'Choisissez une première étape réalisable aujourd’hui, même petite.', tn: 'اختار خطوة أولى تنجم تكملها اليوم، حتى كان صغيرة.' },
    ritual: { en: 'Set a ten-minute timer and begin that one step.', fr: 'Réglez dix minutes et commencez cette étape.', tn: 'حطّ منبّه لعشرة دقايق وابدا الخطوة هاذي.' },
  },
  craft: {
    love: { en: 'Show care in a way that does not ask you to carry everything.', fr: 'Montrez votre affection sans tout porter seul·e.', tn: 'عبّر على اهتمامك من غير ما تشيل كلّ شيء وحدك.' },
    career: { en: 'Improve the piece you can control, not every possible outcome.', fr: 'Améliorez ce que vous maîtrisez, pas tous les résultats possibles.', tn: 'حسّن اللي تنجم تتحكّم فيه، موش كلّ نتيجة ممكنة.' },
    ritual: { en: 'Write one useful task, then cross out one unnecessary task.', fr: 'Notez une tâche utile et rayez-en une qui ne l’est pas.', tn: 'اكتب مهمة تنفعك واشطب مهمة ما عادش لازمة.' },
  },
  choice: {
    love: { en: 'Check what feels true before promising more than you can give.', fr: 'Vérifiez ce qui est juste pour vous avant de trop promettre.', tn: 'تثبّت في اللي تحسّه صحيح قبل ما توعد بأكثر من طاقتك.' },
    career: { en: 'Compare two options and choose the one you can act on calmly.', fr: 'Comparez deux options et choisissez celle qui permet d’agir sereinement.', tn: 'قارن زوز خيارات واختار اللي تنجم تخدم عليه براحة.' },
    ritual: { en: 'Write two choices; circle the next action, not the final outcome.', fr: 'Écrivez deux choix ; entourez l’action suivante, pas le résultat final.', tn: 'اكتب زوز خيارات ودوّر على الخطوة الجاية، موش على النتيجة.' },
  },
  rest: {
    love: { en: 'Make space for a pause and a kinder reply.', fr: 'Laissez une place à la pause et à une réponse plus douce.', tn: 'خلّي مساحة لوقفة ولردّ ألطف.' },
    career: { en: 'Protect one short break before the next task.', fr: 'Préservez une courte pause avant la prochaine tâche.', tn: 'خلي راحة قصيرة قبل المهمّة الجاية.' },
    ritual: { en: 'Take three slow breaths and put your phone aside for five minutes.', fr: 'Respirez lentement trois fois et posez le téléphone cinq minutes.', tn: 'تنفّس ببطء ثلاث مرّات وحطّ التليفون على جنب خمس دقايق.' },
  },
  change: {
    love: { en: 'Say what needs to shift without assigning blame.', fr: 'Dites ce qui devrait changer sans chercher un coupable.', tn: 'قول شنوة يلزمو يتبدّل من غير لوم.' },
    career: { en: 'Set aside one stale method and test a small alternative.', fr: 'Laissez une vieille méthode et testez une petite alternative.', tn: 'خلّي طريقة قديمة وجرّب بديل صغير.' },
    ritual: { en: 'Write what you can release, fold the page, and set it aside.', fr: 'Écrivez ce que vous pouvez lâcher, pliez la page et mettez-la de côté.', tn: 'اكتب شنوة تنجم تسيّب، اطوي الورقة وحطّها على جنب.' },
  },
  hope: {
    love: { en: 'Offer a sincere check-in without forcing a response.', fr: 'Prenez sincèrement des nouvelles sans forcer de réponse.', tn: 'اسأل على حدّ بصدق من غير ما تفرض عليه يجاوب.' },
    career: { en: 'Return to one project that still matters to you.', fr: 'Revenez à un projet qui compte encore pour vous.', tn: 'ارجع لمشروع ما زال يهمّك.' },
    ritual: { en: 'Write one thing you appreciate and one gentle intention.', fr: 'Écrivez une gratitude et une intention bienveillante.', tn: 'اكتب حاجة تشكر عليها ونيّة خفيفة لليوم.' },
  },
};

const NUMBERS: Localized[] = [
  { en: 'Begin with one honest intention.', fr: 'Commencez par une intention sincère.', tn: 'ابدا بنيّة صادقة.' },
  { en: 'Listen as carefully as you speak.', fr: 'Écoutez autant que vous parlez.', tn: 'اسمع قدّ ما تحكي.' },
  { en: 'Make a little room for creativity.', fr: 'Faites une place à la créativité.', tn: 'خلّي شوية بلاصة للإبداع.' },
  { en: 'Build a calm foundation, one step at a time.', fr: 'Bâtissez une base calme, étape par étape.', tn: 'ابني أساس هادئ خطوة بخطوة.' },
  { en: 'Consider one healthy change.', fr: 'Envisagez un changement qui vous fait du bien.', tn: 'فكّر في تبديل صغير ينفعك.' },
  { en: 'Offer care without forgetting yourself.', fr: 'Prenez soin des autres sans vous oublier.', tn: 'اهتمّ بغيرك وما تنساش روحك.' },
  { en: 'Give a quiet thought room to breathe.', fr: 'Laissez respirer une pensée tranquille.', tn: 'خلّي لفكرة هادئة وقتها.' },
  { en: 'Make space for a practical decision.', fr: 'Faites place à une décision concrète.', tn: 'فسّح مجال لقرار عملي.' },
  { en: 'Finish one small thing before starting another.', fr: 'Terminez une petite chose avant d’en commencer une autre.', tn: 'كمّل حاجة صغيرة قبل ما تبدا غيرها.' },
];

function stableHash(text: string): number {
  let value = 2166136261;
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function localSign(sign: ZodiacSign | undefined, language: Language): string {
  return sign ? SIGN_NAMES[sign][language] : '';
}

export function makeDailyMessage(client: Pick<Client, 'id' | 'name' | 'sun_sign' | 'preferred_language'>, sky: SkySnapshot, bookingUrl: string): MessageParts {
  const language = client.preferred_language;
  const firstName = client.name.trim().split(/\s+/)[0] || client.name;
  const date = sky.dateKey.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1');
  const card = CARDS[stableHash(`${sky.dateKey}|${client.id}`) % CARDS.length];
  const number = 1 + stableHash(`number|${sky.dateKey}|${client.id}`) % 9;
  const theme = THEMES[card.theme];
  const phase = PHASES[sky.moon.phase] || {
    name: { en: sky.moon.phase, fr: sky.moon.phase, tn: sky.moon.phase },
    prompt: { en: 'notice your next step', fr: 'remarquer votre prochaine étape', tn: 'تلاحظ خطوتك الجاية' },
  };
  const moon = sky.planets.find((planet) => planet.name === 'Moon')?.sign;
  const sun = sky.planets.find((planet) => planet.name === 'Sun')?.sign;
  const venus = sky.planets.find((planet) => planet.name === 'Venus')?.sign;
  const mercury = sky.planets.find((planet) => planet.name === 'Mercury')?.sign;
  const sign = client.sun_sign;
  // Sky facts below come from the real daily snapshot at 12:00 Africa/Tunis.
  const positions = {
    en: [moon && `${phase.name.en} Moon in ${localSign(moon, 'en')}`, sun && `Sun in ${localSign(sun, 'en')}`, venus && `Venus in ${localSign(venus, 'en')}`, mercury && `Mercury in ${localSign(mercury, 'en')}`].filter(Boolean).join(' · '),
    fr: [moon && `Lune en ${localSign(moon, 'fr')} (${phase.name.fr})`, sun && `Soleil en ${localSign(sun, 'fr')}`, venus && `Vénus en ${localSign(venus, 'fr')}`, mercury && `Mercure en ${localSign(mercury, 'fr')}`].filter(Boolean).join(' · '),
    tn: [moon && `القمر (${phase.name.tn}) في ${localSign(moon, 'tn')}`, sun && `الشمس في ${localSign(sun, 'tn')}`, venus && `الزهرة في ${localSign(venus, 'tn')}`, mercury && `عطارد في ${localSign(mercury, 'tn')}`].filter(Boolean).join(' · '),
  };
  const moonContext = moon ? {
    en: `Take the Moon in ${localSign(moon, 'en')} as a symbol for ${SIGN_THEMES[moon].en}. This lunar phase invites you to ${phase.prompt.en}.`,
    fr: `La Lune en ${localSign(moon, 'fr')} peut symboliser ${SIGN_THEMES[moon].fr}. Cette phase lunaire invite à ${phase.prompt.fr}.`,
    tn: `القمر في ${localSign(moon, 'tn')} ينجم يذكّرك بحاجة: ${SIGN_THEMES[moon].tn}. والمرحلة هاذي دعوة باش ${phase.prompt.tn}.`,
  } : {
    en: `Use the lunar phase as an invitation to ${phase.prompt.en}.`,
    fr: `Prenez cette phase lunaire comme une invitation à ${phase.prompt.fr}.`,
    tn: `اعتبر المرحلة هاذي دعوة باش ${phase.prompt.tn}.`,
  };
  const signContext = sign ? {
    en: `For your recorded ${localSign(sign, 'en')} Sun-sign lens, consider ${SIGN_THEMES[sign].en}.`,
    fr: `Pour votre signe solaire enregistré, ${localSign(sign, 'fr')}, pensez à ${SIGN_THEMES[sign].fr}.`,
    tn: `وبحسب برجك الشمسي المسجّل (${localSign(sign, 'tn')})، فكّر في ${SIGN_THEMES[sign].tn}.`,
  } : {
    en: 'No Sun sign on file? Let this be a general reflection, not a personal chart.',
    fr: 'Pas de signe solaire enregistré ? C’est une réflexion générale, pas un thème natal.',
    tn: 'ما عندناش برج شمسي مسجّل؟ هاذي فكرة عامّة، موش خريطة ولادة.',
  };

  if (language === 'fr') return {
    greeting: `Bonjour ${firstName} ✨`,
    body: [
      '🔮 *VOTRE TRANSMISSION TAROT & ASTRO DU JOUR*',
      `${date} · ${sign ? `Signe solaire : ${localSign(sign, 'fr')}` : 'Pour vous'}`,
      '',
      '☾ *CIEL DU JOUR · MIDI À TUNIS*',
      `${positions.fr || 'Les positions du ciel sont indisponibles.'}.`,
      'Positions du jour, pas un calcul de thème natal personnel.',
      '',
      '🌌 *CLIMAT COSMIQUE*',
      `${moonContext.fr} ${signContext.fr}`,
      '',
      `🃏 *CARTE SYMBOLIQUE NUMÉRIQUE · ${card.name.fr.toUpperCase()}*`,
      `Choisie numériquement pour aujourd’hui, pas tirée physiquement. ${card.invitation.fr}`,
      '',
      '💗 *AMOUR & LIENS*',
      theme.love.fr,
      '',
      '💼 *TRAVAIL & DIRECTION*',
      theme.career.fr,
      '',
      `🔢 *CHIFFRE DE RÉFLEXION · ${number}*`,
      `${NUMBERS[number - 1].fr} Une piste de réflexion, pas un score d’énergie mesuré.`,
      '',
      '🕯️ *PETIT RITUEL*',
      theme.ritual.fr,
    ].join('\n'),
    invitation: `Envie d’une lecture privée ? Réservez : ${bookingUrl}\nWhatsApp Tarot TN : +216 22 481 622\nPour arrêter les messages quotidiens, répondez STOP.`,
  };

  if (language === 'tn') return {
    greeting: `عسلامة ${firstName} ✨`,
    body: [
      '🔮 *رسالتك اليومية: تاروت ونجوم*',
      `${date} · ${sign ? `برجك الشمسي: ${localSign(sign, 'tn')}` : 'رسالة ليك'}`,
      '',
      '☾ *سماء اليوم · نصّ النهار في تونس*',
      `${positions.tn || 'مواقع الكواكب موش متوفّرة.'}.`,
      'هاذم مواقع اليوم، موش حساب خريطة ولادتك الشخصية.',
      '',
      '🌌 *الجوّ الكوني*',
      `${moonContext.tn} ${signContext.tn}`,
      '',
      `🃏 *كارت رمزية رقمية · ${card.name.tn}*`,
      `اختيار رمزي رقمي لليوم، موش سحبة كارت حقيقية. ${card.invitation.tn}`,
      '',
      '💗 *الحبّ والعلاقات*',
      theme.love.tn,
      '',
      '💼 *الخدمة والطريق*',
      theme.career.tn,
      '',
      `🔢 *رقم للتأمّل · ${number}*`,
      `${NUMBERS[number - 1].tn} فكرة للتأمّل، موش نسبة طاقة محسوبة.`,
      '',
      '🕯️ *خطوة صغيرة لليوم*',
      theme.ritual.tn,
    ].join('\n'),
    invitation: `تحبّ قراءة خاصّة؟ احجز هنا: ${bookingUrl}\nولا كلّم Tarot TN على واتساب: +216 22 481 622\nباش توقّف المساجات اليومية، ابعث STOP.`,
  };

  return {
    greeting: `Hi ${firstName} ✨`,
    body: [
      '🔮 *DAILY TAROT & ASTRO TRANSMISSION*',
      `${date} · ${sign ? `${localSign(sign, 'en')} Sun-sign lens` : 'For you'}`,
      '',
      '☾ *TODAY’S SKY · NOON IN TUNIS*',
      `${positions.en || 'Sky positions unavailable'}.`,
      'Today’s positions, not a personal birth-chart calculation.',
      '',
      '🌌 *COSMIC SUMMARY*',
      `${moonContext.en} ${signContext.en}`,
      '',
      `🃏 *SYMBOLIC DIGITAL CARD · ${card.name.en.toUpperCase()}*`,
      `Selected digitally for today, not a physical draw. ${card.invitation.en}`,
      '',
      '💗 *LOVE & CONNECTION*',
      theme.love.en,
      '',
      '💼 *WORK & DIRECTION*',
      theme.career.en,
      '',
      `🔢 *REFLECTION NUMBER · ${number}*`,
      `${NUMBERS[number - 1].en} A reflection prompt, not a measured energy score.`,
      '',
      '🕯️ *SMALL RITUAL*',
      theme.ritual.en,
    ].join('\n'),
    invitation: `Want a deeper private reading? Book here: ${bookingUrl}\nWhatsApp Tarot TN: +216 22 481 622\nTo pause daily messages, reply STOP.`,
  };
}

export function joinMessage(parts: MessageParts): string {
  return [parts.greeting.trim(), parts.body.trim(), parts.invitation.trim()].filter(Boolean).join('\n\n');
}

export function whatsappLink(phone: string, message: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}
