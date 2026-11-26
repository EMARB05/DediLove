"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db, googleProvider } from "../lib/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeDoc = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (!u) {
        setUser(null);
        setLoading(false);
        return;
      }

      const userRef = doc(db, "usuarios", u.uid);
      unsubscribeDoc = onSnapshot(
        userRef,
        (snap) => {
          const datosFirestore = snap.exists() ? snap.data() : {};
          setUser({
            uid: u.uid,
            email: u.email,
            displayName: u.displayName,
            photoURL: u.photoURL,
            getIdToken: (forceRefresh) => u.getIdToken(forceRefresh),
            ...datosFirestore,
          });
          setLoading(false);
        },
        (error) => {
          console.error("Error leyendo documento de usuario:", error);
          setUser(u);
          setLoading(false);
        }
      );
    });

    return () => {
      if (unsubscribeDoc) unsubscribeDoc();
      unsubscribeAuth();
    };
  }, []);

  const login = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);