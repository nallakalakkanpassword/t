import React, { useState, useEffect } from 'react';
import { X, Plus, Users, Search } from 'lucide-react';
import { DatabaseService } from '../services/database';
import { Group } from '../types';

interface CreateGroupProps {
  username: string;
  onClose: () => void;
  onGroupCreated: () => void;
}

export const CreateGroup: React.FC<CreateGroupProps> = ({ username, onClose, onGroupCreated }) => {
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const users = await DatabaseService.getUsers();
        setAllUsers(users.filter(u => u.username !== username));
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };

    loadUsers();
  }, [username]);

  const filteredUsers = allUsers.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleMember = (memberUsername: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberUsername)
        ? prev.filter(m => m !== memberUsername)
        : [...prev, memberUsername]
    );
  };

  const selectAllUsers = () => {
    setSelectedMembers(filteredUsers.map(u => u.username));
  };

  const clearAllUsers = () => {
    setSelectedMembers([]);
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      setError('Please enter a group name');
      return;
    }

    if (selectedMembers.length === 0) {
      setError('Please select at least one member');
      return;
    }

    try {
      const group: Group = {
        name: groupName.trim(),
        members: [username, ...selectedMembers],
        created_by: username,
        created_at: new Date().toISOString()
      };

      await DatabaseService.saveGroup(group);
      onGroupCreated();
      onClose();
    } catch (error) {
      console.error('Error creating group:', error);
      setError('Failed to create group. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Users className="w-5 h-5 text-yellow-400" />
            <span>Create New Group</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Group Name */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Group Name *
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => {
                setGroupName(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="Enter group name"
              maxLength={50}
            />
          </div>

          {/* Member Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-gray-300 text-sm font-medium">
                Select Members ({selectedMembers.length} selected)
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={selectAllUsers}
                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={clearAllUsers}
                  className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-500 transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="Search users..."
              />
            </div>

            {/* User List */}
            <div className="max-h-60 overflow-y-auto space-y-2 border border-gray-600 rounded-lg p-2">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-4 text-gray-400">
                  {searchTerm ? 'No users found matching your search' : 'No other users available'}
                </div>
              ) : (
                filteredUsers.map(user => (
                  <label
                    key={user.username}
                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedMembers.includes(user.username)
                        ? 'bg-yellow-400/20 border border-yellow-400/50'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(user.username)}
                      onChange={() => toggleMember(user.username)}
                      className="w-4 h-4 text-yellow-400 bg-gray-600 border-gray-500 rounded focus:ring-yellow-400"
                    />
                    <div className="flex-1">
                      <div className="text-white font-medium">{user.username}</div>
                      <div className="text-gray-400 text-sm flex items-center space-x-1">
                        <span className="text-yellow-400 font-bold">t</span>
                        <span>{user.balance}</span>
                        <span>•</span>
                        <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {selectedMembers.includes(user.username) && (
                      <div className="text-yellow-400">
                        ✓
                      </div>
                    )}
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Selected Members Preview */}
          {selectedMembers.length > 0 && (
            <div className="bg-gray-700 p-3 rounded-lg">
              <p className="text-gray-300 text-sm mb-2">Selected Members:</p>
              <div className="flex flex-wrap gap-2">
                {selectedMembers.map(member => (
                  <span
                    key={member}
                    className="bg-yellow-400/20 text-yellow-400 px-2 py-1 rounded text-sm flex items-center space-x-1"
                  >
                    <span>{member}</span>
                    <button
                      onClick={() => toggleMember(member)}
                      className="text-yellow-400 hover:text-yellow-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-700 text-white py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={createGroup}
              disabled={!groupName.trim() || selectedMembers.length === 0}
              className="flex-1 bg-yellow-400 text-gray-900 py-3 rounded-lg font-medium hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Group</span>
            </button>
          </div>

          {/* Group Preview */}
          {groupName.trim() && selectedMembers.length > 0 && (
            <div className="bg-gray-700 p-4 rounded-lg border-l-4 border-yellow-400">
              <h4 className="text-white font-medium mb-2">Group Preview:</h4>
              <p className="text-gray-300 text-sm">
                <strong>Name:</strong> {groupName.trim()}
              </p>
              <p className="text-gray-300 text-sm">
                <strong>Total Members:</strong> {selectedMembers.length + 1} (including you)
              </p>
              <p className="text-gray-300 text-sm">
                <strong>Creator:</strong> {username}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};