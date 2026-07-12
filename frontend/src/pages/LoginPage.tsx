import { useState, FormEvent, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Music, Sparkles, Zap } from 'lucide-react';

const evaJokes = [
  "🎵 Keep the vibes good & passwords stronger",
  "✨ Turn up the volume on your potential",
  "⚡ Where music meets AI magic",
  "🎤 Your personal hype girl awaits",
  "💿 Vibe check: incoming",
  "🎶 Plot twist: I actually listen",
];

export function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  
  const randomJoke = useMemo(() => 
    evaJokes[Math.floor(Math.random() * evaJokes.length)],
    []
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      const { token, user, settings } = await authApi.login({ username, password });
      setAuth(user, token, settings);
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      setError(msg || 'Oops! Wrong combo. Try again?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-purple-950 dark:via-blue-950 dark:to-pink-950 flex items-center justify-center px-4 sm:px-0 relative overflow-hidden">
      {/* Animated background circles */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-20 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Header with personality */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-3xl blur-lg opacity-75 animate-pulse"></div>
              <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl shadow-xl transform hover:scale-105 transition-transform">
                <span className="text-white text-4xl font-bold">E</span>
              </div>
            </div>
          </div>
          
          <h1 className="text-5xl font-black bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent mb-3">
            eva
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-200 font-medium mb-2">
            Your Personal AI Bestie 🎤
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
            <Music className="w-4 h-4" />
            <span>{randomJoke}</span>
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/20 p-8 mb-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Username
              </label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-purple-500 dark:focus:border-purple-400 bg-gray-50 dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Keep it secret, keep it safe"
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-purple-500 dark:focus:border-purple-400 bg-gray-50 dark:bg-gray-700"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl px-4 py-3 flex items-start gap-2">
                <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 rounded-xl text-lg shadow-lg transform hover:scale-105 transition-all" 
              size="lg" 
              loading={loading}
            >
              {loading ? 'Unlocking...' : 'Let\'s Go! 🎵'}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
            <Sparkles className="w-4 h-4" />
            <span>Private, secure, and always listening</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Made with 💜 for curious minds
          </p>
        </div>
      </div>
    </div>
  );
}
