import React, { useState, useEffect } from 'react';
import { StorageUtils } from './utils/storage';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';

function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    const user = StorageUtils.getCurrentUser();
    setCurrentUser(user);
  }, []);

  const handleLogin = (username: string) => {
    setCurrentUser(username);
  };

  const handleLogout = () => {
    StorageUtils.logout();
    setCurrentUser(null);
  };

  return (
    <div className="App">
      {currentUser ? (
        <Dashboard username={currentUser} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;