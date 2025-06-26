import React, { useState, useEffect } from 'react';
import { Eye, MessageCircle, Clock, Users } from 'lucide-react';
import { DatabaseService } from '../services/database';
import { PublicMessage } from '../types';

interface PublicMessagesProps {
  username: string;
}

export const PublicMessages: React.FC<PublicMessagesProps> = ({ username }) => {
  const [publicMessages, setPublicMessages] = useState<PublicMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublicMessages();
  }, []);

  const loadPublicMessages = async () => {
    try {
      await DatabaseService.setCurrentUser(username);
      const messages = await DatabaseService.getPublicMessages();
      setPublicMessages(messages);
    } catch (error) {
      console.error('Error loading public messages:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-400">Loading public messages...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
          <Eye className="w-6 h-6 text-blue-400" />
          <span>Public Messages</span>
        </h2>

        {publicMessages.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No public messages yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {publicMessages.map((publicMessage) => {
              const message = publicMessage.message;
              if (!message) return null;

              return (
                <div key={publicMessage.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-white">{message.sender}</span>
                      <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                        PUBLIC
                      </span>
                      {message.group_id && (
                        <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded-full flex items-center space-x-1">
                          <Users className="w-3 h-3" />
                          <span>GROUP</span>
                        </span>
                      )}
                    </div>
                    <div className="text-gray-400 text-sm">
                      Made public by {publicMessage.made_public_by}
                    </div>
                  </div>

                  <p className="text-white mb-3 bg-gray-800 p-3 rounded-lg">
                    {message.content}
                  </p>

                  <div className="flex items-center justify-between text-gray-400 text-sm">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>Sent: {new Date(message.timestamp!).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Eye className="w-4 h-4" />
                        <span>Public: {new Date(publicMessage.made_public_at!).toLocaleString()}</span>
                      </div>
                    </div>
                    
                    {message.game_result && (
                      <div className="text-green-400 text-sm">
                        Game Completed
                      </div>
                    )}
                  </div>

                  {/* Game Summary */}
                  {message.game_result && (
                    <div className="mt-3 p-3 bg-purple-900/20 border border-purple-500 rounded">
                      <div className="text-purple-300 text-sm">
                        <strong>Result:</strong> {
                          message.game_result.distributionType === 'unanimous_likes' 
                            ? 'Unanimous decision'
                            : 'Reviewer decision'
                        }
                      </div>
                      {message.game_result.winners.length > 0 && (
                        <div className="text-green-400 text-sm">
                          <strong>Winners:</strong> {message.game_result.winners.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};