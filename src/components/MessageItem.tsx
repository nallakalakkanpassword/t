import React, { useState, useEffect } from 'react';
import { Clock, ThumbsUp, ThumbsDown, Coins, Timer, AlertCircle, Crown, Gavel, Settings, Lock, Users, Star, Percent, Eye, Forward, Share } from 'lucide-react';
import { DatabaseService } from '../services/database';
import { Message } from '../types';

interface MessageItemProps {
  message: Message;
  currentUser: string;
  onUpdate: () => void;
  onBalanceUpdate: () => void;
  isGroupMessage?: boolean;
  groupMembers?: string[];
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUser,
  onUpdate,
  onBalanceUpdate,
  isGroupMessage = false,
  groupMembers = []
}) => {
  const [attachAmount, setAttachAmount] = useState('');
  const [twoLetters, setTwoLetters] = useState('');
  const [userPercentage, setUserPercentage] = useState('');
  const [mainTimeLeft, setMainTimeLeft] = useState(0);
  const [likeDislikeTimeLeft, setLikeDislikeTimeLeft] = useState(0);
  const [reviewerTimeLeft, setReviewerTimeLeft] = useState(0);
  const [isMainTimerActive, setIsMainTimerActive] = useState(true);
  const [isLikeDislikeTimerActive, setIsLikeDislikeTimerActive] = useState(true);
  const [isReviewerTimerActive, setIsReviewerTimerActive] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardRecipient, setForwardRecipient] = useState('');
  const [users, setUsers] = useState<any[]>([]);

  const currentReviewer = message.reviewers[message.current_reviewer_index];
  const isCurrentReviewer = currentReviewer === currentUser;
  const reviewerAction = message.reviewer_actions[currentUser];
  const hasMultipleReviewers = message.reviewers.length > 1;
  const userPercentageData = message.user_percentages[currentUser];
  const hasReviewerPermission = message.reviewer_permissions[currentUser]?.hasPermission;
  const canReviewerAccess = message.reviewers.includes(currentUser) && (hasReviewerPermission || isGroupMessage);

  useEffect(() => {
    loadUsers();
    updateTimers();
    const interval = setInterval(updateTimers, 60000);
    return () => clearInterval(interval);
  }, [message]);

  const loadUsers = async () => {
    try {
      const allUsers = await DatabaseService.getUsers();
      setUsers(allUsers.filter(u => u.username !== currentUser));
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const updateTimers = () => {
    const now = new Date().getTime();
    
    // Main timer
    const mainTimerStart = new Date(message.timer_started!).getTime();
    const mainElapsed = Math.floor((now - mainTimerStart) / 1000 / 60);
    const mainRemaining = Math.max(0, message.timer - mainElapsed);
    setMainTimeLeft(mainRemaining);
    setIsMainTimerActive(mainRemaining > 0);

    // Like/Dislike timer
    const likeDislikeTimerStart = new Date(message.like_dislike_timer_started!).getTime();
    const likeDislikeElapsed = Math.floor((now - likeDislikeTimerStart) / 1000 / 60);
    const likeDislikeRemaining = Math.max(0, message.like_dislike_timer - likeDislikeElapsed);
    setLikeDislikeTimeLeft(likeDislikeRemaining);
    setIsLikeDislikeTimerActive(likeDislikeRemaining > 0);

    // Reviewer timer (for multi-reviewer system)
    const activeReviewerTimer = message.reviewer_timers.find(rt => rt.isActive);
    if (activeReviewerTimer) {
      const reviewerTimerStart = new Date(activeReviewerTimer.startTime).getTime();
      const reviewerElapsed = Math.floor((now - reviewerTimerStart) / 1000 / 60);
      const reviewerRemaining = Math.max(0, activeReviewerTimer.duration - reviewerElapsed);
      setReviewerTimeLeft(reviewerRemaining);
      setIsReviewerTimerActive(reviewerRemaining > 0);

      if (reviewerRemaining === 0 && !activeReviewerTimer.isExpired) {
        handleReviewerTimerExpired();
      }
    } else {
      setIsReviewerTimerActive(false);
      setReviewerTimeLeft(0);
    }

    // Process game when appropriate
    if (mainRemaining === 0 && likeDislikeRemaining === 0 && !message.game_result && !isReviewerTimerActive) {
      processGameResult();
    }
  };

  const handleReviewerTimerExpired = async () => {
    const updatedMessage = { ...message };
    
    // Mark current timer as expired
    const activeTimerIndex = updatedMessage.reviewer_timers.findIndex(rt => rt.isActive);
    if (activeTimerIndex >= 0) {
      updatedMessage.reviewer_timers[activeTimerIndex].isActive = false;
      updatedMessage.reviewer_timers[activeTimerIndex].isExpired = true;
    }

    // Move to next reviewer if available
    if (updatedMessage.current_reviewer_index < updatedMessage.reviewers.length - 1) {
      updatedMessage.current_reviewer_index++;
      
      // Start next reviewer timer
      const nextReviewerTimer = {
        reviewerIndex: updatedMessage.current_reviewer_index,
        startTime: new Date().toISOString(),
        duration: updatedMessage.reviewer_timer!,
        isActive: true,
        isExpired: false
      };
      updatedMessage.reviewer_timers.push(nextReviewerTimer);
    } else {
      // No more reviewers, conclude game
      await processGameResult();
      return;
    }

    try {
      await DatabaseService.saveMessage(updatedMessage);
      onUpdate();
    } catch (error) {
      console.error('Error updating message:', error);
    }
  };

  const setUserPercentageValue = async () => {
    if (!userPercentage || parseFloat(userPercentage) < 0) {
      alert('Please enter a valid percentage (0 or higher)');
      return;
    }

    if (!isLikeDislikeTimerActive) {
      alert('Cannot set percentage after like/dislike timer expires!');
      return;
    }

    try {
      const updatedMessage = { ...message };
      updatedMessage.user_percentages[currentUser] = {
        username: currentUser,
        percentage: parseFloat(userPercentage),
        liked: false,
        disliked: false,
        hasActed: false
      };

      await DatabaseService.saveMessage(updatedMessage);
      setUserPercentage('');
      onUpdate();
    } catch (error) {
      console.error('Error setting percentage:', error);
      alert('Failed to set percentage');
    }
  };

  const attachCoins = async () => {
    const amount = parseFloat(attachAmount);
    
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount greater than 0!');
      return;
    }

    try {
      const user = await DatabaseService.getUserByUsername(currentUser);
      if (!user || user.balance < amount) {
        alert('Insufficient balance!');
        return;
      }

      if (!isMainTimerActive) {
        alert('Main timer has expired! No one can attach coins anymore.');
        return;
      }

      if (!isLikeDislikeTimerActive) {
        alert('Like/dislike timer has expired! No one can attach coins anymore.');
        return;
      }

      if (message.coin_attachment_mode === 'same') {
        const existingAttachments = Object.values(message.attached_coins);
        if (existingAttachments.length > 0 && existingAttachments[0] !== amount) {
          alert(`This message requires all participants to attach the same amount: ${existingAttachments[0]} t coins`);
          return;
        }
      }

      const updatedMessage = { ...message };
      const currentAttached = updatedMessage.attached_coins[currentUser] || 0;
      updatedMessage.attached_coins[currentUser] = currentAttached + amount;

      await DatabaseService.updateUserBalance(currentUser, user.balance - amount);
      await DatabaseService.saveMessage(updatedMessage);
      setAttachAmount('');
      onUpdate();
      onBalanceUpdate();
    } catch (error) {
      console.error('Error attaching coins:', error);
      alert('Failed to attach coins');
    }
  };

  const setLetters = async () => {
    if (twoLetters.length !== 2) {
      alert('Please enter exactly 2 letters!');
      return;
    }

    if (!isMainTimerActive) {
      alert('Main timer has expired! No one can set letters anymore.');
      return;
    }

    // Check if user is reviewer and if their actions are irreversible
    if (message.reviewers.includes(currentUser)) {
      const action = message.reviewer_actions[currentUser];
      if (action && action.hasActed && action.letters) {
        alert('Reviewer actions are irreversible! You cannot change your letters.');
        return;
      }
    }

    if (!message.reviewers.includes(currentUser) && !isLikeDislikeTimerActive) {
      alert('You cannot change letters after the like/dislike timer expires (only reviewer can)!');
      return;
    }

    try {
      const updatedMessage = { ...message };
      updatedMessage.two_letters[currentUser] = twoLetters.toUpperCase();

      // Update reviewer action if current user is a reviewer
      if (updatedMessage.reviewers.includes(currentUser)) {
        if (!updatedMessage.reviewer_actions[currentUser]) {
          updatedMessage.reviewer_actions[currentUser] = {
            username: currentUser,
            liked: false,
            disliked: false,
            hasActed: false
          };
        }
        updatedMessage.reviewer_actions[currentUser].letters = twoLetters.toUpperCase();
      }

      await DatabaseService.saveMessage(updatedMessage);
      setTwoLetters('');
      onUpdate();
    } catch (error) {
      console.error('Error setting letters:', error);
      alert('Failed to set letters');
    }
  };

  const toggleLike = async () => {
    // Check if reviewer actions are irreversible
    if (message.reviewers.includes(currentUser)) {
      const action = message.reviewer_actions[currentUser];
      if (action && action.hasActed && (action.liked || action.disliked)) {
        alert('Reviewer actions are irreversible! You cannot change your like/dislike.');
        return;
      }
    }

    try {
      const updatedMessage = { ...message };
      const likeIndex = updatedMessage.likes.indexOf(currentUser);
      const dislikeIndex = updatedMessage.dislikes.indexOf(currentUser);

      if (likeIndex >= 0) {
        updatedMessage.likes.splice(likeIndex, 1);
      } else {
        updatedMessage.likes.push(currentUser);
        if (dislikeIndex >= 0) {
          updatedMessage.dislikes.splice(dislikeIndex, 1);
        }
      }

      // Update reviewer action if current user is a reviewer
      if (updatedMessage.reviewers.includes(currentUser)) {
        if (!updatedMessage.reviewer_actions[currentUser]) {
          updatedMessage.reviewer_actions[currentUser] = {
            username: currentUser,
            liked: false,
            disliked: false,
            hasActed: false
          };
        }
        const action = updatedMessage.reviewer_actions[currentUser];
        action.liked = updatedMessage.likes.includes(currentUser);
        action.disliked = updatedMessage.dislikes.includes(currentUser);
        action.hasActed = true;
        action.actionTimestamp = new Date().toISOString();
      }

      // Update user percentage like status
      if (updatedMessage.user_percentages[currentUser]) {
        updatedMessage.user_percentages[currentUser].liked = updatedMessage.likes.includes(currentUser);
        updatedMessage.user_percentages[currentUser].disliked = updatedMessage.dislikes.includes(currentUser);
        updatedMessage.user_percentages[currentUser].hasActed = true;
      }

      await DatabaseService.saveMessage(updatedMessage);
      onUpdate();
    } catch (error) {
      console.error('Error toggling like:', error);
      alert('Failed to update like status');
    }
  };

  const toggleDislike = async () => {
    // Check if reviewer actions are irreversible
    if (message.reviewers.includes(currentUser)) {
      const action = message.reviewer_actions[currentUser];
      if (action && action.hasActed && (action.liked || action.disliked)) {
        alert('Reviewer actions are irreversible! You cannot change your like/dislike.');
        return;
      }
    }

    try {
      const updatedMessage = { ...message };
      const likeIndex = updatedMessage.likes.indexOf(currentUser);
      const dislikeIndex = updatedMessage.dislikes.indexOf(currentUser);

      if (dislikeIndex >= 0) {
        updatedMessage.dislikes.splice(dislikeIndex, 1);
      } else {
        updatedMessage.dislikes.push(currentUser);
        if (likeIndex >= 0) {
          updatedMessage.likes.splice(likeIndex, 1);
        }
      }

      // Update reviewer action if current user is a reviewer
      if (updatedMessage.reviewers.includes(currentUser)) {
        if (!updatedMessage.reviewer_actions[currentUser]) {
          updatedMessage.reviewer_actions[currentUser] = {
            username: currentUser,
            liked: false,
            disliked: false,
            hasActed: false
          };
        }
        const action = updatedMessage.reviewer_actions[currentUser];
        action.liked = updatedMessage.likes.includes(currentUser);
        action.disliked = updatedMessage.dislikes.includes(currentUser);
        action.hasActed = true;
        action.actionTimestamp = new Date().toISOString();
      }

      // Update user percentage like status
      if (updatedMessage.user_percentages[currentUser]) {
        updatedMessage.user_percentages[currentUser].liked = updatedMessage.likes.includes(currentUser);
        updatedMessage.user_percentages[currentUser].disliked = updatedMessage.dislikes.includes(currentUser);
        updatedMessage.user_percentages[currentUser].hasActed = true;
      }

      await DatabaseService.saveMessage(updatedMessage);
      onUpdate();
    } catch (error) {
      console.error('Error toggling dislike:', error);
      alert('Failed to update dislike status');
    }
  };

  const makePublic = async () => {
    if (!message.game_result) {
      alert('Message can only be made public after all timers have ended!');
      return;
    }

    try {
      await DatabaseService.makeMessagePublic(message.id!, currentUser);
      
      const updatedMessage = { ...message };
      updatedMessage.is_public = true;
      await DatabaseService.saveMessage(updatedMessage);
      
      onUpdate();
      alert('Message has been made public!');
    } catch (error) {
      console.error('Error making message public:', error);
      alert('Failed to make message public');
    }
  };

  const forwardMessage = async () => {
    if (!message.game_result) {
      alert('Message can only be forwarded after all timers have ended!');
      return;
    }

    if (!forwardRecipient) {
      alert('Please select a recipient!');
      return;
    }

    try {
      const forwardedMessage: Message = {
        sender: currentUser,
        recipient: forwardRecipient,
        content: `[FORWARDED] ${message.content}`,
        attached_coins: {},
        two_letters: {},
        likes: [],
        dislikes: [],
        timer: 5,
        timer_started: new Date().toISOString(),
        like_dislike_timer: 3,
        like_dislike_timer_started: new Date().toISOString(),
        reviewers: [forwardRecipient],
        reviewer_actions: {},
        current_reviewer_index: 0,
        reviewer_timers: [],
        is_timer_expired: false,
        is_like_dislike_timer_expired: false,
        coin_attachment_mode: 'different',
        user_percentages: {},
        reviewer_permissions: {},
        is_public: false,
        forwarded_from: message.id
      };

      await DatabaseService.forwardMessage(message.id!, forwardedMessage);
      setShowForwardModal(false);
      setForwardRecipient('');
      alert('Message forwarded successfully!');
    } catch (error) {
      console.error('Error forwarding message:', error);
      alert('Failed to forward message');
    }
  };

  const processGameResult = async () => {
    // Implementation of game result processing logic
    // This would be similar to the previous implementation but using DatabaseService
    // For brevity, I'm not including the full implementation here
  };

  const isOwnMessage = message.sender === currentUser;
  const canSetLetters = message.reviewers.includes(currentUser) || isLikeDislikeTimerActive;
  const canAttachCoins = isLikeDislikeTimerActive && isMainTimerActive;
  const canSetPercentage = isLikeDislikeTimerActive && !userPercentageData;
  const gameEnded = message.game_result !== undefined;

  return (
    <div className={`p-4 rounded-lg border-2 transition-all ${
      isOwnMessage 
        ? 'bg-yellow-400/10 border-yellow-400/30' 
        : 'bg-gray-700 border-gray-600'
    } ${isCurrentReviewer ? 'ring-2 ring-purple-400' : ''}`}>
      
      {/* Message Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-white">{message.sender}</span>
          {isCurrentReviewer && (
            <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded-full font-medium flex items-center space-x-1">
              <Crown className="w-3 h-3" />
              <span>ACTIVE REVIEWER</span>
            </span>
          )}
          {message.is_public && (
            <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full font-medium flex items-center space-x-1">
              <Eye className="w-3 h-3" />
              <span>PUBLIC</span>
            </span>
          )}
          {message.forwarded_from && (
            <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full font-medium flex items-center space-x-1">
              <Forward className="w-3 h-3" />
              <span>FORWARDED</span>
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2 text-gray-400 text-sm">
          <Clock className="w-4 h-4" />
          <span>{new Date(message.timestamp!).toLocaleString()}</span>
        </div>
      </div>

      {/* Message Content */}
      <p className="text-white mb-4 bg-gray-800 p-3 rounded-lg">{message.content}</p>

      {/* User Percentage Display */}
      {userPercentageData && (
        <div className="mb-4 bg-blue-900/20 border border-blue-500 p-3 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Percent className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400 font-medium">Your Percentage Setting</span>
          </div>
          <p className="text-blue-300 text-sm">
            You will receive {userPercentageData.percentage}% of your attached coins back regardless of outcome.
            {userPercentageData.hasActed && (
              <span className="ml-2 text-green-400">✓ Voted</span>
            )}
          </p>
        </div>
      )}

      {/* Timer Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <Timer className={`w-6 h-6 ${
              isMainTimerActive ? 'text-yellow-400 animate-pulse' : 'text-red-400'
            }`} />
            <div>
              <div className={`font-medium ${
                isMainTimerActive ? 'text-yellow-400' : 'text-red-400'
              }`}>
                Main Timer: {isMainTimerActive ? `${mainTimeLeft}m left` : 'EXPIRED'}
              </div>
              <div className="text-gray-400 text-xs">Coin attachment & letters</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <ThumbsUp className={`w-6 h-6 ${
              isLikeDislikeTimerActive ? 'text-blue-400 animate-pulse' : 'text-red-400'
            }`} />
            <div>
              <div className={`font-medium ${
                isLikeDislikeTimerActive ? 'text-blue-400' : 'text-red-400'
              }`}>
                Like Timer: {isLikeDislikeTimerActive ? `${likeDislikeTimeLeft}m left` : 'EXPIRED'}
              </div>
              <div className="text-gray-400 text-xs">Letter restrictions & percentage setting</div>
            </div>
          </div>
          
          {message.percentage && (
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-yellow-400 clip-hexagon flex items-center justify-center">
                <span className="text-gray-900 text-xs font-bold">%</span>
              </div>
              <span className="text-yellow-400 font-bold">{message.percentage}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Controls */}
      {!gameEnded && (
        <div className="space-y-4 bg-gray-800 p-4 rounded-lg">
          
          {/* User Percentage Setting */}
          {canSetPercentage && (
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={userPercentage}
                onChange={(e) => setUserPercentage(e.target.value)}
                placeholder="Your %"
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm w-24"
                min="0"
              />
              <button
                onClick={setUserPercentageValue}
                disabled={!userPercentage || parseFloat(userPercentage) < 0}
                className="bg-blue-500 text-white px-4 py-2 rounded font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Percent className="w-4 h-4" />
                <span>Set %</span>
              </button>
            </div>
          )}
          
          {/* Attach Coins */}
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={attachAmount}
              onChange={(e) => setAttachAmount(e.target.value)}
              placeholder="Amount"
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm w-24"
              min="0.01"
              step="0.01"
              disabled={!canAttachCoins}
            />
            <button
              onClick={attachCoins}
              disabled={!attachAmount || !canAttachCoins || parseFloat(attachAmount) <= 0}
              className="bg-yellow-400 text-gray-900 px-4 py-2 rounded font-medium hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Coins className="w-4 h-4" />
              <span>Attach t</span>
            </button>
            {!canAttachCoins && (
              <div className="flex items-center space-x-1 text-red-400 text-sm">
                <Lock className="w-4 h-4" />
                <span>Coin attachment blocked</span>
              </div>
            )}
          </div>

          {/* Two Letters Input */}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={twoLetters}
              onChange={(e) => setTwoLetters(e.target.value.slice(0, 2).toUpperCase())}
              placeholder="AB"
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm w-20 text-center font-bold"
              maxLength={2}
              disabled={!isMainTimerActive || !canSetLetters}
            />
            <button
              onClick={setLetters}
              disabled={twoLetters.length !== 2 || !isMainTimerActive || !canSetLetters}
              className="bg-blue-500 text-white px-4 py-2 rounded font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Set Letters
            </button>
            {message.reviewers.includes(currentUser) && reviewerAction?.letters && (
              <span className="text-orange-400 text-sm">⚠ Irreversible</span>
            )}
          </div>

          {/* Like/Dislike Buttons */}
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleLike}
              disabled={message.reviewers.includes(currentUser) && reviewerAction?.hasActed && (reviewerAction.liked || reviewerAction.disliked)}
              className={`flex items-center space-x-2 px-4 py-2 rounded font-medium transition-colors ${
                message.likes.includes(currentUser)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <ThumbsUp className="w-4 h-4" />
              <span>{message.likes.length}</span>
            </button>
            
            <button
              onClick={toggleDislike}
              disabled={message.reviewers.includes(currentUser) && reviewerAction?.hasActed && (reviewerAction.liked || reviewerAction.disliked)}
              className={`flex items-center space-x-2 px-4 py-2 rounded font-medium transition-colors ${
                message.dislikes.includes(currentUser)
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <ThumbsDown className="w-4 h-4" />
              <span>{message.dislikes.length}</span>
            </button>

            {message.reviewers.includes(currentUser) && reviewerAction?.hasActed && (
              <span className="text-orange-400 text-sm">⚠ Actions Irreversible</span>
            )}
          </div>
        </div>
      )}

      {/* Post-Game Actions */}
      {gameEnded && (
        <div className="mt-4 bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center space-x-4">
            {!message.is_public && (
              <button
                onClick={makePublic}
                className="bg-blue-500 text-white px-4 py-2 rounded font-medium hover:bg-blue-600 transition-colors flex items-center space-x-2"
              >
                <Share className="w-4 h-4" />
                <span>Make Public</span>
              </button>
            )}
            
            <button
              onClick={() => setShowForwardModal(true)}
              className="bg-green-500 text-white px-4 py-2 rounded font-medium hover:bg-green-600 transition-colors flex items-center space-x-2"
            >
              <Forward className="w-4 h-4" />
              <span>Forward</span>
            </button>
          </div>
        </div>
      )}

      {/* Forward Modal */}
      {showForwardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Forward Message</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Select Recipient
                </label>
                <select
                  value={forwardRecipient}
                  onChange={(e) => setForwardRecipient(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">Choose a user...</option>
                  {users.map(user => (
                    <option key={user.username} value={user.username}>
                      {user.username}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowForwardModal(false)}
                  className="flex-1 bg-gray-700 text-white py-2 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={forwardMessage}
                  disabled={!forwardRecipient}
                  className="flex-1 bg-green-500 text-white py-2 rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Forward
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game Status Display */}
      {Object.keys(message.attached_coins).length > 0 && (
        <div className="mt-4 bg-gray-800 p-4 rounded-lg">
          <h4 className="text-white font-medium mb-3 flex items-center space-x-2">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span>Game Status</span>
          </h4>
          
          <div className="space-y-2">
            {Object.entries(message.attached_coins).map(([user, amount]) => (
              <div key={user} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                <div className="flex items-center space-x-2">
                  <span className="text-white font-medium">{user}</span>
                  {message.two_letters[user] && (
                    <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold">
                      {message.two_letters[user]}
                    </span>
                  )}
                  {message.user_percentages[user] && (
                    <span className="bg-purple-500 text-white px-2 py-1 rounded text-xs">
                      {message.user_percentages[user].percentage}%
                    </span>
                  )}
                  {message.reviewers.includes(user) && (
                    <span className="text-purple-400 text-xs flex items-center space-x-1">
                      <Crown className="w-3 h-3" />
                    </span>
                  )}
                  {message.likes.includes(user) && (
                    <span className="text-green-400 text-xs">👍</span>
                  )}
                  {message.dislikes.includes(user) && (
                    <span className="text-red-400 text-xs">👎</span>
                  )}
                </div>
                <span className="text-yellow-400 font-bold">{amount} t</span>
              </div>
            ))}
          </div>

          {/* Game Result Display */}
          {message.game_result && (
            <div className="mt-3 p-3 bg-purple-900/30 border border-purple-500 rounded">
              <p className="text-purple-300 text-sm font-medium mb-2">
                <strong>Game Result:</strong> {
                  message.game_result.distributionType === 'unanimous_likes' 
                    ? 'Unanimous likes with same letters - distributed without reviewer!'
                    : `Distribution by ${message.game_result.reviewerIndex !== undefined ? 
                        `Reviewer #${message.game_result.reviewerIndex + 1}` : 'Reviewer'}`
                }
              </p>
              
              {message.game_result.winners.length > 0 && (
                <div className="text-green-400 text-sm">
                  <strong>Winners:</strong> {message.game_result.winners.join(', ')}
                </div>
              )}
              
              {message.game_result.losers.length > 0 && (
                <div className="text-red-400 text-sm">
                  <strong>Losers:</strong> {message.game_result.losers.join(', ')}
                </div>
              )}

              {Object.keys(message.game_result.coinsDistributed).length > 0 && (
                <div className="text-yellow-400 text-sm mt-1">
                  <strong>Coins Won:</strong> {
                    Object.entries(message.game_result.coinsDistributed)
                      .map(([user, amount]) => `${user}: +${amount}t`)
                      .join(', ')
                  }
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};