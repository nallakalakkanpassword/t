import React, { useState } from 'react';
import { Send, ArrowDownLeft, Users } from 'lucide-react';
import { StorageUtils } from '../utils/storage';
import { Transaction } from '../types';

interface SendReceiveProps {
  username: string;
  onBalanceUpdate: () => void;
}

export const SendReceive: React.FC<SendReceiveProps> = ({ username, onBalanceUpdate }) => {
  const [activeMode, setActiveMode] = useState<'send' | 'receive'>('send');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSend = () => {
    if (!recipient.trim()) {
      setError('Please enter recipient username');
      return;
    }

    const sendAmount = parseFloat(amount);
    if (isNaN(sendAmount) || sendAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const sender = StorageUtils.getUserByUsername(username);
    const recipientUser = StorageUtils.getUserByUsername(recipient);

    if (!recipientUser) {
      setError('Recipient user not found');
      return;
    }

    if (sender!.balance < sendAmount) {
      setError('Insufficient balance');
      return;
    }

    // Update balances
    StorageUtils.updateUserBalance(username, sender!.balance - sendAmount);
    StorageUtils.updateUserBalance(recipient, recipientUser.balance + sendAmount);

    // Add transaction
    const transaction: Transaction = {
      id: Date.now().toString(),
      from: username,
      to: recipient,
      amount: sendAmount,
      timestamp: new Date().toISOString(),
      type: 'send'
    };
    StorageUtils.addTransaction(transaction);

    setSuccess(`Successfully sent ${sendAmount} t coins to ${recipient}`);
    setRecipient('');
    setAmount('');
    setError('');
    onBalanceUpdate();

    setTimeout(() => setSuccess(''), 3000);
  };

  const allUsers = StorageUtils.getUsers().filter(u => u.username !== username);

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
          <Send className="w-6 h-6 text-yellow-400" />
          <span>Send t Coins</span>
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Recipient Username
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => {
                setRecipient(e.target.value);
                setError('');
                setSuccess('');
              }}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              placeholder="Enter recipient username"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Amount (t coins)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError('');
                setSuccess('');
              }}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              placeholder="Enter amount"
              min="0"
              step="0.01"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          {success && (
            <p className="text-green-400 text-sm">{success}</p>
          )}

          <button
            onClick={handleSend}
            className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white py-3 rounded-lg font-semibold hover:from-yellow-500 hover:to-orange-600 transition-all duration-300 flex items-center justify-center space-x-2"
          >
            <Send className="w-5 h-5" />
            <span>Send t Coins</span>
          </button>
        </div>
      </div>

      {/* Available Users */}
      {allUsers.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Users className="w-5 h-5 text-yellow-400" />
            <span>Available Users</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {allUsers.map((user) => (
              <button
                key={user.username}
                onClick={() => setRecipient(user.username)}
                className="bg-gray-700 hover:bg-gray-600 p-3 rounded-lg text-left transition-colors"
              >
                <div className="text-white font-medium">{user.username}</div>
                <div className="text-gray-400 text-sm flex items-center space-x-1">
                  <span className="text-yellow-400">t</span>
                  <span>{user.balance}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};