import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
const ai = new GoogleGenAI({ apiKey });

const MODELES = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
];

export async function genererEpreuves(
  imagesBase64: string[],
  matiere: string,
  niveau: string,
  notions: string
): Promise<string> {
  const prompt = `Tu es un enseignant expert de ${niveau} en ${matiere}.
Notions à travailler : ${notions}.

À partir des images du cahier fournies, génère 5 épreuves de difficulté croissante :

- Épreuve 1 - Base : exercices directs.
- Épreuve 2 - Consolidation : formulations variées.
- Épreuve 3 - Mélangée : notions mélangées.
- Épreuve 4 - Pièges : données inutiles.
- Épreuve 5 - Examen réel : proche du vrai contrôle.

Pour chaque épreuve : durée, barème /20, corrigé détaillé.
Vocabulaire adapté à un enfant de ${niveau}.`;

  const contents: any[] = [{ text: prompt }];

  for (const img of imagesBase64) {
    const [meta, data] = img.split(',');
    const mime = meta.match(/data:(.*?);/)?.[1] || 'image/jpeg';
    contents.push({ inlineData: { mimeType: mime, data } });
  }

  let derniereErreur: any = null;

  for (const modele of MODELES) {
    try {
      const response = await ai.models.generateContent({
        model: modele,
        contents: contents,
      });
      return response.text;
    } catch (err) {
      derniereErreur = err;
      console.log(`Modèle ${modele} indisponible, essai suivant...`);
    }
  }

  throw new Error(
    'Tous les modèles sont saturés en ce moment. Réessaie dans 1-2 minutes. Détail : ' +
      String(derniereErreur)
  );
}
