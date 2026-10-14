import { useState, useEffect } from 'react';
import { genererEpreuves } from './lib/gemini';
import { supabase, getVisiteurId } from './lib/supabase';

const MATIERES = ['Maths', 'Français', 'Sciences', 'Histoire-Géo', 'Anglais'];
const NIVEAUX = ['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6e', '5e', '4e', '3e'];

type Epreuve = { titre: string; contenu: string; numero: number };
type Historique = {
  id: string;
  matiere: string;
  niveau: string;
  notions: string;
  contenu: string;
  created_at: string;
};

const COULEURS = [
  { bg: 'bg-emerald-50', border: 'border-emerald-300', badge: 'bg-emerald-500' },
  { bg: 'bg-blue-50', border: 'border-blue-300', badge: 'bg-blue-500' },
  { bg: 'bg-violet-50', border: 'border-violet-300', badge: 'bg-violet-500' },
  { bg: 'bg-amber-50', border: 'border-amber-300', badge: 'bg-amber-500' },
  { bg: 'bg-rose-50', border: 'border-rose-300', badge: 'bg-rose-500' },
];

function parseEpreuves(texte: string): Epreuve[] {
  const parties = texte.split(/(?=^#{1,3}\s*\**Épreuve\s+\d)/im);
  const resultat: Epreuve[] = [];
  for (const p of parties) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    const contenuPur = trimmed.replace(/[#*\s]/g, '');
    if (contenuPur.length < 150) continue;
    const lignes = trimmed.split('\n');
    const titre = lignes[0].replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/^Épreuve\s+\d+\s*[-–:]\s*/i, '').trim();
    const contenu = lignes.slice(1).join('\n').trim();
    resultat.push({ titre, contenu, numero: resultat.length + 1 });
  }
  if (resultat.length === 0) resultat.push({ titre: 'Résultat', contenu: texte, numero: 1 });
  return resultat;
}

function compresserImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 1200;
        let w = img.width, h = img.height;
        if (w > h && w > MAX) { h = (h * MAX) / w; w = MAX; }
        else if (h > MAX) { w = (w * MAX) / h; h = MAX; }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [images, setImages] = useState<string[]>([]);
  const [matiere, setMatiere] = useState('Maths');
  const [niveau, setNiveau] = useState('CM2');
  const [notions, setNotions] = useState('');
  const [epreuves, setEpreuves] = useState<Epreuve[]>([]);
  const [chargement, setChargement] = useState(false);
  const [secondes, setSecondes] = useState(0);
  const [erreur, setErreur] = useState('');
  const [historique, setHistorique] = useState<Historique[]>([]);
  const [voirHistorique, setVoirHistorique] = useState(false);
  const [copie, setCopie] = useState<number | null>(null);

  const chargerHistorique = async () => {
    const visiteurId = getVisiteurId();
    const { data } = await supabase
      .from('epreuves')
      .select('*')
      .eq('visiteur_id', visiteurId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setHistorique(data);
  };

  useEffect(() => { chargerHistorique(); }, []);

  useEffect(() => {
    if (!chargement) { setSecondes(0); return; }
    const t = setInterval(() => setSecondes((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [chargement]);

  const ajouterImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const compressed = await compresserImage(file);
      setImages((prev) => [...prev, compressed]);
    }
  };

  const generer = async () => {
    if (images.length === 0) return;
    setChargement(true); setErreur(''); setEpreuves([]);
    try {
      const texte = await genererEpreuves(images, matiere, niveau, notions || 'révision générale');
      setEpreuves(parseEpreuves(texte));

      await supabase.from('epreuves').insert({
        visiteur_id: getVisiteurId(),
        matiere, niveau,
        notions: notions || 'révision générale',
        contenu: texte,
      });
      chargerHistorique();
    } catch (err) {
      setErreur(String(err));
    }
    setChargement(false);
  };

  const copier = async (epreuve: Epreuve) => {
    try {
      await navigator.clipboard.writeText(`${epreuve.titre}\n\n${epreuve.contenu}`);
      setCopie(epreuve.numero);
      setTimeout(() => setCopie(null), 2000);
    } catch {}
  };

  const copierTout = async () => {
    try {
      await navigator.clipboard.writeText(epreuves.map((e) => `${e.titre}\n\n${e.contenu}`).join('\n\n---\n\n'));
      setCopie(999);
      setTimeout(() => setCopie(null), 2000);
    } catch {}
  };

  const supprimerHistorique = async (id: string) => {
    await supabase.from('epreuves').delete().eq('id', id);
    chargerHistorique();
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="flex justify-between items-center mb-6 print:mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-indigo-800">📚 Tuteur IA</h1>
          <button
            onClick={() => setVoirHistorique(!voirHistorique)}
            className="bg-white text-gray-700 px-4 py-2 rounded-lg border-2 border-gray-200 text-sm font-semibold print:hidden"
          >
            {voirHistorique ? '➕ Nouveau' : `📜 Historique (${historique.length})`}
          </button>
        </div>

        {voirHistorique ? (
          <div className="space-y-3">
            {historique.length === 0 && (
              <p className="text-center text-gray-500 py-8">Aucune épreuve sauvegardée.</p>
            )}
            {historique.map((h) => (
              <div key={h.id} className="bg-white rounded-xl shadow p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <span className="font-bold text-indigo-700">{h.matiere} • {h.niveau}</span>
                    <p className="text-xs text-gray-500">{h.notions}</p>
                  </div>
                  <span className="text-xs text-gray-400 ml-2">
                    {new Date(h.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => { setEpreuves(parseEpreuves(h.contenu)); setVoirHistorique(false); }}
                    className="text-sm text-indigo-600 font-semibold"
                  >
                    👁️ Revoir
                  </button>
                  <button
                    onClick={() => supprimerHistorique(h.id)}
                    className="text-sm text-red-500 font-semibold ml-auto"
                  >
                    🗑️ Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 print:hidden">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-indigo-300 rounded-xl cursor-pointer bg-indigo-50 hover:bg-indigo-100 transition mb-4">
                <span className="text-3xl mb-1">📷</span>
                <span className="text-sm text-indigo-700 font-medium">Cliquez pour choisir des photos</span>
                <span className="text-xs text-gray-500 mt-1">{images.length} photo(s) chargée(s)</span>
                <input type="file" accept="image/*" multiple onChange={ajouterImages} className="hidden" />
              </label>

              {images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {images.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img} className="w-16 h-16 object-cover rounded-lg border-2 border-indigo-200" />
                      <button
                        onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center"
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">📖 Matière</label>
                  <select value={matiere} onChange={(e) => setMatiere(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-indigo-500 outline-none">
                    {MATIERES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">🎓 Niveau</label>
                  <select value={niveau} onChange={(e) => setNiveau(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-indigo-500 outline-none">
                    {NIVEAUX.map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">🎯 Notions à travailler</label>
                <input value={notions} onChange={(e) => setNotions(e.target.value)}
                  placeholder="Ex: fractions, passé composé..."
                  className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-indigo-500 outline-none" />
              </div>

              <button onClick={generer} disabled={chargement || images.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl disabled:opacity-50 transition text-lg">
                {chargement ? `⏳ Génération... ${secondes}s` : '🚀 Générer les 5 épreuves'}
              </button>

              {chargement && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  Analyse des photos + génération des 5 épreuves (15-40s)
                </p>
              )}

              {erreur && (
                <div className="mt-4 bg-red-50 border-2 border-red-200 text-red-700 p-3 rounded-lg text-sm">
                  ⚠️ {erreur}
                </div>
              )}
            </div>

            {epreuves.length > 0 && (
              <div className="flex gap-3 mb-4 print:hidden">
                <button onClick={copierTout}
                  className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl border-2 border-gray-200">
                  {copie === 999 ? '✅ Copié !' : '📋 Copier tout'}
                </button>
                <button onClick={() => window.print()}
                  className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl border-2 border-gray-200">
                  🖨️ Imprimer / PDF
                </button>
              </div>
            )}

            <div className="space-y-4">
              {epreuves.map((epreuve, i) => {
                const c = COULEURS[i] || COULEURS[COULEURS.length - 1];
                return (
                  <article key={i} className={`rounded-2xl shadow-md border-2 ${c.border} ${c.bg} overflow-hidden print:break-inside-avoid`}>
                    <div className="p-4 flex items-center justify-between gap-3 print:p-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className={`${c.badge} text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap`}>
                          Épreuve {epreuve.numero}
                        </span>
                        <h2 className="font-bold text-gray-800 text-sm sm:text-base truncate">{epreuve.titre}</h2>
                      </div>
                      <button onClick={() => copier(epreuve)}
                        className="bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-2 rounded-lg border print:hidden">
                        {copie === epreuve.numero ? '✅' : '📋'}
                      </button>
                    </div>
                    <div className="bg-white p-4 border-t print:p-2">
                      <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">
                        {epreuve.contenu}
                      </pre>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
