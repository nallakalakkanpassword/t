import React, { useState, useEffect } from 'react';
import { Send, MessageCircle, Users } from 'lucide-react';
import { StorageUtils } from '../utils/storage';
import { Message, Group } from '../types';
import { MessageItem } from './MessageItem';

interface GroupMessagesProps {
  username: string;
  groups: Group[];
  onBalanceUpdate: () => void;
}

export const GroupMessages: React.FC<GroupMessagesProps> = ({ username, groups, onBalanceUpdate }) => {
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [messageContent, setMessageContent] = useState('');
  const [timer, setTimer] = useState(5);
  const [likeDislikeTimer, setLikeDislikeTimer] = useState(3);
  const [percentage, setPercentage] = useState('');
  const [reviewer, setReviewer] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    refreshMessages();
  }, [username]);

  const refreshMessages = () => {
    const groupMessages = StorageUtils.getUserMessages(username)
      .filter(m => m.groupId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setMessages(groupMessages);
  };

  const sendMessage = () => {
    if (!messageContent.trim() || !selectedGroup) return;

    const now = new Date().toISOString();
    const message: Message = {
      id: Date.now().toString(),
      sender: username,
      groupId: selectedGroup,
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
      isLikeDislikeTimerExpired: false
    };

    StorageUtils.saveMessage(message);
    setMessageContent('');
    setPercentage('');
    setReviewer('');
    refreshMessages();
  };

  const getSelectedGroupMembers = () => {
    const group = groups.find(g => g.id === selectedGroup);
    return group ? group.members.filter(m => m !== username) : [];
  };

  // Group messages by group
  const groupedMessages = messages.reduce((acc, message) => {
    if (!message.groupId) return acc;
    if (!acc[message.groupId]) acc[message.groupId] = [];
    acc[message.groupId].push(message);
    return acc;
  }, {} as Record<string, Message[]>);

  return (
    <div className="space-y-6">
      {groups.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No groups yet. Create a group to start messaging!</p>
        </div>
      ) : (
        <>
          {/* Send New Group Message */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-4">Send Group Message</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Select Group
                </label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">Choose a group...</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.members.length} members)
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
                    Percentage
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={percentage}
                      onChange={(e) => setPercentage(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      min="0"
                      max="100"
                      placeholder="0-100"
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-yellow-400 clip-hexagon"></div>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Reviewer
                  </label>
                  <select
                    value={reviewer}
                    onChange={(e) => setReviewer(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="">Select reviewer</option>
                    {getSelectedGroupMembers().map(member => (
                      <option key={member} value={member}>{member}</option>
                    ))}
                    <option value={username}>{username} (you)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={sendMessage}
                disabled={!messageContent.trim() || !selectedGroup}
                className="w-full bg-yellow-400 text-gray-900 py-2 rounded-lg font-medium hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Send to Group</span>
              </button>
            </div>
          </div>

          {/* Group Messages */}
          <div className="space-y-4">
            {Object.keys(groupedMessages).length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No group messages yet</p>
              </div>
            ) : (
              Object.entries(groupedMessages).map(([groupId, groupMessages]) => {
                const group = groups.find(g => g.id === groupId);
                if (!group) return null;

                return (
                  <div key={groupId} className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-4 flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>{group.name}</span>
                      <span className="text-gray-400 text-sm">({group.members.length} members)</span>
                    </h4>
                    <div className="space-y-3">
                      {groupMessages.map(message => (
                        <MessageItem
                          key={message.id}
                          message={message}
                          currentUser={username}
                          onUpdate={refreshMessages}
                          onBalanceUpdate={onBalanceUpdate}
                          isGroupMessage={true}
                          groupMembers={group.members}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};