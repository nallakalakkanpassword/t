import React, { useState, useEffect } from 'react';
import { Send, Users, MessageCircle, Settings } from 'lucide-react';
import { StorageUtils } from '../utils/storage';
import { Message, User } from '../types';
import { MessageItem } from './MessageItem';

interface DirectMessagesProps {
  username: string;
  onBalanceUpdate: () => void;
}

export const DirectMessages: React.FC<DirectMessagesProps> = ({ username, onBalanceUpdate }) => {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [messageContent, setMessageContent] = useState('');
  const [timer, setTimer] = useState(5);
  const [likeDislikeTimer, setLikeDislikeTimer] = useState(3);
  const [percentage, setPercentage] = useState('');
  const [reviewer, setReviewer] = useState('');
  const [coinAttachmentMode, setCoinAttachmentMode] = useState<'same' | 'different'>('different');
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const allUsers = StorageUtils.getUsers().filter(u => u.username !== username);
    setUsers(allUsers);
    refreshMessages();
  }, [username]);

  const refreshMessages = () => {
    const userMessages = StorageUtils.getUserMessages(username)
      .filter(m => !m.groupId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setMessages(userMessages);
  };

  const sendMessage = () => {
    if (!messageContent.trim() || !selectedUser) return;

    const now = new Date().toISOString();
    const message: Message = {
      id: Date.now().toString(),
      sender: username,
      recipient: selectedUser,
      content: messageContent,
      timestamp: now,
      attachedCoins: {},
      twoLetters: {},
      likes: [],
      dislikes: [],
      timer: timer,
      timerStarted: now,
      likeDislikeTimer: likeDislikeTimer,
      likeDislikeTimerStarted: now,
      percentage: percentage ? parseFloat(percentage) : undefined,
      reviewer: reviewer || undefined,
      isTimerExpired: false,
      isLikeDislikeTimerExpired: false,
      coinAttachmentMode: coinAttachmentMode
    };

    StorageUtils.saveMessage(message);
    setMessageContent('');
    setPercentage('');
    setReviewer('');
    refreshMessages();
  };

  const getConversationPartner = (message: Message): string => {
    return message.sender === username ? message.recipient! : message.sender;
  };

  // Group messages by conversation partner
  const conversations = messages.reduce((acc, message) => {
    const partner = getConversationPartner(message);
    if (!acc[partner]) acc[partner] = [];
    acc[partner].push(message);
    return acc;
  }, {} as Record<string, Message[]>);

  return (
    <div className="space-y-6">
      {/* Send New Message */}
      <div className="bg-gray-700 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-4">Send New Message</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Select Recipient
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="">Choose a user...</option>
              {users.map(user => (
                <option key={user.username} value={user.username}>
                  {user.username}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Message
            </label>
            <textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              rows={3}
              placeholder="Type your message..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Main Timer (minutes)
              </label>
              <input
                type="number"
                value={timer}
                onChange={(e) => setTimer(parseInt(e.target.value) || 5)}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                min="1"
                max="60"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Like Timer (minutes)
              </label>
              <input
                type="number"
                value={likeDislikeTimer}
                onChange={(e) => setLikeDislikeTimer(parseInt(e.target.value) || 3)}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                min="1"
                max="60"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Percentage (optional)
              </label>
              <input
                type="number"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                min="0"
                max="100"
                placeholder="0-100"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Reviewer (optional)
              </label>
              <select
                value={reviewer}
                onChange={(e) => setReviewer(e.target.value)}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="">No reviewer</option>
                {selectedUser && <option value={selectedUser}>{selectedUser}</option>}
                <option value={username}>{username} (you)</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Coin Attachment Mode
              </label>
              <select
                value={coinAttachmentMode}
                onChange={(e) => setCoinAttachmentMode(e.target.value as 'same' | 'different')}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="different">Different Amounts</option>
                <option value="same">Same Amount Only</option>
              </select>
            </div>
          </div>

          {/* Coin Attachment Mode Explanation */}
          <div className="bg-gray-600 p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Settings className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-medium">Coin Attachment Mode</span>
            </div>
            <p className="text-gray-300 text-sm">
              {coinAttachmentMode === 'different' 
                ? 'Participants can attach different amounts of t coins. Rewards will be distributed proportionally based on attachment amounts.'
                : 'All participants must attach the same amount of t coins. Rewards will be distributed equally among winners.'
              }
            </p>
          </div>

          <button
            onClick={sendMessage}
            disabled={!messageContent.trim() || !selectedUser}
            className="w-full bg-yellow-400 text-gray-900 py-2 rounded-lg font-medium hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Send Message</span>
          </button>
        </div>
      </div>

      {/* Conversations */}
      <div className="space-y-4">
        {Object.keys(conversations).length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No messages yet</p>
          </div>
        ) : (
          Object.entries(conversations).map(([partner, partnerMessages]) => (
            <div key={partner} className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-4 flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Conversation with {partner}</span>
              </h4>
              <div className="space-y-3">
                {partnerMessages.map(message => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    currentUser={username}
                    onUpdate={refreshMessages}
                    onBalanceUpdate={onBalanceUpdate}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};