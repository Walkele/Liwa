import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get additional user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        
        if (!userDoc.exists()) {
          // Create user document if it doesn't exist
          console.log('🔧 Creating missing user document for:', firebaseUser.email);
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email,
            location: 'Unknown',
            rating: 5.0,
            totalTrades: 0,
            createdAt: new Date(),
            trustScore: 100,
            verificationLevel: 'EMAIL'
          });
        }
        
        const userData = userDoc.exists() ? userDoc.data() : {
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          location: 'Unknown',
          rating: 5.0,
          totalTrades: 0,
          trustScore: 100,
          verificationLevel: 'EMAIL'
        };
        
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: userData.name || firebaseUser.displayName || 'User',
          name: userData.name || firebaseUser.displayName || 'User',
          location: userData.location || 'Unknown',
          rating: userData.rating || 5.0,
          ...userData
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw error;
    }
  };

  const signup = async (email, password, name, location) => {
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        name,
        email,
        location,
        rating: 5.0,
        totalTrades: 0,
        createdAt: new Date()
      });
      
      return firebaseUser;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  };

  // ✅ OPTIMIZATION: Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    login,
    signup,
    logout,
    loading
  }), [user, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};