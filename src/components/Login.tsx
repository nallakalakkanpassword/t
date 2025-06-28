import React, { useState } from 'react';
import { Crown, LogIn } from 'lucide-react';
import { DatabaseService } from '../services/database';

interface LoginProps {
  onLogin: (username: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // First set the current user context for RLS
      await DatabaseService.setCurrentUser(username);
      
      // Check if user exists
      let user = await DatabaseService.getUserByUsername(username);
      
      if (!user) {
        // Create new user with 100 default coins
        user = {
          username,
          balance: 100,
          created_at: new Date().toISOString()
        };
        await DatabaseService.saveUser(user);
      }

      onLogin(username);
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-800 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-700">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-3 rounded-full">
              <Crown className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Royal Cats T</h1>
          <p className="text-gray-400">Enter your username to continue</p>
          <div className="flex items-center justify-center mt-2">
            <span className="text-yellow-400 font-bold text-lg">t</span>
            <span className="text-gray-400 ml-2">coin symbol</span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              placeholder="Enter your username"
              onKeyPress={(e) => e.key === 'Enter' && !loading && handleLogin()}
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white py-3 rounded-lg font-semibold hover:from-yellow-500 hover:to-orange-600 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogIn className="w-5 h-5" />
            <span>{loading ? 'Logging in...' : 'Login'}</span>
          </button>
        </div>

        <div className="mt-6 text-center text-gray-400 text-sm">
          <p>New users get 100 t coins automatically!</p>
          <p className="mt-2 text-xs">
            🔒 Powered by Supabase - Secure & Scalable
          </p>
        </div>
      </div>
    </div>
  );
};