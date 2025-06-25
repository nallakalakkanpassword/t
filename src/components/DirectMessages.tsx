import React, { useState, useEffect } from 'react';
import { Send, Users, MessageCircle, Settings, Plus, Minus } from 'lucide-react';
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
  const [reviewers, setReviewers] = useState<string[]>(['']);
  const [reviewerTimer, setReviewerTimer] = useState(5);
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

  const addReviewer = () => {
    if (reviewers.length < 10) {
      setReviewers([...reviewers, '']);
    }
  };

  const removeReviewer = (index: number) => {
    if (reviewers.length > 1) {
      const newReviewers = reviewers.filter((_, i) => i !== index);
      setReviewers(newReviewers);
    }
  };

  const updateReviewer = (index: number, value: string) => {
    const newReviewers = [...reviewers];
    newReviewers[index] = value;
    setReviewers(newReviewers);
  };

  const getAvailableReviewers = (currentIndex: number) => {
    const selectedReviewers = reviewers.filter((r, i) => r && i !== currentIndex);
    return [selectedUser, ...users.map(u => u.username)].filter(u => 
      u && u !== username && !selectedReviewers.includes(u)
    );
  };

  const sendMessage = () => {
    if (!messageContent.trim() || !selectedUser) return;

    // Validate reviewers
    const validReviewers = reviewers.filter(r => r.trim());
    if (validReviewers.length === 0) {
      alert('Please select at least one reviewer');
      return;
    }

    // Check for duplicate reviewers
    const uniqueReviewers = [...new Set(validReviewers)];
    if (uniqueReviewers.length !== validReviewers.length) {
      alert('Please remove duplicate reviewers');
      return;
    }

    // Validate reviewer timer for multiple reviewers
    if (validReviewers.length > 1 && (!reviewerTimer || reviewerTimer <= 0)) {
      alert('Reviewer timer is mandatory when selecting multiple reviewers');
      return;
    }

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
      reviewers: validReviewers,
      reviewerActions: {},
      reviewerTimer: validReviewers.length > 1 ? reviewerTimer : undefined,
      currentReviewerIndex: 0,
      reviewerTimers: [],
      isTimerExpired: false,
      isLikeDislikeTimerExpired: false,
      coinAttachmentMode: coinAttachmentMode
    };

    // Initialize reviewer actions
    validReviewers.forEach(reviewer => {
      message.reviewerActions[reviewer] = {
        username: reviewer,
        liked: false,
        disliked: false,
        hasActed: false
      };
    });

    StorageUtils.saveMessage(message);
    setMessageContent('');
    setPercentage('');
    setReviewers(['']);
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

          {/* Multiple Reviewers Section */}
          <div className="bg-gray-600 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-gray-300 text-sm font-medium">
                Reviewers (1-10)
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={addReviewer}
                  disabled={reviewers.length >= 10}
                  className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
                <button
                  onClick={() => removeReviewer(reviewers.length - 1)}
                  disabled={reviewers.length <= 1}
                  className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                >
                  <Minus className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {reviewers.map((reviewer, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="text-gray-300 text-sm w-20">
                    {index === 0 ? 'Primary:' : `${index + 1}${index === 1 ? 'st' : index === 2 ? 'nd' : index === 3 ? 'rd' : 'th'}:`}
                  </span>
                  <select
                    value={reviewer}
                    onChange={(e) => updateReviewer(index, e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="">Select reviewer...</option>
                    {getAvailableReviewers(index).map(user => (
                      <option key={user} value={user}>
                        {user}
                      </option>
                    ))}
                  </select>
                  {index > 0 && (
                    <button
                      onClick={() => removeReviewer(index)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Reviewer Timer (mandatory for multiple reviewers) */}
            {reviewers.filter(r => r.trim()).length > 1 && (
              <div className="mt-4">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Reviewer Timer (minutes) *
                  <span className="text-yellow-400 text-xs ml-1">Required for multiple reviewers</span>
                </label>
                <input
                  type="number"
                  value={reviewerTimer}
                  onChange={(e) => setReviewerTimer(parseInt(e.target.value) || 5)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  min="1"
                  max="60"
                  required
                />
                <p className="text-gray-400 text-xs mt-1">
                  Time between reviewer phases. Starts after each reviewer's decision.
                </p>
              </div>
            )}
          </div>

          {/* Coin Attachment Mode Explanation */}
          <div className="bg-gray-600 p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Settings className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-medium">Game Settings</span>
            </div>
            <p className="text-gray-300 text-sm mb-2">
              <strong>Coin Mode:</strong> {coinAttachmentMode === 'different' 
                ? 'Participants can attach different amounts. Rewards distributed proportionally.'
                : 'All participants must attach the same amount. Rewards distributed equally.'
              }
            </p>
            <p className="text-gray-300 text-sm">
              <strong>Multi-Reviewer System:</strong> {reviewers.filter(r => r.trim()).length > 1 
                ? `${reviewers.filter(r => r.trim()).length} reviewers selected. Cascading review process with ${reviewerTimer}min between phases.`
                : 'Single reviewer system. Standard review process.'
              }
            </p>
          </div>

          <button
            onClick={sendMessage}
            disabled={!messageContent.trim() || !selectedUser || reviewers.filter(r => r.trim()).length === 0}
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