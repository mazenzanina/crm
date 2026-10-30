import type { Client, Language, ZodiacSign, SkySnapshot } from './types';

export interface MessageParts { greeting: string; body: string; invitation: string }
type Localized = Record<Language, string>;
type Theme = 'begin' | 'craft' | 'choice' | 'rest' | 'change' | 'hope';

// Short, personal daily notes. Symbolic cards (78 = 22 majors + 56 minors) are a daily prompt, not a prediction.
// Same client + same date -> same card & number, but rituals/hints rotate so it never feels stale.
// No location is mentioned - works for Tunisian and non-Tunisian clients.
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
  { name: { en: 'Ace of Cups', fr: 'As de Coupes', tn: 'آس الكؤوس' }, invitation: { en: 'A fresh start is close — take one small step. Focus on what you feel.', fr: 'Un nouveau départ approche — faites un petit pas. Pensez à ce que vous ressentez.', tn: 'بداية جديدة قريبة — خوذ خطوة صغيرة. ركّز على إحساسك.' }, theme: 'begin' },
  { name: { en: 'Two of Cups', fr: 'Deux de Coupes', tn: 'اثنان الكؤوس' }, invitation: { en: 'Balance two ideas before you choose. Focus on what you feel.', fr: 'Mettez deux idées en balance avant de choisir. Pensez à ce que vous ressentez.', tn: 'وازن بين فكرتين قبل ما تختار. ركّز على إحساسك.' }, theme: 'craft' },
  { name: { en: 'Three of Cups', fr: 'Trois de Coupes', tn: 'ثلاثة الكؤوس' }, invitation: { en: 'Create with someone else, not alone. Focus on what you feel.', fr: 'Créez avec quelqu’un, pas seul. Pensez à ce que vous ressentez.', tn: 'اصنع حاجة مع حد آخر، موش وحدك. ركّز على إحساسك.' }, theme: 'choice' },
  { name: { en: 'Four of Cups', fr: 'Quatre de Coupes', tn: 'أربعة الكؤوس' }, invitation: { en: 'Hold steady and protect what matters. Focus on what you feel.', fr: 'Tenez bon et protégez ce qui compte. Pensez à ce que vous ressentez.', tn: 'اثبت واحمي اللي يهمك. ركّز على إحساسك.' }, theme: 'rest' },
  { name: { en: 'Five of Cups', fr: 'Cinq de Coupes', tn: 'خمسة الكؤوس' }, invitation: { en: 'Name the tension, then choose calm. Focus on what you feel.', fr: 'Nommez la tension, puis choisissez le calme. Pensez à ce que vous ressentez.', tn: 'سمّي التوتر وبعد اختار الهدوء. ركّز على إحساسك.' }, theme: 'change' },
  { name: { en: 'Six of Cups', fr: 'Six de Coupes', tn: 'ستة الكؤوس' }, invitation: { en: 'Give or receive help without keeping score. Focus on what you feel.', fr: 'Donnez ou recevez sans compter. Pensez à ce que vous ressentez.', tn: 'اعطي ولا اقبل مساعدة من غير حساب. ركّز على إحساسك.' }, theme: 'hope' },
  { name: { en: 'Seven of Cups', fr: 'Sept de Coupes', tn: 'سبعة الكؤوس' }, invitation: { en: 'Question one assumption before you act. Focus on what you feel.', fr: 'Questionnez une idée reçue avant d’agir. Pensez à ce que vous ressentez.', tn: 'راجع فكرة قبل ما تتصرف. ركّز على إحساسك.' }, theme: 'begin' },
  { name: { en: 'Eight of Cups', fr: 'Huit de Coupes', tn: 'ثمانية الكؤوس' }, invitation: { en: 'Move one thing forward today. Focus on what you feel.', fr: 'Faites avancer une chose aujourd’hui. Pensez à ce que vous ressentez.', tn: 'قدّم حاجة وحدة اليوم. ركّز على إحساسك.' }, theme: 'craft' },
  { name: { en: 'Nine of Cups', fr: 'Neuf de Coupes', tn: 'تسعة الكؤوس' }, invitation: { en: 'Notice what already feels enough. Focus on what you feel.', fr: 'Remarquez ce qui suffit déjà. Pensez à ce que vous ressentez.', tn: 'لاحظ شنوة يكفي توا. ركّز على إحساسك.' }, theme: 'choice' },
  { name: { en: 'Ten of Cups', fr: 'Dix de Coupes', tn: 'عشرة الكؤوس' }, invitation: { en: 'Close a loop before you start the next. Focus on what you feel.', fr: 'Fermez une boucle avant d’en ouvrir une autre. Pensez à ce que vous ressentez.', tn: 'سكّر حاجة قبل ما تبدا غيرها. ركّز على إحساسك.' }, theme: 'rest' },
  { name: { en: 'Page of Cups', fr: 'Valet de Coupes', tn: 'الغلام الكؤوس' }, invitation: { en: 'Stay curious — ask a simple question. Focus on what you feel.', fr: 'Restez curieux — posez une question simple. Pensez à ce que vous ressentez.', tn: 'خليك فضولي — اسأل سؤال بسيط. ركّز على إحساسك.' }, theme: 'change' },
  { name: { en: 'Knight of Cups', fr: 'Cavalier de Coupes', tn: 'الفارس الكؤوس' }, invitation: { en: 'Act quickly, but with kindness. Focus on what you feel.', fr: 'Agissez vite, mais avec douceur. Pensez à ce que vous ressentez.', tn: 'تصرّف بسرعة، لكن بلطف. ركّز على إحساسك.' }, theme: 'hope' },
  { name: { en: 'Queen of Cups', fr: 'Reine de Coupes', tn: 'الملكة الكؤوس' }, invitation: { en: 'Take care with soft strength. Focus on what you feel.', fr: 'Prenez soin avec une force douce. Pensez à ce que vous ressentez.', tn: 'اعتني بقوة هادئة. ركّز على إحساسك.' }, theme: 'begin' },
  { name: { en: 'King of Cups', fr: 'Roi de Coupes', tn: 'الملك الكؤوس' }, invitation: { en: 'Decide with clarity, then follow through. Focus on what you feel.', fr: 'Décidez clairement, puis allez au bout. Pensez à ce que vous ressentez.', tn: 'قرّر بوضوح وبعد كمّل. ركّز على إحساسك.' }, theme: 'craft' },
  { name: { en: 'Ace of Pentacles', fr: 'As de Deniers', tn: 'آس الدنانيير' }, invitation: { en: 'A fresh start is close — take one small step. Focus on what you can build or save.', fr: 'Un nouveau départ approche — faites un petit pas. Pensez à ce que vous pouvez construire.', tn: 'بداية جديدة قريبة — خوذ خطوة صغيرة. ركّز على اللي تنجم تبنيه.' }, theme: 'choice' },
  { name: { en: 'Two of Pentacles', fr: 'Deux de Deniers', tn: 'اثنان الدنانيير' }, invitation: { en: 'Balance two ideas before you choose. Focus on what you can build or save.', fr: 'Mettez deux idées en balance avant de choisir. Pensez à ce que vous pouvez construire.', tn: 'وازن بين فكرتين قبل ما تختار. ركّز على اللي تنجم تبنيه.' }, theme: 'rest' },
  { name: { en: 'Three of Pentacles', fr: 'Trois de Deniers', tn: 'ثلاثة الدنانيير' }, invitation: { en: 'Create with someone else, not alone. Focus on what you can build or save.', fr: 'Créez avec quelqu’un, pas seul. Pensez à ce que vous pouvez construire.', tn: 'اصنع حاجة مع حد آخر، موش وحدك. ركّز على اللي تنجم تبنيه.' }, theme: 'change' },
  { name: { en: 'Four of Pentacles', fr: 'Quatre de Deniers', tn: 'أربعة الدنانيير' }, invitation: { en: 'Hold steady and protect what matters. Focus on what you can build or save.', fr: 'Tenez bon et protégez ce qui compte. Pensez à ce que vous pouvez construire.', tn: 'اثبت واحمي اللي يهمك. ركّز على اللي تنجم تبنيه.' }, theme: 'hope' },
  { name: { en: 'Five of Pentacles', fr: 'Cinq de Deniers', tn: 'خمسة الدنانيير' }, invitation: { en: 'Name the tension, then choose calm. Focus on what you can build or save.', fr: 'Nommez la tension, puis choisissez le calme. Pensez à ce que vous pouvez construire.', tn: 'سمّي التوتر وبعد اختار الهدوء. ركّز على اللي تنجم تبنيه.' }, theme: 'begin' },
  { name: { en: 'Six of Pentacles', fr: 'Six de Deniers', tn: 'ستة الدنانيير' }, invitation: { en: 'Give or receive help without keeping score. Focus on what you can build or save.', fr: 'Donnez ou recevez sans compter. Pensez à ce que vous pouvez construire.', tn: 'اعطي ولا اقبل مساعدة من غير حساب. ركّز على اللي تنجم تبنيه.' }, theme: 'craft' },
  { name: { en: 'Seven of Pentacles', fr: 'Sept de Deniers', tn: 'سبعة الدنانيير' }, invitation: { en: 'Question one assumption before you act. Focus on what you can build or save.', fr: 'Questionnez une idée reçue avant d’agir. Pensez à ce que vous pouvez construire.', tn: 'راجع فكرة قبل ما تتصرف. ركّز على اللي تنجم تبنيه.' }, theme: 'choice' },
  { name: { en: 'Eight of Pentacles', fr: 'Huit de Deniers', tn: 'ثمانية الدنانيير' }, invitation: { en: 'Move one thing forward today. Focus on what you can build or save.', fr: 'Faites avancer une chose aujourd’hui. Pensez à ce que vous pouvez construire.', tn: 'قدّم حاجة وحدة اليوم. ركّز على اللي تنجم تبنيه.' }, theme: 'rest' },
  { name: { en: 'Nine of Pentacles', fr: 'Neuf de Deniers', tn: 'تسعة الدنانيير' }, invitation: { en: 'Notice what already feels enough. Focus on what you can build or save.', fr: 'Remarquez ce qui suffit déjà. Pensez à ce que vous pouvez construire.', tn: 'لاحظ شنوة يكفي توا. ركّز على اللي تنجم تبنيه.' }, theme: 'change' },
  { name: { en: 'Ten of Pentacles', fr: 'Dix de Deniers', tn: 'عشرة الدنانيير' }, invitation: { en: 'Close a loop before you start the next. Focus on what you can build or save.', fr: 'Fermez une boucle avant d’en ouvrir une autre. Pensez à ce que vous pouvez construire.', tn: 'سكّر حاجة قبل ما تبدا غيرها. ركّز على اللي تنجم تبنيه.' }, theme: 'hope' },
  { name: { en: 'Page of Pentacles', fr: 'Valet de Deniers', tn: 'الغلام الدنانيير' }, invitation: { en: 'Stay curious — ask a simple question. Focus on what you can build or save.', fr: 'Restez curieux — posez une question simple. Pensez à ce que vous pouvez construire.', tn: 'خليك فضولي — اسأل سؤال بسيط. ركّز على اللي تنجم تبنيه.' }, theme: 'begin' },
  { name: { en: 'Knight of Pentacles', fr: 'Cavalier de Deniers', tn: 'الفارس الدنانيير' }, invitation: { en: 'Act quickly, but with kindness. Focus on what you can build or save.', fr: 'Agissez vite, mais avec douceur. Pensez à ce que vous pouvez construire.', tn: 'تصرّف بسرعة، لكن بلطف. ركّز على اللي تنجم تبنيه.' }, theme: 'craft' },
  { name: { en: 'Queen of Pentacles', fr: 'Reine de Deniers', tn: 'الملكة الدنانيير' }, invitation: { en: 'Take care with soft strength. Focus on what you can build or save.', fr: 'Prenez soin avec une force douce. Pensez à ce que vous pouvez construire.', tn: 'اعتني بقوة هادئة. ركّز على اللي تنجم تبنيه.' }, theme: 'choice' },
  { name: { en: 'King of Pentacles', fr: 'Roi de Deniers', tn: 'الملك الدنانيير' }, invitation: { en: 'Decide with clarity, then follow through. Focus on what you can build or save.', fr: 'Décidez clairement, puis allez au bout. Pensez à ce que vous pouvez construire.', tn: 'قرّر بوضوح وبعد كمّل. ركّز على اللي تنجم تبنيه.' }, theme: 'rest' },
  { name: { en: 'Ace of Swords', fr: 'As de Épées', tn: 'آس السيوف' }, invitation: { en: 'A fresh start is close — take one small step. Focus on one clear thought.', fr: 'Un nouveau départ approche — faites un petit pas. Pensez à une idée claire.', tn: 'بداية جديدة قريبة — خوذ خطوة صغيرة. ركّز على فكرة واضحة.' }, theme: 'change' },
  { name: { en: 'Two of Swords', fr: 'Deux de Épées', tn: 'اثنان السيوف' }, invitation: { en: 'Balance two ideas before you choose. Focus on one clear thought.', fr: 'Mettez deux idées en balance avant de choisir. Pensez à une idée claire.', tn: 'وازن بين فكرتين قبل ما تختار. ركّز على فكرة واضحة.' }, theme: 'hope' },
  { name: { en: 'Three of Swords', fr: 'Trois de Épées', tn: 'ثلاثة السيوف' }, invitation: { en: 'Create with someone else, not alone. Focus on one clear thought.', fr: 'Créez avec quelqu’un, pas seul. Pensez à une idée claire.', tn: 'اصنع حاجة مع حد آخر، موش وحدك. ركّز على فكرة واضحة.' }, theme: 'begin' },
  { name: { en: 'Four of Swords', fr: 'Quatre de Épées', tn: 'أربعة السيوف' }, invitation: { en: 'Hold steady and protect what matters. Focus on one clear thought.', fr: 'Tenez bon et protégez ce qui compte. Pensez à une idée claire.', tn: 'اثبت واحمي اللي يهمك. ركّز على فكرة واضحة.' }, theme: 'craft' },
  { name: { en: 'Five of Swords', fr: 'Cinq de Épées', tn: 'خمسة السيوف' }, invitation: { en: 'Name the tension, then choose calm. Focus on one clear thought.', fr: 'Nommez la tension, puis choisissez le calme. Pensez à une idée claire.', tn: 'سمّي التوتر وبعد اختار الهدوء. ركّز على فكرة واضحة.' }, theme: 'choice' },
  { name: { en: 'Six of Swords', fr: 'Six de Épées', tn: 'ستة السيوف' }, invitation: { en: 'Give or receive help without keeping score. Focus on one clear thought.', fr: 'Donnez ou recevez sans compter. Pensez à une idée claire.', tn: 'اعطي ولا اقبل مساعدة من غير حساب. ركّز على فكرة واضحة.' }, theme: 'rest' },
  { name: { en: 'Seven of Swords', fr: 'Sept de Épées', tn: 'سبعة السيوف' }, invitation: { en: 'Question one assumption before you act. Focus on one clear thought.', fr: 'Questionnez une idée reçue avant d’agir. Pensez à une idée claire.', tn: 'راجع فكرة قبل ما تتصرف. ركّز على فكرة واضحة.' }, theme: 'change' },
  { name: { en: 'Eight of Swords', fr: 'Huit de Épées', tn: 'ثمانية السيوف' }, invitation: { en: 'Move one thing forward today. Focus on one clear thought.', fr: 'Faites avancer une chose aujourd’hui. Pensez à une idée claire.', tn: 'قدّم حاجة وحدة اليوم. ركّز على فكرة واضحة.' }, theme: 'hope' },
  { name: { en: 'Nine of Swords', fr: 'Neuf de Épées', tn: 'تسعة السيوف' }, invitation: { en: 'Notice what already feels enough. Focus on one clear thought.', fr: 'Remarquez ce qui suffit déjà. Pensez à une idée claire.', tn: 'لاحظ شنوة يكفي توا. ركّز على فكرة واضحة.' }, theme: 'begin' },
  { name: { en: 'Ten of Swords', fr: 'Dix de Épées', tn: 'عشرة السيوف' }, invitation: { en: 'Close a loop before you start the next. Focus on one clear thought.', fr: 'Fermez une boucle avant d’en ouvrir une autre. Pensez à une idée claire.', tn: 'سكّر حاجة قبل ما تبدا غيرها. ركّز على فكرة واضحة.' }, theme: 'craft' },
  { name: { en: 'Page of Swords', fr: 'Valet de Épées', tn: 'الغلام السيوف' }, invitation: { en: 'Stay curious — ask a simple question. Focus on one clear thought.', fr: 'Restez curieux — posez une question simple. Pensez à une idée claire.', tn: 'خليك فضولي — اسأل سؤال بسيط. ركّز على فكرة واضحة.' }, theme: 'choice' },
  { name: { en: 'Knight of Swords', fr: 'Cavalier de Épées', tn: 'الفارس السيوف' }, invitation: { en: 'Act quickly, but with kindness. Focus on one clear thought.', fr: 'Agissez vite, mais avec douceur. Pensez à une idée claire.', tn: 'تصرّف بسرعة، لكن بلطف. ركّز على فكرة واضحة.' }, theme: 'rest' },
  { name: { en: 'Queen of Swords', fr: 'Reine de Épées', tn: 'الملكة السيوف' }, invitation: { en: 'Take care with soft strength. Focus on one clear thought.', fr: 'Prenez soin avec une force douce. Pensez à une idée claire.', tn: 'اعتني بقوة هادئة. ركّز على فكرة واضحة.' }, theme: 'change' },
  { name: { en: 'King of Swords', fr: 'Roi de Épées', tn: 'الملك السيوف' }, invitation: { en: 'Decide with clarity, then follow through. Focus on one clear thought.', fr: 'Décidez clairement, puis allez au bout. Pensez à une idée claire.', tn: 'قرّر بوضوح وبعد كمّل. ركّز على فكرة واضحة.' }, theme: 'hope' },
  { name: { en: 'Ace of Wands', fr: 'As de Bâtons', tn: 'آس العصي' }, invitation: { en: 'A fresh start is close — take one small step. Focus on one action you want.', fr: 'Un nouveau départ approche — faites un petit pas. Pensez à une action qui vous appelle.', tn: 'بداية جديدة قريبة — خوذ خطوة صغيرة. ركّز على فعل تحب تعمله.' }, theme: 'begin' },
  { name: { en: 'Two of Wands', fr: 'Deux de Bâtons', tn: 'اثنان العصي' }, invitation: { en: 'Balance two ideas before you choose. Focus on one action you want.', fr: 'Mettez deux idées en balance avant de choisir. Pensez à une action qui vous appelle.', tn: 'وازن بين فكرتين قبل ما تختار. ركّز على فعل تحب تعمله.' }, theme: 'craft' },
  { name: { en: 'Three of Wands', fr: 'Trois de Bâtons', tn: 'ثلاثة العصي' }, invitation: { en: 'Create with someone else, not alone. Focus on one action you want.', fr: 'Créez avec quelqu’un, pas seul. Pensez à une action qui vous appelle.', tn: 'اصنع حاجة مع حد آخر، موش وحدك. ركّز على فعل تحب تعمله.' }, theme: 'choice' },
  { name: { en: 'Four of Wands', fr: 'Quatre de Bâtons', tn: 'أربعة العصي' }, invitation: { en: 'Hold steady and protect what matters. Focus on one action you want.', fr: 'Tenez bon et protégez ce qui compte. Pensez à une action qui vous appelle.', tn: 'اثبت واحمي اللي يهمك. ركّز على فعل تحب تعمله.' }, theme: 'rest' },
  { name: { en: 'Five of Wands', fr: 'Cinq de Bâtons', tn: 'خمسة العصي' }, invitation: { en: 'Name the tension, then choose calm. Focus on one action you want.', fr: 'Nommez la tension, puis choisissez le calme. Pensez à une action qui vous appelle.', tn: 'سمّي التوتر وبعد اختار الهدوء. ركّز على فعل تحب تعمله.' }, theme: 'change' },
  { name: { en: 'Six of Wands', fr: 'Six de Bâtons', tn: 'ستة العصي' }, invitation: { en: 'Give or receive help without keeping score. Focus on one action you want.', fr: 'Donnez ou recevez sans compter. Pensez à une action qui vous appelle.', tn: 'اعطي ولا اقبل مساعدة من غير حساب. ركّز على فعل تحب تعمله.' }, theme: 'hope' },
  { name: { en: 'Seven of Wands', fr: 'Sept de Bâtons', tn: 'سبعة العصي' }, invitation: { en: 'Question one assumption before you act. Focus on one action you want.', fr: 'Questionnez une idée reçue avant d’agir. Pensez à une action qui vous appelle.', tn: 'راجع فكرة قبل ما تتصرف. ركّز على فعل تحب تعمله.' }, theme: 'begin' },
  { name: { en: 'Eight of Wands', fr: 'Huit de Bâtons', tn: 'ثمانية العصي' }, invitation: { en: 'Move one thing forward today. Focus on one action you want.', fr: 'Faites avancer une chose aujourd’hui. Pensez à une action qui vous appelle.', tn: 'قدّم حاجة وحدة اليوم. ركّز على فعل تحب تعمله.' }, theme: 'craft' },
  { name: { en: 'Nine of Wands', fr: 'Neuf de Bâtons', tn: 'تسعة العصي' }, invitation: { en: 'Notice what already feels enough. Focus on one action you want.', fr: 'Remarquez ce qui suffit déjà. Pensez à une action qui vous appelle.', tn: 'لاحظ شنوة يكفي توا. ركّز على فعل تحب تعمله.' }, theme: 'choice' },
  { name: { en: 'Ten of Wands', fr: 'Dix de Bâtons', tn: 'عشرة العصي' }, invitation: { en: 'Close a loop before you start the next. Focus on one action you want.', fr: 'Fermez une boucle avant d’en ouvrir une autre. Pensez à une action qui vous appelle.', tn: 'سكّر حاجة قبل ما تبدا غيرها. ركّز على فعل تحب تعمله.' }, theme: 'rest' },
  { name: { en: 'Page of Wands', fr: 'Valet de Bâtons', tn: 'الغلام العصي' }, invitation: { en: 'Stay curious — ask a simple question. Focus on one action you want.', fr: 'Restez curieux — posez une question simple. Pensez à une action qui vous appelle.', tn: 'خليك فضولي — اسأل سؤال بسيط. ركّز على فعل تحب تعمله.' }, theme: 'change' },
  { name: { en: 'Knight of Wands', fr: 'Cavalier de Bâtons', tn: 'الفارس العصي' }, invitation: { en: 'Act quickly, but with kindness. Focus on one action you want.', fr: 'Agissez vite, mais avec douceur. Pensez à une action qui vous appelle.', tn: 'تصرّف بسرعة، لكن بلطف. ركّز على فعل تحب تعمله.' }, theme: 'hope' },
  { name: { en: 'Queen of Wands', fr: 'Reine de Bâtons', tn: 'الملكة العصي' }, invitation: { en: 'Take care with soft strength. Focus on one action you want.', fr: 'Prenez soin avec une force douce. Pensez à une action qui vous appelle.', tn: 'اعتني بقوة هادئة. ركّز على فعل تحب تعمله.' }, theme: 'begin' },
  { name: { en: 'King of Wands', fr: 'Roi de Bâtons', tn: 'الملك العصي' }, invitation: { en: 'Decide with clarity, then follow through. Focus on one action you want.', fr: 'Décidez clairement, puis allez au bout. Pensez à une action qui vous appelle.', tn: 'قرّر بوضوح وبعد كمّل. ركّز على فعل تحب تعمله.' }, theme: 'craft' },
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

// Varied hints - 4 options per theme, picked by hash so it rotates
const LOVE: Record<Theme, Localized[]> = {
  begin: [
    { en: 'Ask one real question with warmth.', fr: 'Posez une vraie question avec douceur.', tn: 'اسأل سؤال بصدق وبلطف.' },
    { en: 'Say what you want to learn about them.', fr: 'Dites ce que vous voulez découvrir.', tn: 'قول شنوة تحب تعرف عليه.' },
    { en: 'Invite a short call instead of long texts.', fr: 'Proposez un court appel plutôt que des messages.', tn: 'اعرض مكالمة قصيرة بدل مساجات طوال.' },
    { en: 'Notice how you feel before you reply.', fr: 'Observez ce que vous ressentez avant de répondre.', tn: 'لاحظ إحساسك قبل ما تجاوب.' },
  ],
  craft: [
    { en: 'Show care without carrying everything.', fr: 'Montrez votre soutien sans tout porter.', tn: 'بيّن اهتمامك من غير ما تهز كل شي.' },
    { en: 'Do one small helpful thing together.', fr: 'Faites une petite chose utile à deux.', tn: 'اعملوا حاجة صغيرة نافعة مع بعض.' },
    { en: 'Keep a promise you made, even small.', fr: 'Tenez une petite promesse faite.', tn: 'وفّي بوعد صغير وعدت بيه.' },
    { en: 'Listen longer than you explain.', fr: 'Écoutez plus que vous n’expliquez.', tn: 'اسمع أكثر ملي تفسّر.' },
  ],
  choice: [
    { en: 'Check what feels true before you agree.', fr: 'Vérifiez ce qui est juste avant d’accepter.', tn: 'ثبّت شنوة الصحيح قبل ما توافق.' },
    { en: 'Say no gently if you need time.', fr: 'Dites non avec douceur si besoin de temps.', tn: 'قول لا بلطف كان لازمك وقت.' },
    { en: 'Choose honesty over pleasing.', fr: 'Choisissez la sincérité plutôt que de plaire.', tn: 'اختار الصدق قبل إرضاء الناس.' },
    { en: 'Name your boundary in one sentence.', fr: 'Dites votre limite en une phrase.', tn: 'قول حدّك في جملة وحدة.' },
  ],
  rest: [
    { en: 'Leave space for a pause.', fr: 'Laissez une place à la pause.', tn: 'خلّي مكان للراحة.' },
    { en: 'Reply slower, with kindness.', fr: 'Répondez plus lentement, avec douceur.', tn: 'جاوب بشوية وبلطف.' },
    { en: 'Protect a quiet evening together.', fr: 'Préservez une soirée calme à deux.', tn: 'احمي عشية هادية مع بعض.' },
    { en: 'Let silence do part of the work.', fr: 'Laissez le silence faire une part.', tn: 'خلّي السكوت يخدم شوية.' },
  ],
  change: [
    { en: 'Say what needs to shift without blame.', fr: 'Dites ce qui doit changer sans accuser.', tn: 'قول شنوة يلزم يتبدل من غير لوم.' },
    { en: 'Ask what you both want next, not who was wrong.', fr: 'Demandez ce que vous voulez ensuite, pas qui a tort.', tn: 'اسأل شنوة تحبوا للمستقبل، موش شكون غالط.' },
    { en: 'Try one new way to talk about it.', fr: 'Essayez une nouvelle façon d’en parler.', tn: 'جرّب طريقة جديدة باش تحكي عليه.' },
    { en: 'Forgive a small friction and move on.', fr: 'Laissez passer une petite friction.', tn: 'سامح حاجة صغيرة وكمّل.' },
  ],
  hope: [
    { en: 'Send a sincere check-in, no pressure.', fr: 'Prenez des nouvelles sincèrement, sans pression.', tn: 'اسأل بصدق من غير ضغط.' },
    { en: 'Remember a good moment together.', fr: 'Rappelez un bon moment partagé.', tn: 'تذكّر لحظة باهية مع بعض.' },
    { en: 'Compliment one real effort you saw.', fr: 'Complimentez un effort réel vu.', tn: 'اشكر مجهود حقيقي شفتو.' },
    { en: 'Plan one light thing to look forward to.', fr: 'Prévoyez une petite chose à attendre.', tn: 'برمج حاجة خفيفة تستناوها.' },
  ],
};

const CAREER: Record<Theme, Localized[]> = {
  begin: [
    { en: 'Name the first step you can finish today.', fr: 'Nommez la première étape faisable aujourd’hui.', tn: 'سمّي أول خطوة تنجم تكملها اليوم.' },
    { en: 'Open the file and write the first line.', fr: 'Ouvrez le fichier et écrivez la première ligne.', tn: 'حل الملف واكتب أول سطر.' },
    { en: 'Ask for one useful contact.', fr: 'Demandez un contact utile.', tn: 'اطلب معرفة تنفعك.' },
    { en: 'Block 20 minutes and start.', fr: 'Bloquez 20 minutes et commencez.', tn: 'احجز 20 دقيقة وابدا.' },
  ],
  craft: [
    { en: 'Improve what you control, not everything.', fr: 'Améliorez ce que vous contrôlez, pas tout.', tn: 'حسّن اللي تتحكم فيه، موش كل شي.' },
    { en: 'Finish one draft, then polish.', fr: 'Terminez un brouillon, puis peaufinez.', tn: 'كمّل مسودة وبعد حسّن.' },
    { en: 'Keep tools simple and tidy.', fr: 'Gardez des outils simples et rangés.', tn: 'خلّي أدواتك بسيطة ومرتبة.' },
    { en: 'Remove one unnecessary task.', fr: 'Supprimez une tâche inutile.', tn: 'نحّي مهمة زايدة.' },
  ],
  choice: [
    { en: 'Compare two options on one page.', fr: 'Comparez deux options sur une page.', tn: 'قارن زوز خيارات في ورقة.' },
    { en: 'Choose the calmer next action.', fr: 'Choisissez l’action la plus sereine.', tn: 'اختار الخطوة الأهدى.' },
    { en: 'Say yes to one, no to one.', fr: 'Dites oui à une, non à une.', tn: 'قول إيه لوحدة، لا لوحدة.' },
    { en: 'Ask what “enough” means today.', fr: 'Demandez ce que “assez” veut dire aujourd’hui.', tn: 'اسأل شنوة معناها “يكفي” اليوم.' },
  ],
  rest: [
    { en: 'Take a real break before the next task.', fr: 'Prenez une vraie pause avant la suite.', tn: 'خوذ راحة حقيقية قبل المهمة الجاية.' },
    { en: 'Protect your focus — close one tab.', fr: 'Protégez votre focus — fermez un onglet.', tn: 'احمي تركيزك — سكّر حاجة.' },
    { en: 'Step outside for five minutes.', fr: 'Sortez cinq minutes.', tn: 'اخرج خمسة دقايق.' },
    { en: 'Breathe and reset, then continue.', fr: 'Respirez, recentrez, puis continuez.', tn: 'تنفس وارجع كمّل.' },
  ],
  change: [
    { en: 'Try a small alternative to the old method.', fr: 'Testez une petite alternative à l’ancienne méthode.', tn: 'جرّب بديل صغير للطريقة القديمة.' },
    { en: 'Change one routine this week.', fr: 'Changez une routine cette semaine.', tn: 'بدّل روتين واحد هالأسبوع.' },
    { en: 'Show your work to one person for feedback.', fr: 'Montrez votre travail à une personne.', tn: 'وري خدمتك لشخص واحد.' },
    { en: 'Learn one useful shortcut.', fr: 'Apprenez un raccourci utile.', tn: 'تعلّم حيلة صغيرة تنفعك.' },
  ],
  hope: [
    { en: 'Return to the project that still matters.', fr: 'Revenez au projet qui compte encore.', tn: 'ارجع للمشروع اللي ما زال يهمك.' },
    { en: 'List two wins from this week.', fr: 'Notez deux réussites de la semaine.', tn: 'اكتب زوز نجاحات هالأسبوع.' },
    { en: 'Share an idea before it feels perfect.', fr: 'Partagez une idée avant qu’elle soit parfaite.', tn: 'شارك فكرة قبل ما تولي كاملة.' },
    { en: 'Plan the next kind follow-up.', fr: 'Prévoyez la prochaine relance bienveillante.', tn: 'خطط لمتابعة لطيفة.' },
  ],
};

const FAMILY: Record<Theme, Localized[]> = {
  begin: [
    { en: 'Share one small plan at home.', fr: 'Partagez un petit projet à la maison.', tn: 'احكي على خطة صغيرة في الدار.' },
    { en: 'Start a tiny tradition together.', fr: 'Lancez une petite habitude ensemble.', tn: 'ابدا عادة صغيرة مع بعض.' },
    { en: 'Invite family to one simple meal.', fr: 'Invitez la famille pour un repas simple.', tn: 'اعرض لمّة صغيرة على الطاولة.' },
    { en: 'Name one thing you will do together this week.', fr: 'Nommez une chose à faire ensemble cette semaine.', tn: 'سمّي حاجة تعملوها مع بعض هالأسبوع.' },
  ],
  craft: [
    { en: 'Do one helpful thing at home unasked.', fr: 'Faites une chose utile à la maison sans qu’on demande.', tn: 'اعمل حاجة نافعة في الدار من غير طلب.' },
    { en: 'Tidy one shared space for 10 minutes.', fr: 'Rangez un espace commun 10 minutes.', tn: 'رتّب بلاصة مشتركة 10 دقايق.' },
    { en: 'Fix one small thing that bothers everyone.', fr: 'Réparez un petit détail qui gêne tous.', tn: 'صلّح حاجة صغيرة تقلق الجميع.' },
    { en: 'Thank the person who keeps home running.', fr: 'Remerciez qui fait tourner la maison.', tn: 'اشكر اللي شادّ الدار.' },
  ],
  choice: [
    { en: 'Ask what they need before you decide for them.', fr: 'Demandez ce dont ils ont besoin avant de décider.', tn: 'اسألهم شنوة يحتاجوا قبل ما تقرر.' },
    { en: 'Listen to the quietest voice at home.', fr: 'Écoutez la voix la plus discrète à la maison.', tn: 'اسمع الصوت الهادئ في الدار.' },
    { en: 'Share the choice, share the load.', fr: 'Partagez le choix et l’effort.', tn: 'شارك القرار وتقاسم الحمل.' },
    { en: 'Decide together on one rule.', fr: 'Décidez ensemble d’une règle.', tn: 'اتفقوا على قاعدة وحدة.' },
  ],
  rest: [
    { en: 'Protect one quiet hour at home.', fr: 'Préservez une heure calme à la maison.', tn: 'احمي ساعة هادية في الدار.' },
    { en: 'Lower the noise, raise the warmth.', fr: 'Baissez le bruit, montez la chaleur.', tn: 'نقّص الحس وزيّد الدفء.' },
    { en: 'Rest together without screens.', fr: 'Reposez-vous ensemble sans écran.', tn: 'ارتاحوا مع بعض بلا تليفون.' },
    { en: 'Make room for a calm bedtime.', fr: 'Faites place à un coucher calme.', tn: 'خلّي وقت نوم هادئ.' },
  ],
  change: [
    { en: 'Introduce one gentle change at home.', fr: 'Introduisez un changement doux à la maison.', tn: 'دخّل تغيير لطيف في الدار.' },
    { en: 'Move one object to make space.', fr: 'Déplacez un objet pour faire de la place.', tn: 'حرّك حاجة باش توسّع.' },
    { en: 'Try a new route or new table place.', fr: 'Essayez une nouvelle place à table.', tn: 'جرّب بلاصة جديدة.' },
    { en: 'Talk about what “home” means this month.', fr: 'Parlez de ce que “maison” veut dire ce mois-ci.', tn: 'احكوا شنوة معناها الدار هالشهر.' },
  ],
  hope: [
    { en: 'Tell someone at home what you appreciate.', fr: 'Dites à quelqu’un ce que vous appréciez chez lui.', tn: 'قول لحد في الدار شنوة تقدّر فيه.' },
    { en: 'Celebrate a small family win.', fr: 'Célébrez une petite victoire familiale.', tn: 'احتفل بنجاح صغير للعائلة.' },
    { en: 'Plan one joyful thing together.', fr: 'Prévoyez une chose joyeuse ensemble.', tn: 'برمجوا حاجة تفرّح مع بعض.' },
    { en: 'Leave a kind note where they will find it.', fr: 'Laissez un mot doux là où il sera trouvé.', tn: 'خلّي كلمة حلوة يلقاوها.' },
  ],
};

const RITUAL: Record<Theme, Localized[]> = {
  begin: [
    { en: '2-min: write one intention, light a candle, breathe.', fr: '2 min : écris une intention, allume une bougie, respire.', tn: 'دقيقتين: اكتب نيّة، شعل شمعة، تنفّس.' },
    { en: '10-min: start the task you named — timer on.', fr: '10 min : commence la tâche nommée — chrono.', tn: '10 دقايق: ابدا المهمة — شغّل المؤقت.' },
    { en: 'Write the next step on a sticky note and do it.', fr: 'Écris la prochaine étape et fais-la.', tn: 'اكتب الخطوة الجاية واعملها.' },
    { en: 'Step outside, set intention aloud, return.', fr: 'Sors, dis ton intention à voix haute, reviens.', tn: 'اخرج، قول نيتك بصوت، وارجع.' },
  ],
  craft: [
    { en: 'List 3 tasks, keep 1, cross 2.', fr: 'Liste 3 tâches, garde 1, raye 2.', tn: 'اكتب 3 مهام، خلّي وحدة وامسح زوز.' },
    { en: 'Tidy the desk for 5 min, then work.', fr: 'Range le bureau 5 min, puis travaille.', tn: 'رتّب المكتب 5 دقايق وبعد اخدم.' },
    { en: 'Close extra tabs, one screen only.', fr: 'Ferme les onglets, un seul écran.', tn: 'سكّر النوافذ، خلّي شاشة وحدة.' },
    { en: 'Write the “done” list, not the “to-do”.', fr: 'Écris ce qui est fait, pas à faire.', tn: 'اكتب شنوة كمّلت، موش شنوة باش تعمل.' },
  ],
  choice: [
    { en: 'Draw two columns: keep / release — choose one.', fr: 'Deux colonnes : garder / lâcher — choisis.', tn: 'اعمل جدول: نخلي / نسيّب — اختار.' },
    { en: 'Write pros/cons in 3 lines each, circle one.', fr: 'Pour/contre en 3 lignes, entoure un choix.', tn: 'اكتب إيجابيات/سلبيات 3 أسطر، دوّر اختيار.' },
    { en: 'Ask: “what would kindness decide?” — write it.', fr: 'Demande : “que déciderait la bienveillance ?”', tn: 'اسأل: شنوة يختار اللطف؟ — اكتبه.' },
    { en: 'Text a trusted person your two options.', fr: 'Envoie tes deux options à une personne sûre.', tn: 'ابعث خياريك لشخص تثق فيه.' },
  ],
  rest: [
    { en: '3 slow breaths, phone face-down 5 min.', fr: '3 respirations lentes, téléphone 5 min à l’envers.', tn: '3 أنفاس بطيئة، التليفون مقلوب 5 دقايق.' },
    { en: 'No screen 15 min before sleep tonight.', fr: 'Pas d’écran 15 min avant de dormir.', tn: 'بلا شاشة 15 دقيقة قبل النوم.' },
    { en: 'Make tea in silence, notice the warmth.', fr: 'Fais un thé en silence, sens la chaleur.', tn: 'اعمل تاي بصمت وحس بالدفء.' },
    { en: 'Stretch neck & shoulders for 2 min.', fr: 'Étire nuque et épaules 2 min.', tn: 'مطّد رقبتك وكتافك دقيقتين.' },
  ],
  change: [
    { en: 'Write what to release, fold it, put it away.', fr: 'Écris à lâcher, plie, mets de côté.', tn: 'اكتب شنوة تسيّب، اطوي وحط جانب.' },
    { en: 'Change one small habit for today only.', fr: 'Change une petite habitude juste aujourd’hui.', tn: 'بدّل عادة صغيرة لليوم فقط.' },
    { en: 'Move your workspace for one hour.', fr: 'Change de place une heure.', tn: 'بدّل بلاصة خدمتك ساعة.' },
    { en: 'Say out loud one thing you are ready to end.', fr: 'Dis à voix haute ce que tu es prêt à terminer.', tn: 'قول بصوت حاجة مستعد تنهيها.' },
  ],
  hope: [
    { en: 'Write one gratitude + one gentle intention.', fr: 'Écris une gratitude + une intention douce.', tn: 'اكتب امتنان + نيّة لطيفة.' },
    { en: 'Send a kind message to someone.', fr: 'Envoie un message bienveillant.', tn: 'ابعث رسالة لطيفة لشخص.' },
    { en: 'Light a candle, think of one good thing coming.', fr: 'Allume une bougie, pense à une bonne chose à venir.', tn: 'شعل شمعة وفكّر في حاجة باهية جاية.' },
    { en: 'Note a recent win, however small.', fr: 'Note une victoire récente, même petite.', tn: 'اكتب نجاح صغير صار.' },
  ],
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

function pick<T>(arr: T[], seed: string): T {
  return arr[stableHash(seed) % arr.length];
}

export function symbolicCardName(clientId: string, dateKey: string, language: Language): string {
  return CARDS[stableHash(`${dateKey}|${clientId}`) % CARDS.length].name[language];
}

export function makeDailyMessage(client: Pick<Client, 'id' | 'name' | 'sun_sign' | 'preferred_language'>, sky: SkySnapshot, bookingUrl: string): MessageParts {
  const language = client.preferred_language;
  const firstName = client.name.trim().split(/\s+/)[0] || client.name;
  const date = sky.dateKey.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1');
  const card = CARDS[stableHash(`${sky.dateKey}|${client.id}`) % CARDS.length];
  const number = 1 + stableHash(`number|${sky.dateKey}|${client.id}`) % 9;
  const phase = PHASES[sky.moon.phase] || {
    name: { en: sky.moon.phase, fr: sky.moon.phase, tn: sky.moon.phase },
    prompt: { en: 'notice your next step', fr: 'remarquer votre prochaine étape', tn: 'تلاحظ خطوتك الجاية' },
  };
  const moon = sky.planets.find((planet) => planet.name === 'Moon')?.sign;
  const sun = sky.planets.find((planet) => planet.name === 'Sun')?.sign;
  const venus = sky.planets.find((planet) => planet.name === 'Venus')?.sign;
  const mercury = sky.planets.find((planet) => planet.name === 'Mercury')?.sign;
  const sign = client.sun_sign;
  const positions = {
    en: [moon && `${phase.name.en} Moon in ${localSign(moon, 'en')}`, sun && `Sun in ${localSign(sun, 'en')}`, venus && `Venus in ${localSign(venus, 'en')}`, mercury && `Mercury in ${localSign(mercury, 'en')}`].filter(Boolean).join(' · '),
    fr: [moon && `Lune en ${localSign(moon, 'fr')} (${phase.name.fr})`, sun && `Soleil en ${localSign(sun, 'fr')}`, venus && `Vénus en ${localSign(venus, 'fr')}`, mercury && `Mercure en ${localSign(mercury, 'fr')}`].filter(Boolean).join(' · '),
    tn: [moon && `القمر (${phase.name.tn}) في ${localSign(moon, 'tn')}`, sun && `الشمس في ${localSign(sun, 'tn')}`, venus && `الزهرة في ${localSign(venus, 'tn')}`, mercury && `عطارد في ${localSign(mercury, 'tn')}`].filter(Boolean).join(' · '),
  };
  const moonNote = moon ? {
    en: `Moon in ${localSign(moon, 'en')} — ${SIGN_THEMES[moon].en}. ${phase.name.en}: ${phase.prompt.en}.`,
    fr: `Lune en ${localSign(moon, 'fr')} — ${SIGN_THEMES[moon].fr}. ${phase.name.fr} : ${phase.prompt.fr}.`,
    tn: `القمر في ${localSign(moon, 'tn')} — ${SIGN_THEMES[moon].tn}. ${phase.name.tn}: ${phase.prompt.tn}.`,
  } : {
    en: `${phase.name.en} — ${phase.prompt.en}.`,
    fr: `${phase.name.fr} — ${phase.prompt.fr}.`,
    tn: `${phase.name.tn} — ${phase.prompt.tn}.`,
  };
  const signNote = sign ? {
    en: `Your ${localSign(sign, 'en')} leans to ${SIGN_THEMES[sign].en}.`,
    fr: `Votre ${localSign(sign, 'fr')} invite à ${SIGN_THEMES[sign].fr}.`,
    tn: `برجك ${localSign(sign, 'tn')} يدعوك لـ ${SIGN_THEMES[sign].tn}.`,
  } : {
    en: `No sign on file — take this as a general note.`,
    fr: `Pas de signe enregistré — note générale.`,
    tn: `ما فماش برج مسجل — اعتبرها ملاحظة عامة.`,
  };

  // varied hints per theme, rotated by date+client so it never repeats
  const love = pick(LOVE[card.theme], `${sky.dateKey}|${client.id}|love`);
  const career = pick(CAREER[card.theme], `${sky.dateKey}|${client.id}|work`);
  const family = pick(FAMILY[card.theme], `${sky.dateKey}|${client.id}|family`);
  const ritual = pick(RITUAL[card.theme], `${sky.dateKey}|${client.id}|ritual|${card.name.en}`);

  const FREE = 'https://tarot-tn.vercel.app/free-course.html';
  const psEn = sign
    ? `🌙 P.S. ${firstName}, your ${localSign(sign, 'en')} energy this week — a private reading could help. New? Free course: ${FREE}`
    : `🌙 P.S. ${firstName}, a private reading could help this week. New? Free course: ${FREE}`;
  const psFr = sign
    ? `🌙 P.S. ${firstName}, ton énergie ${localSign(sign, 'fr')} cette semaine — une lecture privée peut aider. Débutant ? Cours gratuit : ${FREE}`
    : `🌙 P.S. ${firstName}, une lecture privée peut aider cette semaine. Débutant ? Cours gratuit : ${FREE}`;
  const psTn = sign
    ? `🌙 كلمة أخيرة ${firstName}: برجك ${localSign(sign, 'tn')} هالأسبوع — قراءة خاصة تنجم تعاونك. جديد؟ كورس ببلاش: ${FREE}`
    : `🌙 كلمة أخيرة ${firstName}: قراءة خاصة تنجم تعاونك هالأسبوع. جديد؟ كورس ببلاش: ${FREE}`;

  if (language === 'fr') return {
    greeting: `Bonjour ${firstName} ✨`,
    body: [
      `*${date} · ${sign ? `Signe : ${localSign(sign, 'fr')}` : 'Pour vous'}*`,
      `${positions.fr || 'Ciel du jour indisponible.'}`,
      `${moonNote.fr} ${signNote.fr}`,
      '',
      `🃏 *${card.name.fr}* — ${card.invitation.fr}`,
      `💗 ${love.fr}`,
      `💼 ${career.fr}`,
      `🏡 ${family.fr}`,
      `🔢 ${number} — ${NUMBERS[number - 1].fr}`,
      `🕯️ ${ritual.fr}`,
      '_Note symbolique, pas une prédiction._',
    ].join('\n'),
    invitation: `Envie d’une lecture privée ? Réservez : ${bookingUrl}\nWhatsApp: +216 22 481 622\nSTOP pour arrêter.\n\n${psFr}`,
  };

  if (language === 'tn') return {
    greeting: `عسلامة ${firstName} ✨`,
    body: [
      `*${date} · ${sign ? `برجك: ${localSign(sign, 'tn')}` : 'ليك'}*`,
      `${positions.tn || 'السماء غير متوفرة.'}`,
      `${moonNote.tn} ${signNote.tn}`,
      '',
      `🃏 *${card.name.tn}* — ${card.invitation.tn}`,
      `💗 ${love.tn}`,
      `💼 ${career.tn}`,
      `🏡 ${family.tn}`,
      `🔢 ${number} — ${NUMBERS[number - 1].tn}`,
      `🕯️ ${ritual.tn}`,
      '_ملاحظة رمزية، موش تنبؤ._',
    ].join('\n'),
    invitation: `تحب قراءة خاصة؟ احجز: ${bookingUrl}\nواتساب: +216 22 481 622\nابعث STOP باش توقف.\n\n${psTn}`,
  };

  return {
    greeting: `Hi ${firstName} ✨`,
    body: [
      `*${date} · ${sign ? `${localSign(sign, 'en')} lens` : 'For you'}*`,
      `${positions.en || 'Sky unavailable'}`,
      `${moonNote.en} ${signNote.en}`,
      '',
      `🃏 *${card.name.en}* — ${card.invitation.en}`,
      `💗 ${love.en}`,
      `💼 ${career.en}`,
      `🏡 ${family.en}`,
      `🔢 ${number} — ${NUMBERS[number - 1].en}`,
      `🕯️ ${ritual.en}`,
      '_Symbolic note, not a prediction._',
    ].join('\n'),
    invitation: `Private reading? Book: ${bookingUrl}\nWhatsApp: +216 22 481 622\nReply STOP to pause.\n\n${psEn}`,
  };
}

export function joinMessage(parts: MessageParts): string {
  return [parts.greeting.trim(), parts.body.trim(), parts.invitation.trim()].filter(Boolean).join('\n\n');
}

export function whatsappLink(phone: string, message: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}
