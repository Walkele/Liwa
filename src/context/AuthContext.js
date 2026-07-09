import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  sendEmailVerification,
  reload,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
// Ensure this points exactly to your persistence-fixed config
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
    // Safety check: if auth failed to initialize in the config, stop here
    if (!auth) {
      console.error("Firebase Auth object is undefined. Check your config/firebase.js");
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Fetch additional profile data from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          let userData = {};

          if (userDoc.exists()) {
            userData = userDoc.data();
          } else {
            // Fallback: Create the document if it's missing (helps during migrations)
            userData = {
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email,
              location: 'Unknown',
              rating: 5.0,
              totalTrades: 0,
              createdAt: serverTimestamp(),
              trustScore: 100,
              verificationLevel: 'EMAIL',
              emailVerified: firebaseUser.emailVerified,
              profilePhoto: null
            };
            await setDoc(userDocRef, userData);
          }
          
          // Update emailVerified status from Firebase Auth
          await reload(firebaseUser);
          
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
            profilePhoto: userData.profilePhoto || null,
            ...userData
          });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error in Auth State Transition:", error);
      } finally {
        // This ensures the App.js loader disappears only after 
        // the Auth registry is confirmed and Firestore data is fetched
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email, password, name, location) => {
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Send email verification
    await sendEmailVerification(firebaseUser);
    
    const userData = {
      name,
      email,
      location,
      rating: 5.0,
      totalTrades: 0,
      createdAt: serverTimestamp(),
      trustScore: 100,
      verificationLevel: 'EMAIL',
      emailVerified: false,
      profilePhoto: null
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), userData);
    return firebaseUser;
  };

  const resendVerificationEmail = async () => {
    if (!auth.currentUser) {
      throw new Error('No user logged in');
    }
    await sendEmailVerification(auth.currentUser);
    await reload(auth.currentUser);
    
    // Update Firestore
    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(userDocRef, {
      emailVerified: auth.currentUser.emailVerified
    });
  };

  const checkEmailVerification = async () => {
    if (!auth.currentUser) {
      return false;
    }
    await reload(auth.currentUser);
    
    // Update Firestore if changed
    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(userDocRef, {
      emailVerified: auth.currentUser.emailVerified
    });
    
    return auth.currentUser.emailVerified;
  };

  const resetPassword = async (email) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    return signOut(auth);
  };

  const value = {
    user,
    login,
    signup,
    logout,
    resendVerificationEmail,
    checkEmailVerification,
    resetPassword,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};