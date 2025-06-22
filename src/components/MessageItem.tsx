import React, { useState, useEffect } from 'react';
import { Clock, ThumbsUp, ThumbsDown, Coins, Timer, AlertCircle, Crown, Gavel } from 'lucide-react';
import { StorageUtils } from '../utils/storage';
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
  const [mainTimeLeft, setMainTimeLeft] = useState(0);
  const [likeDislikeTimeLeft, setLikeDislikeTimeLeft] = useState(0);
  const [isMainTimerActive, setIsMainTimerActive] = useState(true);
  const [isLikeDislikeTimerActive, setIsLikeDislikeTimerActive] = useState(true);

  useEffect(() => {
    const updateTimers = () => {
      const now = new Date().getTime();
      
      // Main timer
      const mainTimerStart = new Date(message.timerStarted).getTime();
      const mainElapsed = Math.floor((now - mainTimerStart) / 1000 / 60);
      const mainRemaining = Math.max(0, message.timer - mainElapsed);
      setMainTimeLeft(mainRemaining);
      setIsMainTimerActive(mainRemaining > 0);

      // Like/Dislike timer
      const likeDislikeTimerStart = new Date(message.likeDislikeTimerStarted).getTime();
      const likeDislikeElapsed = Math.floor((now - likeDislikeTimerStart) / 1000 / 60);
      const likeDislikeRemaining = Math.max(0, message.likeDislikeTimer - likeDislikeElapsed);
      setLikeDislikeTimeLeft(likeDislikeRemaining);
      setIsLikeDislikeTimerActive(likeDislikeRemaining > 0);

      // Process game when both timers expire
      if (mainRemaining === 0 && likeDislikeRemaining === 0 && !message.gameResult) {
        processGameResult();
      }
    };

    updateTimers();
    const interval = setInterval(updateTimers, 60000);
    return () => clearInterval(interval);
  }, [message]);

  // Helper function to check if all users who liked and attached coins have the same letters
  const calculateAllLikedUsersSameLetters = (msg: Message): boolean => {
    const attachedUsers = Object.keys(msg.attachedCoins);
    const usersWhoLiked = msg.likes.filter(user => attachedUsers.includes(user));
    
    if (usersWhoLiked.length === 0) return false;
    
    const likedUsersLetters = usersWhoLiked.map(user => msg.twoLetters[user]).filter(Boolean);
    
    return likedUsersLetters.length > 0 && 
           likedUsersLetters.every(letters => letters === likedUsersLetters[0]);
  };

  // Helper function to check if all attached users have participated in like/dislike
  const allAttachedUsersParticipated = (msg: Message): boolean => {
    const attachedUsers = Object.keys(msg.attachedCoins);
    if (attachedUsers.length === 0) return true;
    
    const participatedUsers = [...msg.likes, ...msg.dislikes];
    return attachedUsers.every(user => participatedUsers.includes(user));
  };

  // Helper function to check if automatic distribution can happen
  const canAutoDistribute = (msg: Message): boolean => {
    const allLikedSameLetters = calculateAllLikedUsersSameLetters(msg);
    const allParticipated = allAttachedUsersParticipated(msg);
    
    // Can auto-distribute if:
    // 1. All users who liked have same letters AND all attached users participated, OR
    // 2. Like timer expired and all attached users participated
    return (allLikedSameLetters && allParticipated) || (!isLikeDislikeTimerActive && allParticipated);
  };

  const handleReviewerForceReview = () => {
    // Check if automatic distribution is possible
    if (canAutoDistribute(message)) {
      alert('Cannot force review: Either all users who liked have the same letters and everyone participated, or the like timer has expired and everyone participated. The game will conclude automatically.');
      return;
    }

    // Proceed with reviewer decision
    const updatedMessage = { ...message };
    const attachedUsers = Object.keys(updatedMessage.attachedCoins);
    
    if (attachedUsers.length === 0) {
      alert('No coins attached to review.');
      return;
    }

    // Distribution with reviewer decision
    const reviewerLetters = updatedMessage.twoLetters[updatedMessage.reviewer!];
    
    let winners: string[] = [];
    let losers: string[] = [];
    
    if (reviewerLetters) {
      winners = attachedUsers.filter(user => updatedMessage.twoLetters[user] === reviewerLetters);
      losers = attachedUsers.filter(user => updatedMessage.twoLetters[user] !== reviewerLetters);
    }

    // Calculate coin distribution
    const coinsDistributed: { [username: string]: number } = {};
    const coinsReturned: { [username: string]: number } = {};
    
    attachedUsers.forEach(user => {
      const attachedAmount = updatedMessage.attachedCoins[user];
      let amountToDistribute = attachedAmount;
      
      // Apply penalty for users who liked but are losers in reviewer decision
      const usersWhoLiked = updatedMessage.likes.filter(u => attachedUsers.includes(u));
      if (usersWhoLiked.includes(user) && losers.includes(user)) {
        amountToDistribute = Math.max(0, attachedAmount - 1); // 1 coin penalty from attached coins
      }
      
      if (winners.length > 0 && losers.includes(user)) {
        // User loses coins - distribute to winners
        const coinsPerWinner = Math.floor(amountToDistribute / winners.length);
        const remainder = amountToDistribute % winners.length;
        
        winners.forEach((winner, index) => {
          const bonus = coinsPerWinner + (index === 0 ? remainder : 0);
          coinsDistributed[winner] = (coinsDistributed[winner] || 0) + bonus;
        });
        
        // Return remaining coins to original user
        const returnAmount = attachedAmount - amountToDistribute;
        if (returnAmount > 0) {
          coinsReturned[user] = returnAmount;
        }
      } else {
        // User keeps their coins (winner or no distribution)
        coinsReturned[user] = attachedAmount;
      }
    });

    // Update user balances
    Object.entries(coinsDistributed).forEach(([user, amount]) => {
      const userData = StorageUtils.getUserByUsername(user);
      if (userData) {
        StorageUtils.updateUserBalance(user, userData.balance + amount);
      }
    });

    Object.entries(coinsReturned).forEach(([user, amount]) => {
      const userData = StorageUtils.getUserByUsername(user);
      if (userData) {
        StorageUtils.updateUserBalance(user, userData.balance + amount);
      }
    });

    // Save game result
    updatedMessage.gameResult = {
      distributionType: 'reviewer_decision',
      winners,
      losers,
      coinsDistributed,
      coinsReturned
    };
    updatedMessage.isTimerExpired = true;
    updatedMessage.isLikeDislikeTimerExpired = true;

    StorageUtils.saveMessage(updatedMessage);
    onUpdate();
    onBalanceUpdate();
  };

  const processGameResult = () => {
    // Prevent overwriting already concluded games
    if (message.gameResult) return;

    const updatedMessage = { ...message };
    const attachedUsers = Object.keys(updatedMessage.attachedCoins);
    
    if (attachedUsers.length === 0) {
      StorageUtils.saveMessage(updatedMessage);
      return;
    }

    // Check if all attached users have participated
    const allParticipated = allAttachedUsersParticipated(updatedMessage);
    
    if (!allParticipated) {
      // Not all users participated, game cannot conclude automatically
      // Wait for reviewer decision or more participation
      StorageUtils.saveMessage(updatedMessage);
      return;
    }

    // Get users who liked and their letters
    const usersWhoLiked = updatedMessage.likes.filter(user => attachedUsers.includes(user));
    const likedUsersLetters = usersWhoLiked.map(user => updatedMessage.twoLetters[user]).filter(Boolean);
    
    // Check if all users who liked have the same letters
    const allLikedUsersSameLetters = likedUsersLetters.length > 0 && 
      likedUsersLetters.every(letters => letters === likedUsersLetters[0]);

    let winners: string[] = [];
    let losers: string[] = [];
    let distributionType: 'unanimous_likes' | 'reviewer_decision';

    if (allLikedUsersSameLetters && usersWhoLiked.length > 0) {
      // Distribution without reviewer - all who liked with same letters win
      distributionType = 'unanimous_likes';
      winners = usersWhoLiked;
      losers = attachedUsers.filter(user => !usersWhoLiked.includes(user));
    } else {
      // Distribution with reviewer
      distributionType = 'reviewer_decision';
      const reviewerLetters = updatedMessage.twoLetters[updatedMessage.reviewer!];
      
      if (reviewerLetters) {
        winners = attachedUsers.filter(user => updatedMessage.twoLetters[user] === reviewerLetters);
        losers = attachedUsers.filter(user => updatedMessage.twoLetters[user] !== reviewerLetters);
      } else {
        // No reviewer letters, no distribution
        winners = [];
        losers = [];
      }
    }

    // Calculate coin distribution
    const coinsDistributed: { [username: string]: number } = {};
    const coinsReturned: { [username: string]: number } = {};
    
    attachedUsers.forEach(user => {
      const attachedAmount = updatedMessage.attachedCoins[user];
      let amountToDistribute = attachedAmount;
      
      // Apply penalty for reviewer decision mode
      if (distributionType === 'reviewer_decision' && 
          usersWhoLiked.includes(user) && 
          losers.includes(user)) {
        amountToDistribute = Math.max(0, attachedAmount - 1); // 1 coin penalty from attached coins
      }
      
      if (winners.length > 0 && losers.includes(user)) {
        // User loses coins - distribute to winners
        const coinsPerWinner = Math.floor(amountToDistribute / winners.length);
        const remainder = amountToDistribute % winners.length;
        
        winners.forEach((winner, index) => {
          const bonus = coinsPerWinner + (index === 0 ? remainder : 0);
          coinsDistributed[winner] = (coinsDistributed[winner] || 0) + bonus;
        });
        
        // Return remaining coins to original user
        const returnAmount = attachedAmount - amountToDistribute;
        if (returnAmount > 0) {
          coinsReturned[user] = returnAmount;
        }
      } else {
        // User keeps their coins (winner or no distribution)
        coinsReturned[user] = attachedAmount;
      }
    });

    // Update user balances
    Object.entries(coinsDistributed).forEach(([user, amount]) => {
      const userData = StorageUtils.getUserByUsername(user);
      if (userData) {
        StorageUtils.updateUserBalance(user, userData.balance + amount);
      }
    });

    Object.entries(coinsReturned).forEach(([user, amount]) => {
      const userData = StorageUtils.getUserByUsername(user);
      if (userData) {
        StorageUtils.updateUserBalance(user, userData.balance + amount);
      }
    });

    // Save game result
    updatedMessage.gameResult = {
      distributionType,
      winners,
      losers,
      coinsDistributed,
      coinsReturned
    };
    updatedMessage.isTimerExpired = true;
    updatedMessage.isLikeDislikeTimerExpired = true;

    StorageUtils.saveMessage(updatedMessage);
    onUpdate();
    onBalanceUpdate();
  };

  const attachCoins = () => {
    const amount = parseFloat(attachAmount);
    if (isNaN(amount) || amount <= 0) return;

    const user = StorageUtils.getUserByUsername(currentUser);
    if (!user || user.balance < amount) {
      alert('Insufficient balance!');
      return;
    }

    // Check if main timer is active - no one can attach coins after it expires
    if (!isMainTimerActive) {
      alert('Main timer has expired! No one can attach coins anymore.');
      return;
    }

    const updatedMessage = { ...message };
    const currentAttached = updatedMessage.attachedCoins[currentUser] || 0;
    updatedMessage.attachedCoins[currentUser] = currentAttached + amount;

    // Deduct from user balance (coins are held in escrow)
    StorageUtils.updateUserBalance(currentUser, user.balance - amount);
    StorageUtils.saveMessage(updatedMessage);
    setAttachAmount('');
    onUpdate();
    onBalanceUpdate();
  };

  const setLetters = () => {
    if (twoLetters.length !== 2) {
      alert('Please enter exactly 2 letters!');
      return;
    }

    // Check if main timer is active - no one can set letters after it expires
    if (!isMainTimerActive) {
      alert('Main timer has expired! No one can set letters anymore.');
      return;
    }

    const updatedMessage = { ...message };
    updatedMessage.twoLetters[currentUser] = twoLetters.toUpperCase();

    StorageUtils.saveMessage(updatedMessage);
    setTwoLetters('');
    onUpdate();
  };

  const toggleLike = () => {
    // Non-reviewers must wait for like/dislike timer to expire
    if (isLikeDislikeTimerActive && message.reviewer !== currentUser) {
      alert('You can only like/dislike after the like/dislike timer expires (unless you are the reviewer)!');
      return;
    }

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

    StorageUtils.saveMessage(updatedMessage);
    onUpdate();
  };

  const toggleDislike = () => {
    // Non-reviewers must wait for like/dislike timer to expire
    if (isLikeDislikeTimerActive && message.reviewer !== currentUser) {
      alert('You can only like/dislike after the like/dislike timer expires (unless you are the reviewer)!');
      return;
    }

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

    StorageUtils.saveMessage(updatedMessage);
    onUpdate();
  };

  const isOwnMessage = message.sender === currentUser;
  const isReviewer = message.reviewer === currentUser;
  const canInteractDuringLikeTimer = isReviewer;
  const allLikedUsersSameLetters = calculateAllLikedUsersSameLetters(message);
  const allParticipated = allAttachedUsersParticipated(message);

  return (
    <div className={`p-4 rounded-lg border-2 transition-all ${
      isOwnMessage 
        ? 'bg-yellow-400/10 border-yellow-400/30' 
        : 'bg-gray-700 border-gray-600'
    } ${isReviewer ? 'ring-2 ring-purple-400' : ''}`}>
      
      {/* Message Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-white">{message.sender}</span>
          {isReviewer && (
            <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded-full font-medium flex items-center space-x-1">
              <Crown className="w-3 h-3" />
              <span>REVIEWER</span>
            </span>
          )}
          {message.reviewer && message.reviewer !== message.sender && (
            <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
              Reviewer: {message.reviewer}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2 text-gray-400 text-sm">
          <Clock className="w-4 h-4" />
          <span>{new Date(message.timestamp).toLocaleString()}</span>
        </div>
      </div>

      {/* Message Content */}
      <p className="text-white mb-4 bg-gray-800 p-3 rounded-lg">{message.content}</p>

      {/* Dual Timer Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Main Timer */}
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

        {/* Like/Dislike Timer */}
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
              <div className="text-gray-400 text-xs">Like/dislike actions</div>
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
      <div className="space-y-4 bg-gray-800 p-4 rounded-lg">
        
        {/* Attach Coins */}
        <div className="flex items-center space-x-2">
          <input
            type="number"
            value={attachAmount}
            onChange={(e) => setAttachAmount(e.target.value)}
            placeholder="Amount"
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm w-24"
            min="0"
            step="0.01"
            disabled={!isMainTimerActive}
          />
          <button
            onClick={attachCoins}
            disabled={!attachAmount || !isMainTimerActive}
            className="bg-yellow-400 text-gray-900 px-4 py-2 rounded font-medium hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Coins className="w-4 h-4" />
            <span>Attach t</span>
          </button>
          {!isMainTimerActive && (
            <span className="text-red-400 text-sm">Main timer expired</span>
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
            disabled={!isMainTimerActive}
          />
          <button
            onClick={setLetters}
            disabled={twoLetters.length !== 2 || !isMainTimerActive}
            className="bg-blue-500 text-white px-4 py-2 rounded font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Set Letters
          </button>
        </div>

        {/* Like/Dislike Buttons */}
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleLike}
            disabled={isLikeDislikeTimerActive && !canInteractDuringLikeTimer}
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
            disabled={isLikeDislikeTimerActive && !canInteractDuringLikeTimer}
            className={`flex items-center space-x-2 px-4 py-2 rounded font-medium transition-colors ${
              message.dislikes.includes(currentUser)
                ? 'bg-red-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <ThumbsDown className="w-4 h-4" />
            <span>{message.dislikes.length}</span>
          </button>

          {/* Reviewer Force Review Button */}
          {isReviewer && !message.gameResult && (
            <button
              onClick={handleReviewerForceReview}
              disabled={canAutoDistribute(message)}
              className="bg-purple-500 text-white px-4 py-2 rounded font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              title={canAutoDistribute(message) ? "Cannot force review: Game can conclude automatically" : "Force review as reviewer"}
            >
              <Gavel className="w-4 h-4" />
              <span>Force Review</span>
            </button>
          )}

          {(isLikeDislikeTimerActive && !canInteractDuringLikeTimer) && (
            <div className="flex items-center space-x-1 text-orange-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Wait for like timer or be reviewer</span>
            </div>
          )}
        </div>

        {/* Status Messages */}
        <div className="text-sm space-y-1">
          {!isLikeDislikeTimerActive && (
            <div className="text-green-400">
              ✓ Like/dislike available for all users
            </div>
          )}
          {allLikedUsersSameLetters && allParticipated && Object.keys(message.attachedCoins).length > 0 && (
            <div className="text-green-400">
              ✓ All users who liked have same letters and everyone participated - automatic distribution when like timer ends
            </div>
          )}
          {allLikedUsersSameLetters && !allParticipated && Object.keys(message.attachedCoins).length > 0 && (
            <div className="text-orange-400">
              ⚠ All users who liked have same letters, but not everyone participated - waiting for more participation or reviewer decision
            </div>
          )}
          {!allParticipated && Object.keys(message.attachedCoins).length > 0 && (
            <div className="text-orange-400">
              ⚠ Not all users have participated in like/dislike - waiting for participation or reviewer decision
            </div>
          )}
          {isReviewer && !canAutoDistribute(message) && Object.keys(message.attachedCoins).length > 0 && (
            <div className="text-purple-400 flex items-center space-x-1">
              <Crown className="w-3 h-3" />
              <span>You can force review or wait for more participation</span>
            </div>
          )}
        </div>
      </div>

      {/* Display Game Status */}
      {Object.keys(message.attachedCoins).length > 0 && (
        <div className="mt-4 bg-gray-800 p-4 rounded-lg">
          <h4 className="text-white font-medium mb-3 flex items-center space-x-2">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span>Game Status</span>
          </h4>
          
          <div className="space-y-2">
            {Object.entries(message.attachedCoins).map(([user, amount]) => (
              <div key={user} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                <div className="flex items-center space-x-2">
                  <span className="text-white font-medium">{user}</span>
                  {message.twoLetters[user] && (
                    <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold">
                      {message.twoLetters[user]}
                    </span>
                  )}
                  {message.reviewer === user && (
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

          {/* Participation Status */}
          <div className="mt-3 p-2 bg-gray-700 rounded">
            <p className="text-gray-300 text-sm">
              <strong>Participation:</strong> {message.likes.length + message.dislikes.length} of {Object.keys(message.attachedCoins).length} users have voted
            </p>
            {!allParticipated && (
              <p className="text-orange-400 text-xs mt-1">
                Waiting for: {Object.keys(message.attachedCoins).filter(user => 
                  !message.likes.includes(user) && !message.dislikes.includes(user)
                ).join(', ')}
              </p>
            )}
          </div>

          {/* Game Result Display */}
          {message.gameResult && (
            <div className="mt-3 p-3 bg-purple-900/30 border border-purple-500 rounded">
              <p className="text-purple-300 text-sm font-medium mb-2">
                <strong>Game Result:</strong> {
                  message.gameResult.distributionType === 'unanimous_likes' 
                    ? 'All users who liked had same letters and everyone participated - distributed without reviewer!'
                    : 'Distribution based on reviewer decision'
                }
              </p>
              
              {message.gameResult.winners.length > 0 && (
                <div className="text-green-400 text-sm">
                  <strong>Winners:</strong> {message.gameResult.winners.join(', ')}
                </div>
              )}
              
              {message.gameResult.losers.length > 0 && (
                <div className="text-red-400 text-sm">
                  <strong>Losers:</strong> {message.gameResult.losers.join(', ')}
                </div>
              )}

              {Object.keys(message.gameResult.coinsDistributed).length > 0 && (
                <div className="text-yellow-400 text-sm mt-1">
                  <strong>Coins Won:</strong> {
                    Object.entries(message.gameResult.coinsDistributed)
                      .map(([user, amount]) => `${user}: +${amount}t`)
                      .join(', ')
                  }
                </div>
              )}

              {Object.keys(message.gameResult.coinsReturned).length > 0 && (
                <div className="text-blue-400 text-sm mt-1">
                  <strong>Coins Returned:</strong> {
                    Object.entries(message.gameResult.coinsReturned)
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