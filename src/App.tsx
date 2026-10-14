import { useState } from 'react';
import { genererEpreuves } from './lib/gemini';

const MATIERES = ['Maths', 'Français', 'Sciences', 'Histoire-Géo', 'Anglais'];
const NIVEAUX = ['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6e', '5e', '4e', '3e'];

type Epreuve = { titre: string; contenu: string; numero: number };

const COULEURS = [
  { bg: 'bg-emerald-50', border: 'border-emerald-300', badge: 'bg-emerald-500', label: 'Base' },
  { bg: 'bg-blue-50', border: 'border-blue-300', badge: 'bg-blue-500', label: 'Consolidation' },
  { bg: 'bg-violet-50', border: 'border-violet-300', badge: 'bg-violet-500', label: 'Mélangée' },
  { bg: 'bg-amber-50', border: 'border-amber-300', badge: 'bg-amber-500', label: 'Pièges' },
  { bg: 'bg-rose-50', border: 'border-rose-300', badge: 'bg-rose-500', label: 'Examen réel' },
];

function parseEpreuves(texte: string): Epreuve[] {
  const parties = texte.split(/(?=#{1,3}\s*\*{0,2}Épreuve\s+\d)/i);
  const resultat: Epreuve[] = [];

  for (const p of parties) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    const lignes = trimmed.split('\n');
    const titre = lignes[0].replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
    const contenu = lignes.slice(1).join('\n').trim();
    const numero = resultat.length + 1;
    resultat.push({ titre, contenu, numero });
  }

  if (resultat.length === 0) {
    resultat.push({ titre: 'Résultat', contenu: texte, numero: 1 });
  }

  return resultat;
}

function App() {
  const [images, setImages] = useState<string[]>([]);
  const [matiere, setMatiere] = useState('Maths');
  const [niveau, setNiveau] = useState('CM2');
  const [notions, setNotions] = useState('');
  const [epreuves, setEpreuves] = useState<Epreuve[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [copie, setCopie] = useState<number | null>(null);

  const ajouterImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setImages((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const retirerImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const generer = async () => {
    if (images.length === 0) return;
    setChargement(true);
    setErreur('');
    setEpreuves([]);
    try {
      const texte = await genererEpreuves(images, matiere, niveau, notions || 'révision générale');
      setEpreuves(parseEpreuves(texte));
    } catch (err) {
      setErreur(String(err));
    }
    setChargement(false);
  };

  const copier = async (epreuve: Epreuve) => {
    const texte = `${epreuve.titre}\n\n${epreuve.contenu}`;
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(epreuve.numero);
      setTimeout(() => setCopie(null), 2000);
    } catch {
      setErreur('Impossible de copier');
    }
  };

  const copierTout = async () => {
    const texte = epreuves.map((e) => `${e.titre}\n\n${e.contenu}`).join('\n\n---\n\n');
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(999);
      setTimeout(() => setCopie(null), 2000);
    } catch {
      setErreur('Impossible de copier');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <header className="text-center mb-8 print:mb-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-indigo-800 mb-2">
            📚 Tuteur IA
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Générez 5 épreuves personnalisées à partir du cahier de votre enfant
          </p>
        </header>

        {/* Formulaire */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 print:hidden">
          {/* Upload */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📸 Photos du cahier
            </label>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-indigo-300 rounded-xl cursor-pointer bg-indigo-50 hover:bg-indigo-100 transition">
              <span className="text-3xl mb-1">📷</span>
              <span className="text-sm text-indigo-700 font-medium">Cliquez pour choisir des photos</span>
              <span className="text-xs text-gray-500 mt-1">{images.length} photo(s) chargée(s)</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={ajouterImages}
                className="hidden"
              />
            </label>

            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {images.map((img, i) => (
                  <div key={i} className="relative">
                    <img
                      src={img}
                      alt={`Photo ${i + 1}`}
                      className="w-16 h-16 object-cover rounded-lg border-2 border-indigo-200"
                    />
                    <button
                      onClick={() => retirerImage(i)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Matière + Niveau */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">📖 Matière</label>
              <select
                value={matiere}
                onChange={(e) => setMatiere(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-indigo-500 outline-none"
              >
                {MATIERES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">🎓 Niveau</label>
              <select
                value={niveau}
                onChange={(e) => setNiveau(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-indigo-500 outline-none"
              >
                {NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          {/* Notions */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🎯 Notions à travailler
            </label>
            <input
              value={notions}
              onChange={(e) => setNotions(e.target.value)}
              placeholder="Ex: fractions, passé composé, multiplication..."
              className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Bouton Générer */}
          <button
            onClick={generer}
            disabled={chargement || images.length === 0}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition text-lg"
          >
            {chargement ? '⏳ Génération en cours...' : '🚀 Générer les 5 épreuves'}
          </button>

          {erreur && (
            <div className="mt-4 bg-red-50 border-2 border-red-200 text-red-700 p-3 rounded-lg text-sm">
              ⚠️ {erreur}
            </div>
          )}
        </div>

        {/* Actions sur les résultats */}
        {epreuves.length > 0 && (
          <div className="flex gap-3 mb-4 print:hidden">
            <button
              onClick={copierTout}
              className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl border-2 border-gray-200 transition"
            >
              {copie === 999 ? '✅ Copié !' : '📋 Copier tout'}
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl border-2 border-gray-200 transition"
            >
              🖨️ Imprimer / PDF
            </button>
          </div>
        )}

        {/* Épreuves */}
        <div className="space-y-4">
          {epreuves.map((epreuve, i) => {
            const c = COULEURS[i] || COULEURS[COULEURS.length - 1];
            return (
              <article
                key={i}
                className={`rounded-2xl shadow-md border-2 ${c.border} ${c.bg} overflow-hidden print:break-inside-avoid print:shadow-none`}
              >
                {/* En-tête de carte */}
                <div className="p-4 flex items-center justify-between gap-3 print:p-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`${c.badge} text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap`}>
                      Épreuve {epreuve.numero}
                    </span>
                    <h2 className="font-bold text-gray-800 text-sm sm:text-base truncate">
                      {epreuve.titre.replace(/^Épreuve\s+\d+\s*[-–:]\s*/i, '') || c.label}
                    </h2>
                  </div>
                  <button
                    onClick={() => copier(epreuve)}
                    className="bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 whitespace-nowrap print:hidden"
                  >
                    {copie === epreuve.numero ? '✅ Copié' : '📋 Copier'}
                  </button>
                </div>

                {/* Contenu */}
                <div className="bg-white p-4 border-t border-gray-100 print:p-2">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">
                    {epreuve.contenu}
                  </pre>
                </div>
              </article>
            );
          })}
        </div>

        {/* Pied de page */}
        {epreuves.length > 0 && (
          <p className="text-center text-xs text-gray-500 mt-8 print:mt-4">
            Généré par Tuteur IA • Pour aider votre enfant à progresser 📚
          </p>
        )}
      </div>
    </main>
  );
}

export default App;
