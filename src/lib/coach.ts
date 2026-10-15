import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
const ai = new GoogleGenAI({ apiKey });

const MODELES = ['gemini-3.5-flash', 'gemini-3.8-flash'];

const timeout = (ms: number) => new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Timeout')), ms)
);

export type MessageCoach = {
  role: 'user' | 'model';
  texte: string;
};

function construirePromptSysteme(
  matiere: string,
  niveau: string,
  notions: string
): string {
  return `Tu es un coach pédagogique bienveillant qui aide un enfant de ${niveau} en ${matiere}.
Notions à travailler : ${notions}.

RÈGLES ABSOLUES :
1. Ne donne JAMAIS la réponse directement.
2. Pose UNE SEULE question à la fois, puis attends la réponse.
3. Si l'enfant a juste : félicite chaleureusement ("Bravo !", "Super !") et passe à la suite.
4. Si l'enfant a faux : donne UN indice, puis repose la question.
5. Si 2 échecs : explique étape par étape avec un exemple simple.
6. Utilise un langage simple adapté à ${niveau}.
7. Sois encourageant : "Tu y es presque !", "Belle tentative !"
8. Ne dis JAMAIS "C'est faux" ou "Tu t'es trompé" — préfère "Presque ! Réessaie avec..."
9. Utilise des emojis avec parcimonie (1-2 max par message).
10. Reste bref : 2-3 phrases maximum par message.

DÉMARRAGE :
- Commence par te présenter en 1 phrase.
- Puis propose un premier exercice simple pour évaluer le niveau.
- Termine par UNE question claire.`;
}

export async function envoyerMessageCoach(
  historique: MessageCoach[],
  matiere: string,
  niveau: string,
  notions: string,
  onChunk: (texte: string) => void
): Promise<string> {
  const systemPrompt = construirePromptSysteme(matiere, niveau, notions);

  const contents: any[] = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Compris ! Je vais aider cet enfant avec bienveillance.' }] },
    ...historique.map((m) => ({
      role: m.role,
      parts: [{ text: m.texte }],
    })),
  ];

  let derniereErreur: any = null;

  for (const modele of MODELES) {
    try {
      console.log(`🎓 Coach ${modele}...`);
      const stream = await Promise.race([
        ai.models.generateContentStream({
          model: modele,
          contents,
          config: {
            temperature: 0.7,
            maxOutputTokens: 500,
          },
        }),
        timeout(30000),
      ]) as any;

      let texte = '';
      for await (const chunk of stream) {
        const t = chunk.text || '';
        if (t) {
          texte += t;
          onChunk(texte);
        }
      }
      return texte;
    } catch (err) {
      derniereErreur = err;
      console.log(`❌ ${modele} échoué`);
    }
  }

  throw new Error('Coach indisponible. Réessaie.\n' + String(derniereErreur));
}
