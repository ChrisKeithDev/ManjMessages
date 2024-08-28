// src/Contexts/UserContext.js
import React, { createContext, useState, useEffect } from 'react';
import { firestore } from '../firebase-config';
import { collection, getDocs } from 'firebase/firestore';

// Create a context
export const UserContext = createContext();

// Provider component
export const UserProvider = ({ children }) => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const usersCollectionRef = collection(firestore, process.env.REACT_APP_FIRESTORE_USERS_COLLECTION);
      const usersSnapshot = await getDocs(usersCollectionRef);
      const usersArray = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersArray);
    };

    fetchUsers();
  }, []);

  return (
    <UserContext.Provider value={{ users }}>
      {children}
    </UserContext.Provider>
  );
};
