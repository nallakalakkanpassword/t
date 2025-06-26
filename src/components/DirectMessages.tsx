import React, { useState, useEffect } from 'react';
import { Send, Users, MessageCircle, Settings, Plus, Minus, Percent, Shield, Eye, Forward } from 'lucide-react';
import { DatabaseService } from '../services/database';
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
  const [userPercentage, setUserPercentage] = useState('');
  const [reviewers, setReviewers] = useState<string[]>(['']);
  const [reviewerTimer, setReviewerTimer] = useState(5);
  const [coinAttachmentMode, setCoinAttachmentMode] = useState<'same' | 'different'>('different');
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reviewerPermissions, setReviewerPermissions] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    loadData();
  }, [username]);

  const loadData = async () => {
    try {
      await DatabaseService.setCurrentUser(username);
      const [allUsers, userMessages] = await Promise.all([
        DatabaseService.getUsers(),
        DatabaseService.getUserMessages(username)
      ]);
      
      setUsers(allUsers.filter(u => u.username !== username));
      setMessages(userMessages.filter(m => !m.group_id));
    } catch (error) {
      console.error('Error loading data:', error);
    }
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

  const toggleReviewerPermission = (reviewer: string) => {
    setReviewerPermissions(prev => ({
      ...prev,
      [reviewer]: !prev[reviewer]
    }));
  };

  const sendMessage = async () => {
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

    try {
      const now = new Date().toISOString();
      const message: Message = {
        sender: username,
        recipient: selectedUser,
        content: messageContent,
        timestamp: now,
        attached_coins: {},
        two_letters: {},
        likes: [],
        dislikes: [],
        timer: timer,
        timer_started: now,
        like_dislike_timer: likeDislikeTimer,
        like_dislike_timer_started: now,
        percentage: percentage ? parseFloat(percentage) : undefined,
        reviewers: validReviewers,
        reviewer_actions: {},
        reviewer_timer: validReviewers.length > 1 ? reviewerTimer : undefined,
        current_reviewer_index: 0,
        reviewer_timers: [],
        is_timer_expired: false,
        is_like_dislike_timer_expired: false,
        coin_attachment_mode: coinAttachmentMode,
        user_percentages: {},
        reviewer_permissions: {},
        is_public: false
      };

      // Initialize reviewer actions
      validReviewers.forEach(reviewer => {
        message.reviewer_actions[reviewer] = {
          username: reviewer,
          liked: false,
          disliked: false,
          hasActed: false
        };
      });

      // Set reviewer permissions
      validReviewers.forEach(reviewer => {
        if (reviewerPermissions[reviewer]) {
          message.reviewer_permissions[reviewer] = {
            username: reviewer,
            hasPermission: true,
            grantedBy: username,
            grantedAt: now
          };
        }
      });

      // Set user percentage if provided
      if (userPercentage) {
        message.user_percentages[username] = {
          username: username,
          percentage: parseFloat(userPercentage),
          liked: false,
          disliked: false,
          hasActed: false
        };
      }

      await DatabaseService.saveMessage(message);
      setMessageContent('');
      setPercentage('');
      setUserPercentage('');
      setReviewers(['']);
      setReviewerPermissions({});
      await loadData();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
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
                Global Percentage
              </label>
              <input
                type="number"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                min="0"
                placeholder="0+"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Your Percentage
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={userPercentage}
                  onChange={(e) => setUserPercentage(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  min="0"
                  placeholder="0+"
                />
                <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-yellow-400" />
              </div>
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
                  {reviewer && (
                    <button
                      onClick={() => toggleReviewerPermission(reviewer)}
                      className={`p-2 rounded transition-colors ${
                        reviewerPermissions[reviewer]
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-500 text-gray-300'
                      }`}
                      title="Grant reviewer access permission"
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                  )}
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

          {/* Reviewer Permissions Display */}
          {Object.keys(reviewerPermissions).some(r => reviewerPermissions[r]) && (
            <div className="bg-green-900/20 border border-green-500 p-3 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-medium">Reviewer Permissions Granted</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(reviewerPermissions)
                  .filter(([_, hasPermission]) => hasPermission)
                  .map(([reviewer]) => (
                    <span key={reviewer} className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm">
                      {reviewer}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Game Settings Explanation */}
          <div className="bg-gray-600 p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Settings className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-medium">Game Settings</span>
            </div>
            <div className="space-y-1 text-gray-300 text-sm">
              <p>
                <strong>Coin Mode:</strong> {coinAttachmentMode === 'different' 
                  ? 'Participants can attach different amounts. Rewards distributed proportionally.'
                  : 'All participants must attach the same amount. Rewards distributed equally.'
                }
              </p>
              <p>
                <strong>Multi-Reviewer System:</strong> {reviewers.filter(r => r.trim()).length > 1 
                  ? `${reviewers.filter(r => r.trim()).length} reviewers selected. Cascading review process with ${reviewerTimer}min between phases.`
                  : 'Single reviewer system. Standard review process.'
                }
              </p>
              {userPercentage && (
                <p>
                  <strong>Your Percentage:</strong> You will receive {userPercentage}% of your attached coins back regardless of outcome.
                </p>
              )}
            </div>
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
                    onUpdate={loadData}
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