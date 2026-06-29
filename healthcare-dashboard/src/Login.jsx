import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

export default function Login({ onLogin }) {
  const [role, setRole] = useState("patient");

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);

      const userData = {
        name: result.user.displayName,
        email: result.user.email,
        photo: result.user.photoURL,
        role: role,
      };

      onLogin(userData);
    } catch (error) {
      alert("Login failed: " + error.message);
      console.log(error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6">
          MediCare+ Login
        </h1>

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full border p-3 rounded-xl mb-4"
        >
          <option value="patient">User / Patient</option>
          <option value="company">Company / Hospital</option>
          <option value="admin">Admin</option>
        </select>

        <button
          onClick={handleGoogleLogin}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
