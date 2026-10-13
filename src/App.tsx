import { useState } from 'react';
import { genererEpreuves } from './lib/gemini';

function App() {
  const [images, setImages] = useState<string[]>([]);
  const [matiere, setMatiere] = useState('maths');
  const [niveau, setNiveau] = useState('CM2');
  const [notions, setNotions] = useState('fractions');
  const [resultat, setResultat] = useState('');
  const [chargement, setChargement] = useState(false);

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

  const generer = async () => {
    if (images.length === 0) return;
    setChargement(true);
    setResultat('');
    try {
      const texte = await genererEpreuves(images, matiere, niveau, notions);
      setResultat(texte);
    } catch (err) {
      setResultat('Erreur : ' + String(err));
    }
    setChargement(false);
  };

  return (
    <main className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-700">
        📚 Tuteur IA
      </h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block font-semibold mb-2">📸 Photos du cahier</label>
          <input type="file" accept="image/*" multiple onChange={ajouterImages}
            className="block w-full border rounded p-2" />
          <p className="text-sm text-gray-500 mt-1">{images.length} photo(s)</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-1">Matière</label>
            <input value={matiere} onChange={(e) => setMatiere(e.target.value)}
              className="border rounded p-2 w-full" />
          </div>
          <div>
            <label className="block font-semibold mb-1">Niveau</label>
            <input value={niveau} onChange={(e) => setNiveau(e.target.value)}
              className="border rounded p-2 w-full" />
          </div>
        </div>

        <div>
          <label className="block font-semibold mb-1">Notions</label>
          <input value={notions} onChange={(e) => setNotions(e.target.value)}
            className="border rounded p-2 w-full" />
        </div>

        <button onClick={generer} disabled={chargement || images.length === 0}
          className="bg-blue-600 text-white px-6 py-3 rounded w-full font-semibold disabled:opacity-50">
          {chargement ? '⏳ Génération...' : '🚀 Générer les 5 épreuves'}
        </button>

        {resultat && (
          <div className="mt-6 bg-gray-100 p-4 rounded whitespace-pre-wrap text-sm">
            {resultat}
          </div>
        )}
      </div>
    </main>
  );
}

export default App;
