import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
const ai = new GoogleGenAI({ apiKey });

const MODELES = ['gemini-3.5-flash', 'gemini-3.8-flash'];

const timeout = (ms: number) => new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Timeout')), ms)
);

export async function genererPlanExamen(
  matiere: string,
  niveau: string,
  notions: string,
  joursRestants: number,
  onChunk: (texte: string) => void
): Promise<string> {
  const prompt = `Enseignant ${niveau} en ${matiere}. 
L'enfant a une COMPOSITION dans ${joursRestants} jours.
Notions à maîtriser : ${notions}.

Génère un plan complet :

# 📅 PLANNING DE RÉVISION (J-${joursRestants} à J-0)
Pour chaque jour : objectif, 3-4 exercices ciblés, durée (15-30 min).
Progression du plus simple au plus complexe.

# 📝 ÉPREUVE BLANCHE (type composition)
- Durée : 45-60 min
- Barème /20
- 4-5 exercices progressifs
- Présentation comme un vrai sujet d'examen

# ✅ CORRIGÉ DÉTAILLÉ
Solutions expliquées + points par exercice.

# 💡 CONSEILS POUR LE JOUR J
5 astuces concrètes pour réussir.

Sois concis. Vocabulaire adapté à ${niveau}.`;

  const contents: any[] = [{ text: prompt }];

  let derniereErreur: any = null;

  for (const modele of MODELES) {
    try {
      const stream = await Promise.race([
        ai.models.generateContentStream({
          model: modele,
          contents,
          config: { temperature: 0.7, maxOutputTokens: 3000 },
        }),
        timeout(45000),
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

  throw new Error('Modèles saturés.\n' + String(derniereErreur));
}
