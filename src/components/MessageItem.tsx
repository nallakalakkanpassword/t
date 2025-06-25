import React, { useState, useEffect } from 'react';
import { Clock, ThumbsUp, ThumbsDown, Coins, Timer, AlertCircle, Crown, Gavel, Settings, Lock, Users, Star } from 'lucide-react';
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
  const [reviewerTimeLeft, setReviewerTimeLeft] = useState(0);
  const [isMainTimerActive, setIsMainTimerActive] = useState(true);
  const [isLikeDislikeTimerActive, setIsLikeDislikeTimerActive] = useState(true);
  const [isReviewerTimerActive, setIsReviewerTimerActive] = useState(false);

  const currentReviewer = message.reviewers[message.currentReviewerIndex];
  const isCurrentReviewer = currentReviewer === currentUser;
  const reviewerAction = message.reviewerActions[currentUser];
  const hasMultipleReviewers = message.reviewers.length > 1;

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

      // Reviewer timer (for multi-reviewer system)
      const activeReviewerTimer = message.reviewerTimers.find(rt => rt.isActive);
      if (activeReviewerTimer) {
        const reviewerTimerStart = new Date(activeReviewerTimer.startTime).getTime();
        const reviewerElapsed = Math.floor((now - reviewerTimerStart) / 1000 / 60);
        const reviewerRemaining = Math.max(0, activeReviewerTimer.duration - reviewerElapsed);
        setReviewerTimeLeft(reviewerRemaining);
        setIsReviewerTimerActive(reviewerRemaining > 0);

        if (reviewerRemaining === 0 && !activeReviewerTimer.isExpired) {
          // Timer expired, move to next reviewer or conclude
          handleReviewerTimerExpired();
        }
      } else {
        setIsReviewerTimerActive(false);
        setReviewerTimeLeft(0);
      }

      // Process game when appropriate
      if (mainRemaining === 0 && likeDislikeRemaining === 0 && !message.gameResult && !isReviewerTimerActive) {
        processGameResult();
      }
    };

    updateTimers();
    const interval = setInterval(updateTimers, 60000);
    return () => clearInterval(interval);
  }, [message]);

  const handleReviewerTimerExpired = () => {
    const updatedMessage = { ...message };
    
    // Mark current timer as expired
    const activeTimerIndex = updatedMessage.reviewerTimers.findIndex(rt => rt.isActive);
    if (activeTimerIndex >= 0) {
      updatedMessage.reviewerTimers[activeTimerIndex].isActive = false;
      updatedMessage.reviewerTimers[activeTimerIndex].isExpired = true;
    }

    // Move to next reviewer if available
    if (updatedMessage.currentReviewerIndex < updatedMessage.reviewers.length - 1) {
      updatedMessage.currentReviewerIndex++;
      
      // Start next reviewer timer
      const nextReviewerTimer = {
        reviewerIndex: updatedMessage.currentReviewerIndex,
        startTime: new Date().toISOString(),
        duration: updatedMessage.reviewerTimer!,
        isActive: true,
        isExpired: false
      };
      updatedMessage.reviewerTimers.push(nextReviewerTimer);
    } else {
      // No more reviewers, conclude game
      processGameResult();
      return;
    }

    StorageUtils.saveMessage(updatedMessage);
    onUpdate();
  };

  const calculateAllLikedUsersSameLetters = (msg: Message): boolean => {
    const attachedUsers = Object.keys(msg.attachedCoins);
    const usersWhoLiked = msg.likes.filter(user => attachedUsers.includes(user));
    
    if (usersWhoLiked.length === 0) return false;
    
    const likedUsersLetters = usersWhoLiked.map(user => msg.twoLetters[user]).filter(Boolean);
    
    return likedUsersLetters.length > 0 && 
           likedUsersLetters.every(letters => letters === likedUsersLetters[0]);
  };

  const allAttachedUsersParticipated = (msg: Message): boolean => {
    const attachedUsers = Object.keys(msg.attachedCoins);
    if (attachedUsers.length === 0) return true;
    
    const participatedUsers = [...msg.likes, ...msg.dislikes];
    return attachedUsers.every(user => participatedUsers.includes(user));
  };

  const canAutoDistribute = (msg: Message): boolean => {
    const allLikedSameLetters = calculateAllLikedUsersSameLetters(msg);
    const allParticipated = allAttachedUsersParticipated(msg);
    
    return (allLikedSameLetters && allParticipated) || (!isLikeDislikeTimerActive && allParticipated);
  };

  const calculateProportionalDistribution = (
    winners: string[], 
    losers: string[], 
    attachedCoins: { [username: string]: number },
    coinAttachmentMode: 'same' | 'different',
    reviewerLetters?: string
  ) => {
    const coinsDistributed: { [username: string]: number } = {};
    const coinsReturned: { [username: string]: number } = {};
    const penaltyCoinsDistributed: { [username: string]: number } = {};
    let reviewerBonus = 0;

    // Calculate penalty coins (1 extra coin from users with different letters than reviewer)
    const penaltyUsers = reviewerLetters ? 
      losers.filter(loser => message.twoLetters[loser] !== reviewerLetters) : [];
    
    const totalPenaltyCoins = penaltyUsers.length;
    
    if (coinAttachmentMode === 'same') {
      // Equal distribution for same mode
      losers.forEach(loser => {
        const attachedAmount = attachedCoins[loser];
        let amountToDistribute = attachedAmount;
        let penaltyAmount = 0;
        
        // Apply penalty if user has different letters than reviewer
        if (reviewerLetters && message.twoLetters[loser] !== reviewerLetters) {
          penaltyAmount = 1;
          amountToDistribute = Math.max(0, attachedAmount - penaltyAmount);
        }
        
        if (winners.length > 0) {
          const coinsPerWinner = Math.floor(amountToDistribute / winners.length);
          const remainder = amountToDistribute % winners.length;
          
          winners.forEach((winner, index) => {
            const bonus = coinsPerWinner + (index === 0 ? remainder : 0);
            coinsDistributed[winner] = (coinsDistributed[winner] || 0) + bonus;
          });
        }
        
        // Return remaining coins to original user
        const returnAmount = attachedAmount - amountToDistribute - penaltyAmount;
        if (returnAmount > 0) {
          coinsReturned[loser] = returnAmount;
        }
      });
      
      // Winners keep their coins
      winners.forEach(winner => {
        coinsReturned[winner] = attachedCoins[winner];
      });
    } else {
      // Proportional distribution for different mode
      const totalWinnerAttachment = winners.reduce((sum, winner) => sum + attachedCoins[winner], 0);
      
      losers.forEach(loser => {
        const attachedAmount = attachedCoins[loser];
        let amountToDistribute = attachedAmount;
        let penaltyAmount = 0;
        
        // Apply penalty if user has different letters than reviewer
        if (reviewerLetters && message.twoLetters[loser] !== reviewerLetters) {
          penaltyAmount = 1;
          amountToDistribute = Math.max(0, attachedAmount - penaltyAmount);
        }
        
        if (winners.length > 0 && totalWinnerAttachment > 0) {
          // Distribute proportionally based on winner attachments
          winners.forEach(winner => {
            const winnerProportion = attachedCoins[winner] / totalWinnerAttachment;
            const bonus = Math.floor(amountToDistribute * winnerProportion);
            coinsDistributed[winner] = (coinsDistributed[winner] || 0) + bonus;
          });
        }
        
        // Return remaining coins to original user
        const returnAmount = attachedAmount - amountToDistribute - penaltyAmount;
        if (returnAmount > 0) {
          coinsReturned[loser] = returnAmount;
        }
      });
      
      // Winners keep their coins
      winners.forEach(winner => {
        coinsReturned[winner] = attachedCoins[winner];
      });
    }

    // Distribute penalty coins equally among winners and reviewer
    if (totalPenaltyCoins > 0 && reviewerLetters) {
      const beneficiaries = [...winners];
      if (currentReviewer && !beneficiaries.includes(currentReviewer)) {
        beneficiaries.push(currentReviewer);
      }
      
      if (beneficiaries.length > 0) {
        const penaltyPerBeneficiary = Math.floor(totalPenaltyCoins / beneficiaries.length);
        const penaltyRemainder = totalPenaltyCoins % beneficiaries.length;
        
        beneficiaries.forEach((beneficiary, index) => {
          const penaltyBonus = penaltyPerBeneficiary + (index === 0 ? penaltyRemainder : 0);
          penaltyCoinsDistributed[beneficiary] = penaltyBonus;
          
          if (beneficiary === currentReviewer) {
            reviewerBonus += penaltyBonus;
          }
        });
      }
    }

    return { coinsDistributed, coinsReturned, penaltyCoinsDistributed, reviewerBonus };
  };

  const handleReviewerForceReview = () => {
    // Check if reviewer has acted (set letters and liked/disliked)
    if (!reviewerAction || !reviewerAction.hasActed || !message.twoLetters[currentUser]) {
      alert('Reviewer must set two letters and like/dislike before forcing review!');
      return;
    }

    // Check if automatic distribution is possible
    if (canAutoDistribute(message)) {
      alert('Cannot force review: Either all users who liked have the same letters and everyone participated, or the like timer has expired and everyone participated. The game will conclude automatically.');
      return;
    }

    processReviewerDecision();
  };

  const processReviewerDecision = () => {
    const updatedMessage = { ...message };
    const attachedUsers = Object.keys(updatedMessage.attachedCoins);
    
    if (attachedUsers.length === 0) {
      alert('No coins attached to review.');
      return;
    }

    const reviewerLetters = updatedMessage.twoLetters[currentReviewer];
    
    let winners: string[] = [];
    let losers: string[] = [];
    
    if (reviewerLetters) {
      winners = attachedUsers.filter(user => updatedMessage.twoLetters[user] === reviewerLetters);
      losers = attachedUsers.filter(user => updatedMessage.twoLetters[user] !== reviewerLetters);
    }

    // Calculate coin distribution
    const { coinsDistributed, coinsReturned, penaltyCoinsDistributed, reviewerBonus } = 
      calculateProportionalDistribution(winners, losers, updatedMessage.attachedCoins, 
        updatedMessage.coinAttachmentMode, reviewerLetters);

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

    // Distribute penalty coins
    Object.entries(penaltyCoinsDistributed).forEach(([user, amount]) => {
      const userData = StorageUtils.getUserByUsername(user);
      if (userData) {
        StorageUtils.updateUserBalance(user, userData.balance + amount);
      }
    });

    // Check if we should move to next reviewer or conclude
    if (hasMultipleReviewers && updatedMessage.currentReviewerIndex < updatedMessage.reviewers.length - 1) {
      // Start next reviewer timer
      updatedMessage.currentReviewerIndex++;
      const nextReviewerTimer = {
        reviewerIndex: updatedMessage.currentReviewerIndex,
        startTime: new Date().toISOString(),
        duration: updatedMessage.reviewerTimer!,
        isActive: true,
        isExpired: false
      };
      updatedMessage.reviewerTimers.push(nextReviewerTimer);
    } else {
      // Save final game result
      updatedMessage.gameResult = {
        distributionType: 'reviewer_decision',
        reviewerIndex: updatedMessage.currentReviewerIndex,
        winners,
        losers,
        coinsDistributed,
        coinsReturned,
        reviewerBonus,
        penaltyCoinsDistributed
      };
      updatedMessage.isTimerExpired = true;
      updatedMessage.isLikeDislikeTimerExpired = true;
    }

    StorageUtils.saveMessage(updatedMessage);
    onUpdate();
    onBalanceUpdate();
  };

  const processGameResult = () => {
    if (message.gameResult) return;

    const updatedMessage = { ...message };
    const attachedUsers = Object.keys(updatedMessage.attachedCoins);
    
    if (attachedUsers.length === 0) {
      StorageUtils.saveMessage(updatedMessage);
      return;
    }

    const allParticipated = allAttachedUsersParticipated(updatedMessage);
    
    if (!allParticipated && !hasMultipleReviewers) {
      StorageUtils.saveMessage(updatedMessage);
      return;
    }

    const usersWhoLiked = updatedMessage.likes.filter(user => attachedUsers.includes(user));
    const likedUsersLetters = usersWhoLiked.map(user => updatedMessage.twoLetters[user]).filter(Boolean);
    const allLikedUsersSameLetters = likedUsersLetters.length > 0 && 
      likedUsersLetters.every(letters => letters === likedUsersLetters[0]);

    let winners: string[] = [];
    let losers: string[] = [];
    let distributionType: 'unanimous_likes' | 'reviewer_decision';

    if (allLikedUsersSameLetters && usersWhoLiked.length > 0 && allParticipated) {
      distributionType = 'unanimous_likes';
      winners = usersWhoLiked;
      losers = attachedUsers.filter(user => !usersWhoLiked.includes(user));
    } else if (hasMultipleReviewers) {
      // Start multi-reviewer process
      const firstReviewerTimer = {
        reviewerIndex: 0,
        startTime: new Date().toISOString(),
        duration: updatedMessage.reviewerTimer!,
        isActive: true,
        isExpired: false
      };
      updatedMessage.reviewerTimers.push(firstReviewerTimer);
      StorageUtils.saveMessage(updatedMessage);
      onUpdate();
      return;
    } else {
      distributionType = 'reviewer_decision';
      const reviewerLetters = updatedMessage.twoLetters[currentReviewer];
      
      if (reviewerLetters) {
        winners = attachedUsers.filter(user => updatedMessage.twoLetters[user] === reviewerLetters);
        losers = attachedUsers.filter(user => updatedMessage.twoLetters[user] !== reviewerLetters);
      }
    }

    const { coinsDistributed, coinsReturned, penaltyCoinsDistributed, reviewerBonus } = 
      calculateProportionalDistribution(winners, losers, updatedMessage.attachedCoins, 
        updatedMessage.coinAttachmentMode, distributionType === 'reviewer_decision' ? 
        updatedMessage.twoLetters[currentReviewer] : undefined);

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

    Object.entries(penaltyCoinsDistributed).forEach(([user, amount]) => {
      const userData = StorageUtils.getUserByUsername(user);
      if (userData) {
        StorageUtils.updateUserBalance(user, userData.balance + amount);
      }
    });

    updatedMessage.gameResult = {
      distributionType,
      winners,
      losers,
      coinsDistributed,
      coinsReturned,
      reviewerBonus,
      penaltyCoinsDistributed
    };
    updatedMessage.isTimerExpired = true;
    updatedMessage.isLikeDislikeTimerExpired = true;

    StorageUtils.saveMessage(updatedMessage);
    onUpdate();
    onBalanceUpdate();
  };

  const attachCoins = () => {
    const amount = parseFloat(attachAmount);
    
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount greater than 0!');
      return;
    }

    const user = StorageUtils.getUserByUsername(currentUser);
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

    if (message.coinAttachmentMode === 'same') {
      const existingAttachments = Object.values(message.attachedCoins);
      if (existingAttachments.length > 0 && existingAttachments[0] !== amount) {
        alert(`This message requires all participants to attach the same amount: ${existingAttachments[0]} t coins`);
        return;
      }
    }

    const updatedMessage = { ...message };
    const currentAttached = updatedMessage.attachedCoins[currentUser] || 0;
    updatedMessage.attachedCoins[currentUser] = currentAttached + amount;

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

    if (!isMainTimerActive) {
      alert('Main timer has expired! No one can set letters anymore.');
      return;
    }

    // Check if user is reviewer and if their actions are irreversible
    if (message.reviewers.includes(currentUser)) {
      const action = message.reviewerActions[currentUser];
      if (action && action.hasActed && action.letters) {
        alert('Reviewer actions are irreversible! You cannot change your letters.');
        return;
      }
    }

    if (!message.reviewers.includes(currentUser) && !isLikeDislikeTimerActive) {
      alert('You cannot change letters after the like/dislike timer expires (only reviewer can)!');
      return;
    }

    const updatedMessage = { ...message };
    updatedMessage.twoLetters[currentUser] = twoLetters.toUpperCase();

    // Update reviewer action if current user is a reviewer
    if (updatedMessage.reviewers.includes(currentUser)) {
      if (!updatedMessage.reviewerActions[currentUser]) {
        updatedMessage.reviewerActions[currentUser] = {
          username: currentUser,
          liked: false,
          disliked: false,
          hasActed: false
        };
      }
      updatedMessage.reviewerActions[currentUser].letters = twoLetters.toUpperCase();
    }

    StorageUtils.saveMessage(updatedMessage);
    setTwoLetters('');
    onUpdate();
  };

  const toggleLike = () => {
    const updatedMessage = { ...message };
    const likeIndex = updatedMessage.likes.indexOf(currentUser);
    const dislikeIndex = updatedMessage.dislikes.indexOf(currentUser);

    // Check if reviewer actions are irreversible
    if (message.reviewers.includes(currentUser)) {
      const action = message.reviewerActions[currentUser];
      if (action && action.hasActed && (action.liked || action.disliked)) {
        alert('Reviewer actions are irreversible! You cannot change your like/dislike.');
        return;
      }
    }

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
      if (!updatedMessage.reviewerActions[currentUser]) {
        updatedMessage.reviewerActions[currentUser] = {
          username: currentUser,
          liked: false,
          disliked: false,
          hasActed: false
        };
      }
      const action = updatedMessage.reviewerActions[currentUser];
      action.liked = updatedMessage.likes.includes(currentUser);
      action.disliked = updatedMessage.dislikes.includes(currentUser);
      action.hasActed = true;
      action.actionTimestamp = new Date().toISOString();
    }

    StorageUtils.saveMessage(updatedMessage);
    onUpdate();
  };

  const toggleDislike = () => {
    const updatedMessage = { ...message };
    const likeIndex = updatedMessage.likes.indexOf(currentUser);
    const dislikeIndex = updatedMessage.dislikes.indexOf(currentUser);

    // Check if reviewer actions are irreversible
    if (message.reviewers.includes(currentUser)) {
      const action = message.reviewerActions[currentUser];
      if (action && action.hasActed && (action.liked || action.disliked)) {
        alert('Reviewer actions are irreversible! You cannot change your like/dislike.');
        return;
      }
    }

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
      if (!updatedMessage.reviewerActions[currentUser]) {
        updatedMessage.reviewerActions[currentUser] = {
          username: currentUser,
          liked: false,
          disliked: false,
          hasActed: false
        };
      }
      const action = updatedMessage.reviewerActions[currentUser];
      action.liked = updatedMessage.likes.includes(currentUser);
      action.disliked = updatedMessage.dislikes.includes(currentUser);
      action.hasActed = true;
      action.actionTimestamp = new Date().toISOString();
    }

    StorageUtils.saveMessage(updatedMessage);
    onUpdate();
  };

  const isOwnMessage = message.sender === currentUser;
  const allLikedUsersSameLetters = calculateAllLikedUsersSameLetters(message);
  const allParticipated = allAttachedUsersParticipated(message);

  const canSetLetters = message.reviewers.includes(currentUser) || isLikeDislikeTimerActive;
  const canAttachCoins = isLikeDislikeTimerActive && isMainTimerActive;

  // Check if reviewer can force review
  const canReviewerForceReview = isCurrentReviewer && reviewerAction && reviewerAction.hasActed && 
    message.twoLetters[currentUser] && !canAutoDistribute(message);

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
        </div>
        <div className="flex items-center space-x-2 text-gray-400 text-sm">
          <Clock className="w-4 h-4" />
          <span>{new Date(message.timestamp).toLocaleString()}</span>
        </div>
      </div>

      {/* Message Content */}
      <p className="text-white mb-4 bg-gray-800 p-3 rounded-lg">{message.content}</p>

      {/* Multi-Reviewer Display */}
      {hasMultipleReviewers && (
        <div className="mb-4 bg-gray-800 p-3 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="w-4 h-4 text-purple-400" />
            <span className="text-purple-400 font-medium">Multi-Reviewer System</span>
          </div>
          <div className="space-y-2">
            {message.reviewers.map((reviewer, index) => (
              <div key={reviewer} className={`flex items-center justify-between p-2 rounded ${
                index === message.currentReviewerIndex ? 'bg-purple-500/20 border border-purple-500' : 'bg-gray-700'
              }`}>
                <div className="flex items-center space-x-2">
                  <span className="text-white font-medium">{reviewer}</span>
                  {index === message.currentReviewerIndex && (
                    <Star className="w-4 h-4 text-yellow-400" />
                  )}
                  {message.reviewerActions[reviewer]?.hasActed && (
                    <span className="text-green-400 text-xs">✓ Acted</span>
                  )}
                </div>
                <span className="text-gray-400 text-sm">
                  {index === 0 ? 'Primary' : `${index + 1}${index === 1 ? 'st' : index === 2 ? 'nd' : index === 3 ? 'rd' : 'th'}`}
                </span>
              </div>
            ))}
          </div>
          {isReviewerTimerActive && (
            <div className="mt-2 p-2 bg-purple-500/20 rounded">
              <p className="text-purple-300 text-sm">
                <strong>Reviewer Phase Active:</strong> {reviewerTimeLeft} minutes remaining for {currentReviewer}
              </p>
            </div>
          )}
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
              <div className="text-gray-400 text-xs">Letter restrictions & coin attachment cutoff</div>
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

          {/* Reviewer Force Review Button */}
          {canReviewerForceReview && (
            <button
              onClick={handleReviewerForceReview}
              className="bg-purple-500 text-white px-4 py-2 rounded font-medium hover:bg-purple-600 transition-colors flex items-center space-x-2"
            >
              <Gavel className="w-4 h-4" />
              <span>Force Review</span>
            </button>
          )}

          {message.reviewers.includes(currentUser) && reviewerAction?.hasActed && (
            <span className="text-orange-400 text-sm">⚠ Actions Irreversible</span>
          )}
        </div>
      </div>

      {/* Game Status Display */}
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
          {message.gameResult && (
            <div className="mt-3 p-3 bg-purple-900/30 border border-purple-500 rounded">
              <p className="text-purple-300 text-sm font-medium mb-2">
                <strong>Game Result:</strong> {
                  message.gameResult.distributionType === 'unanimous_likes' 
                    ? 'Unanimous likes with same letters - distributed without reviewer!'
                    : `Distribution by ${message.gameResult.reviewerIndex !== undefined ? 
                        `Reviewer #${message.gameResult.reviewerIndex + 1}` : 'Reviewer'}`
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

              {message.gameResult.penaltyCoinsDistributed && Object.keys(message.gameResult.penaltyCoinsDistributed).length > 0 && (
                <div className="text-orange-400 text-sm mt-1">
                  <strong>Penalty Bonus:</strong> {
                    Object.entries(message.gameResult.penaltyCoinsDistributed)
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