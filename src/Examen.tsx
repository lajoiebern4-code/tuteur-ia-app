import { useState, useRef, useEffect } from 'react';
import { genererPlanExamen } from './lib/examen';

const MATIERES = ['Maths', 'Français', 'Sciences', 'Histoire-Géo', 'Anglais'];
const NIVEAUX = ['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6e', '5e', '4e', '3e'];

export default function Examen() {
  const [matiere, setMatiere] = useState('Maths');
  const [niveau, setNiveau] = useState('CM2');
  const [notions, setNotions] = useState('');
  const [jours, setJours] = useState(7);
  const [plan, setPlan] = useState('');
  const [chargement, setChargement] = useState(false);
  const [secondes, setSecondes] = useState(0);
  const [erreur, setErreur] = useState('');
  const planRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chargement) { setSecondes(0); return; }
    const t = setInterval(() => setSecondes((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [chargement]);

  useEffect(() => {
    if (planRef.current) planRef.current.scrollTop = planRef.current.scrollHeight;
  }, [plan]);

  const generer = async () => {
    if (!notions.trim()) { setErreur('Écris les notions à réviser'); return; }
    setChargement(true); setErreur(''); setPlan('');
    try {
      let texte = '';
      await genererPlanExamen(matiere, niveau, notions, jours,
        (t) => { texte = t; setPlan(t); }
      );
      setPlan(texte);
    } catch (err) { setErreur(String(err)); }
    setChargement(false);
  };

  const copier = async () => {
    try { await navigator.clipboard.writeText(plan); } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-orange-700 mb-2">📅 Préparation Examen</h2>
        <p className="text-sm text-gray-600 mb-4">
          Génère un planning de révision + une épreuve blanche type composition.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm font-semibold mb-1">📖 Matière</label>
            <select value={matiere} onChange={(e) => setMatiere(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-lg p-2">
              {MATIERES.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">🎓 Niveau</label>
            <select value={niveau} onChange={(e) => setNiveau(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-lg p-2">
              {NIVEAUX.map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">🎯 Notions de la composition</label>
          <input value={notions} onChange={(e) => setNotions(e.target.value)}
            placeholder="Ex: fractions et décimaux"
            className="w-full border-2 border-gray-200 rounded-lg p-2" />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">⏰ Jours avant l'examen</label>
          <select value={jours} onChange={(e) => setJours(Number(e.target.value))}
            className="w-full border-2 border-gray-200 rounded-lg p-2">
            {[1,2,3,4,5,7,10,14].map(j => <option key={j} value={j}>J-{j} ({j} jour{j>1?'s':''})</option>)}
          </select>
        </div>

        {erreur && <p className="text-red-500 text-sm mb-3">⚠️ {erreur}</p>}

        <button onClick={generer} disabled={chargement}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl disabled:opacity-50">
          {chargement ? `⚡ Préparation... ${secondes}s` : '🚀 Générer le plan d\'examen'}
        </button>
      </div>

      {plan && (
        <>
          <div className="flex gap-2">
            <button onClick={copier}
              className="flex-1 bg-white text-gray-700 font-semibold py-3 rounded-xl border-2 border-gray-200">
              📋 Copier le plan
            </button>
            <button onClick={() => window.print()}
              className="flex-1 bg-white text-gray-700 font-semibold py-3 rounded-xl border-2 border-gray-200">
              🖨️ Imprimer / PDF
            </button>
          </div>

          <div ref={planRef} className="bg-white rounded-2xl shadow-lg p-5 border-l-4 border-orange-500">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">{plan}</pre>
          </div>
        </>
      )}
    </div>
  );
}
