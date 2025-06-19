import React, { useState, useEffect } from 'react';
import { MessageCircle, Users, Plus, Send } from 'lucide-react';
import { StorageUtils } from '../utils/storage';
import { Group } from '../types';
import { DirectMessages } from './DirectMessages';
import { GroupMessages } from './GroupMessages';
import { CreateGroup } from './CreateGroup';

interface MessagingProps {
  username: string;
  onBalanceUpdate: () => void;
}

export const Messaging: React.FC<MessagingProps> = ({ username, onBalanceUpdate }) => {
  const [activeTab, setActiveTab] = useState<'direct' | 'groups'>('direct');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    const userGroups = StorageUtils.getUserGroups(username);
    setGroups(userGroups);
  }, [username]);

  const refreshGroups = () => {
    const userGroups = StorageUtils.getUserGroups(username);
    setGroups(userGroups);
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('direct')}
            className={`flex-1 py-4 px-6 text-center transition-colors ${
              activeTab === 'direct'
                ? 'bg-yellow-400/10 text-yellow-400 border-b-2 border-yellow-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <MessageCircle className="w-5 h-5" />
              <span>Direct Messages</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`flex-1 py-4 px-6 text-center transition-colors ${
              activeTab === 'groups'
                ? 'bg-yellow-400/10 text-yellow-400 border-b-2 border-yellow-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Group Messages ({groups.length})</span>
            </div>
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'direct' && (
            <DirectMessages username={username} onBalanceUpdate={onBalanceUpdate} />
          )}
          
          {activeTab === 'groups' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Your Groups</h3>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="bg-yellow-400 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-yellow-500 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Group</span>
                </button>
              </div>
              
              <GroupMessages 
                username={username} 
                groups={groups}
                onBalanceUpdate={onBalanceUpdate}
              />
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <CreateGroup
          username={username}
          onClose={() => setShowCreateGroup(false)}
          onGroupCreated={refreshGroups}
        />
      )}
    </div>
  );
};