import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
const ai = new GoogleGenAI({ apiKey });

const MODELES = ['gemini-3.5-flash', 'gemini-3.8-flash'];

const timeout = (ms: number) => new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Timeout')), ms)
);

export async function genererEpreuvesStream(
  imagesBase64: string[],
  matiere: string,
  niveau: string,
  notions: string,
  onChunk: (texte: string) => void
): Promise<string> {
  const prompt = `Enseignant ${niveau} en ${matiere}. Notions : ${notions}.

Génère 5 épreuves progressives. Commence par "## Épreuve 1 - Base".
Structure : "## Épreuve N - Titre" puis durée, barème /20, exercices, corrigé.
Épreuves : Base, Consolidation, Mélangée, Pièges, Examen réel.
Vocabulaire adapté à ${niveau}. Sois concis.`;

  const contents: any[] = [{ text: prompt }];

  for (const img of imagesBase64) {
    const [meta, data] = img.split(',');
    const mime = meta.match(/data:(.*?);/)?.[1] || 'image/jpeg';
    contents.push({ inlineData: { mimeType: mime, data } });
  }

  let derniereErreur: any = null;

  for (const modele of MODELES) {
    try {
      console.log(`⏱️ Stream ${modele}...`);
      const stream = await Promise.race([
        ai.models.generateContentStream({ model: modele, contents }),
        timeout(15000),
      ]) as any;

      let texte = '';
      for await (const chunk of stream) {
        const t = chunk.text || '';
        if (t) {
          texte += t;
          onChunk(texte);
        }
      }
      console.log(`✅ ${modele} terminé`);
      return texte;
    } catch (err) {
      derniereErreur = err;
      console.log(`❌ ${modele} échoué`);
    }
  }

  throw new Error('Modèles saturés. Réessaie.\n' + String(derniereErreur));
}
