// src/Contexts/AuthContext.js
import React, { useContext, useState, useEffect, createContext } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';

export const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logOut = async () => {
    return signOut(getAuth());
  };

  const value = {
    currentUser,
    logOut,
  };

  return (
    <AuthContext.Provider value={ value }>
      {!loading && children}
    </AuthContext.Provider>
  );
};


