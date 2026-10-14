import { useState } from 'react';
import { supabase } from './lib/supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('✅ Compte créé ! Vérifie ton email pour confirmer.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setMessage('❌ ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold text-indigo-800 text-center mb-6">
          📚 Tuteur IA
        </h1>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-lg font-semibold transition ${
              mode === 'login' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Connexion
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 rounded-lg font-semibold transition ${
              mode === 'signup' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Inscription
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-indigo-500 outline-none"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-indigo-500 outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition"
          >
            {loading ? '⏳...' : mode === 'login' ? '🔑 Se connecter' : '✨ Créer un compte'}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-sm text-center text-gray-700 bg-gray-50 p-3 rounded-lg">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
