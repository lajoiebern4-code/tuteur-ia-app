import { useState, useRef, useEffect } from 'react';
import { envoyerMessageCoach } from './lib/coach';
import type { MessageCoach } from './lib/coach';
import { supabase, getVisiteurId } from './lib/supabase';

const MATIERES = ['Maths', 'Français', 'Sciences'];
const NIVEAUX = ['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6e'];

export default function Coach() {
  const [matiere, setMatiere] = useState('Maths');
  const [niveau, setNiveau] = useState('CM2');
  const [notions, setNotions] = useState('');
  const [demarre, setDemarre] = useState(false);
  const [messages, setMessages] = useState<MessageCoach[]>([]);
  const [saisie, setSaisie] = useState('');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const demarrer = async () => {
    if (!notions.trim()) { setErreur('Écris ce que tu veux travailler'); return; }
    setDemarre(true); setErreur(''); setChargement(true);
    try {
      let texte = '';
      await envoyerMessageCoach(
        [{ role: 'user', texte: 'Bonjour ! Commence.' }],
        matiere, niveau, notions,
        (t) => { texte = t; setMessages([{ role: 'model', texte: t }]); }
      );
      setMessages([{ role: 'model', texte }]);
    } catch (err) {
      setErreur(String(err)); setDemarre(false);
    }
    setChargement(false);
  };

  const envoyer = async () => {
    if (!saisie.trim() || chargement) return;
    const msg: MessageCoach = { role: 'user', texte: saisie.trim() };
    const hist = [...messages, msg];
    setMessages(hist); setSaisie(''); setChargement(true);
    try {
      let texte = '';
      await envoyerMessageCoach(hist, matiere, niveau, notions,
        (t) => { texte = t; setMessages([...hist, { role: 'model', texte: t }]); }
      );
      const final = [...hist, { role: 'model' as const, texte }];
      setMessages(final);
      if (final.length >= 4) {
        await supabase.from('sessions_coach').insert({
          visiteur_id: getVisiteurId(), matiere, niveau, notions, messages: final,
        });
      }
    } catch (err) { setErreur(String(err)); }
    setChargement(false);
  };

  const recommencer = () => { setDemarre(false); setMessages([]); setErreur(''); };

  if (!demarre) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-indigo-800 mb-4">🎓 Coach IA</h2>
        <p className="text-sm text-gray-600 mb-4">L'IA discute avec l'enfant et l'accompagne pas à pas.</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Matière</label>
            <select value={matiere} onChange={(e) => setMatiere(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-lg p-2">
              {MATIERES.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Niveau</label>
            <select value={niveau} onChange={(e) => setNiveau(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-lg p-2">
              {NIVEAUX.map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">Notions</label>
          <input value={notions} onChange={(e) => setNotions(e.target.value)}
            placeholder="Ex: les fractions"
            className="w-full border-2 border-gray-200 rounded-lg p-2" />
        </div>
        {erreur && <p className="text-red-500 text-sm mb-3">{erreur}</p>}
        <button onClick={demarrer}
          className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl">
          🚀 Démarrer
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg flex flex-col" style={{ height: '70vh' }}>
      <div className="bg-purple-600 text-white px-4 py-3 flex justify-between">
        <span className="font-bold">🎓 {matiere} • {niveau}</span>
        <button onClick={recommencer} className="text-xs bg-purple-700 px-2 rounded">↻</button>
      </div>
      <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
              m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border-2 border-purple-200'
            }`}>
              {m.texte}
            </div>
          </div>
        ))}
        {chargement && <p className="text-xs text-gray-400 italic">✍️ écrit...</p>}
      </div>
      <div className="border-t-2 p-2 flex gap-2">
        <input value={saisie} onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && envoyer()}
          placeholder="Ta réponse..." disabled={chargement}
          className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-2" />
        <button onClick={envoyer} disabled={chargement || !saisie.trim()}
          className="bg-purple-600 text-white px-4 rounded-lg disabled:opacity-50">➤</button>
      </div>
    </div>
  );
}
