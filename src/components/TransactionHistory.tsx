import React from 'react';
import { History, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';
import { StorageUtils } from '../utils/storage';

interface TransactionHistoryProps {
  username: string;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ username }) => {
  const transactions = StorageUtils.getUserTransactions(username)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
        <History className="w-6 h-6 text-yellow-400" />
        <span>Private Ledger</span>
      </h2>

      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No transactions yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction) => {
            const isSent = transaction.from === username;
            const otherUser = isSent ? transaction.to : transaction.from;
            
            return (
              <div
                key={transaction.id}
                className="bg-gray-700 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    isSent ? 'bg-red-500/20' : 'bg-green-500/20'
                  }`}>
                    {isSent ? (
                      <ArrowUpRight className="w-5 h-5 text-red-400" />
                    ) : (
                      <ArrowDownLeft className="w-5 h-5 text-green-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {isSent ? 'Sent to' : 'Received from'} {otherUser}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {formatDate(transaction.timestamp)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    isSent ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {isSent ? '-' : '+'}{transaction.amount} t
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};