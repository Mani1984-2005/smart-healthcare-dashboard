import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("medicare_auth_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          const u = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            photo: firebaseUser.photoURL,
          };
          setUser(u);
          localStorage.setItem("medicare_auth_user", JSON.stringify(u));
        } else {
          const saved = localStorage.getItem("medicare_auth_user");
          if (!saved) {
            setUser(null);
          }
        }
        setLoading(false);
      });
    } catch (e) {
      console.warn("[Auth] Firebase onAuthStateChanged error:", e);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  const loginAsGuest = (role = "Admin") => {
    const guestUser = {
      uid: `guest-${role.toLowerCase()}-${Date.now().toString(36)}`,
      name: `Demo ${role}`,
      email: `${role.toLowerCase()}@medicarepro.local`,
      role,
    };
    setUser(guestUser);
    localStorage.setItem("medicare_auth_user", JSON.stringify(guestUser));
    localStorage.setItem("role", role);
    return guestUser;
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setUser(null);
    localStorage.removeItem("medicare_auth_user");
    localStorage.removeItem("role");
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, loginAsGuest, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);