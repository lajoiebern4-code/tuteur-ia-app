import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
const ai = new GoogleGenAI({ apiKey });

const MODELES = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
];

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function genererEpreuves(
  imagesBase64: string[],
  matiere: string,
  niveau: string,
  notions: string
): Promise<string> {
  const prompt = `Tu es un enseignant expert de ${niveau} en ${matiere}.
Notions à travailler : ${notions}.

À partir des images du cahier fournies, génère EXACTEMENT 5 épreuves de difficulté croissante.

RÈGLES STRICTES :
- Commence DIRECTEMENT par "## Épreuve 1", sans aucune introduction ni phrase avant.
- N'ajoute AUCUN texte avant, entre, ou après les épreuves.
- Titre EXACT pour chaque épreuve (respecte les mots) :
  - "## Épreuve 1 - Base"
  - "## Épreuve 2 - Consolidation"
  - "## Épreuve 3 - Mélangée"
  - "## Épreuve 4 - Pièges"
  - "## Épreuve 5 - Examen réel"

Pour CHAQUE épreuve, respecte cette structure :
- Durée
- Barème /20
- Sujet pour l'élève (exercices numérotés)
- Corrigé détaillé

Vocabulaire adapté à un enfant de ${niveau}.`;

  const contents: any[] = [{ text: prompt }];

  for (const img of imagesBase64) {
    const [meta, data] = img.split(',');
    const mime = meta.match(/data:(.*?);/)?.[1] || 'image/jpeg';
    contents.push({ inlineData: { mimeType: mime, data } });
  }

  let derniereErreur: any = null;

  for (let tour = 0; tour < 2; tour++) {
    for (const modele of MODELES) {
      try {
        console.log(`Tentative : ${modele} (tour ${tour + 1})`);
        const response = await ai.models.generateContent({
          model: modele,
          contents: contents,
        });
        return response.text;
      } catch (err) {
        derniereErreur = err;
        console.log(`❌ ${modele} échoué`);
      }
    }
    if (tour === 0) await attendre(5000);
  }

  throw new Error(
    'Tous les modèles sont saturés. Réessaie dans 1-2 minutes.\n' + String(derniereErreur)
  );
}
