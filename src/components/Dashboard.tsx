import React, { useState, useEffect } from 'react';
import { Crown, Send, ArrowDownLeft, History, MessageCircle, Users, LogOut, Coins, Eye } from 'lucide-react';
import { DatabaseService } from '../services/database';
import { User } from '../types';
import { SendReceive } from './SendReceive';
import { TransactionHistory } from './TransactionHistory';
import { Messaging } from './Messaging';
import { PublicMessages } from './PublicMessages';

interface DashboardProps {
  username: string;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ username, onLogout }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'wallet' | 'history' | 'messages' | 'public'>('wallet');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
  }, [username]);

  const loadUser = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Set current user context first
      await DatabaseService.setCurrentUser(username);
      
      // Try to get existing user
      let userData = await DatabaseService.getUserByUsername(username);
      
      // If user doesn't exist, create them
      if (!userData) {
        userData = {
          username,
          balance: 100,
          created_at: new Date().toISOString()
        };
        
        // Save the new user
        userData = await DatabaseService.saveUser(userData);
      }
      
      setUser(userData);
    } catch (error) {
      console.error('Error loading user:', error);
      setError('Failed to load user data. Please try logging in again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error}</div>
          <button
            onClick={onLogout}
            className="bg-yellow-400 text-gray-900 px-6 py-2 rounded-lg font-medium hover:bg-yellow-500 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">User not found</div>
          <button
            onClick={onLogout}
            className="bg-yellow-400 text-gray-900 px-6 py-2 rounded-lg font-medium hover:bg-yellow-500 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'wallet', label: 'Wallet', icon: Coins },
    { id: 'history', label: 'History', icon: History },
    { id: 'messages', label: 'Messages', icon: MessageCircle },
    { id: 'public', label: 'Public', icon: Eye }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-800">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-2 rounded-full">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Royal Cats T</h1>
              <p className="text-gray-400 text-sm">Welcome, {username}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="bg-gray-700 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-yellow-400 font-bold">t</span>
                <span className="text-white font-semibold">{user.balance}</span>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-yellow-400 text-yellow-400'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-4">
        {activeTab === 'wallet' && (
          <SendReceive username={username} onBalanceUpdate={loadUser} />
        )}
        {activeTab === 'history' && (
          <TransactionHistory username={username} />
        )}
        {activeTab === 'messages' && (
          <Messaging username={username} onBalanceUpdate={loadUser} />
        )}
        {activeTab === 'public' && (
          <PublicMessages username={username} />
        )}
      </div>
    </div>
  );
};