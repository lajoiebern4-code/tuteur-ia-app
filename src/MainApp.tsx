import { useState, useEffect } from 'react';
import { genererEpreuves } from './lib/gemini';
import { supabase } from './lib/supabase';

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

export default function MainApp({ user }: { user: any }) {
  const [images, setImages] = useState<string[]>([]);
  const [matiere, setMatiere] = useState('Maths');
  const [niveau, setNiveau] = useState('CM2');
  const [notions, setNotions] = useState('');
  const [epreuves, setEpreuves] = useState<Epreuve[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [historique, setHistorique] = useState<Historique[]>([]);
  const [voirHistorique, setVoirHistorique] = useState(false);

  const chargerHistorique = async () => {
    const { data } = await supabase.from('epreuves').select('*').order('created_at', { ascending: false }).limit(20);
    if (data) setHistorique(data);
  };

  useEffect(() => { chargerHistorique(); }, []);

  const ajouterImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setImages((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const generer = async () => {
    if (images.length === 0) return;
    setChargement(true); setErreur(''); setEpreuves([]);
    try {
      const texte = await genererEpreuves(images, matiere, niveau, notions || 'révision générale');
      setEpreuves(parseEpreuves(texte));

      // Sauvegarde dans Supabase
      await supabase.from('epreuves').insert({
        user_id: user.id,
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

  const deconnecter = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-indigo-800">📚 Tuteur IA</h1>
          <div className="flex gap-2">
            <button onClick={() => setVoirHistorique(!voirHistorique)}
              className="bg-white text-gray-700 px-3 py-2 rounded-lg border-2 border-gray-200 text-sm font-semibold">
              {voirHistorique ? '➕ Nouveau' : '📜 Historique'}
            </button>
            <button onClick={deconnecter}
              className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-semibold">
              🚪
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-4">Connecté : {user.email}</p>

        {voirHistorique ? (
          <div className="space-y-3">
            {historique.length === 0 && <p className="text-center text-gray-500 py-8">Aucune épreuve sauvegardée.</p>}
            {historique.map((h) => (
              <div key={h.id} className="bg-white rounded-xl shadow p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-bold text-indigo-700">{h.matiere} • {h.niveau}</span>
                    <p className="text-xs text-gray-500">{h.notions}</p>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(h.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
                <button onClick={() => { setEpreuves(parseEpreuves(h.contenu)); setVoirHistorique(false); }}
                  className="text-sm text-indigo-600 font-semibold">👁️ Revoir</button>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-indigo-300 rounded-xl cursor-pointer bg-indigo-50 hover:bg-indigo-100 transition mb-4">
                <span className="text-2xl mb-1">📷</span>
                <span className="text-sm text-indigo-700 font-medium">Photos du cahier</span>
                <span className="text-xs text-gray-500 mt-1">{images.length} photo(s)</span>
                <input type="file" accept="image/*" multiple onChange={ajouterImages} className="hidden" />
              </label>

              {images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {images.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img} className="w-14 h-14 object-cover rounded-lg border-2 border-indigo-200" />
                      <button onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-4">
                <select value={matiere} onChange={(e) => setMatiere(e.target.value)}
                  className="border-2 border-gray-200 rounded-lg p-2 focus:border-indigo-500 outline-none">
                  {MATIERES.map(m => <option key={m}>{m}</option>)}
                </select>
                <select value={niveau} onChange={(e) => setNiveau(e.target.value)}
                  className="border-2 border-gray-200 rounded-lg p-2 focus:border-indigo-500 outline-none">
                  {NIVEAUX.map(n => <option key={n}>{n}</option>)}
                </select>
              </div>

              <input value={notions} onChange={(e) => setNotions(e.target.value)}
                placeholder="Notions (ex: fractions...)"
                className="w-full border-2 border-gray-200 rounded-lg p-3 mb-4 focus:border-indigo-500 outline-none" />

              <button onClick={generer} disabled={chargement || images.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl disabled:opacity-50 transition text-lg">
                {chargement ? '⏳ Génération...' : '🚀 Générer les 5 épreuves'}
              </button>

              {erreur && <div className="mt-3 bg-red-50 border-2 border-red-200 text-red-700 p-3 rounded-lg text-sm">⚠️ {erreur}</div>}
            </div>

            <div className="space-y-4">
              {epreuves.map((epreuve, i) => {
                const c = COULEURS[i] || COULEURS[COULEURS.length - 1];
                return (
                  <article key={i} className={`rounded-2xl shadow-md border-2 ${c.border} ${c.bg} overflow-hidden`}>
                    <div className="p-3 flex items-center gap-3">
                      <span className={`${c.badge} text-white text-xs font-bold px-3 py-1 rounded-full`}>Épreuve {epreuve.numero}</span>
                      <h2 className="font-bold text-gray-800 text-sm flex-1 truncate">{epreuve.titre}</h2>
                      <button onClick={() => navigator.clipboard.writeText(`${epreuve.titre}\n\n${epreuve.contenu}`)}
                        className="bg-white text-gray-700 text-xs font-semibold px-3 py-1 rounded-lg border">📋</button>
                    </div>
                    <div className="bg-white p-3 border-t">
                      <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">{epreuve.contenu}</pre>
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
