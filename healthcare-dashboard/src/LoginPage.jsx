// src/pages/LoginPage.jsx
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

export default function LoginPage({ darkMode, role, setRole, onLogin, addToast }) {
  const cardClass = darkMode
    ? "bg-slate-900 border-slate-800 text-white"
    : "bg-white border-slate-200 text-slate-950";

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      onLogin({
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || "User",
        email: firebaseUser.email || "",
        photo: firebaseUser.photoURL || "",
        role,
      });
      addToast("Login successful", `${firebaseUser.displayName || "User"} logged in as ${role}.`, "success");
    } catch (error) {
      addToast("Login failed", error.message || "Unable to sign in with Google.", "error");
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${darkMode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-950"}`}>
      <div className={`w-full max-w-xl border rounded-3xl shadow-2xl p-8 ${cardClass}`}>
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏥</div>
          <h1 className="text-4xl font-bold">Smart Healthcare System</h1>
          <p className={`mt-3 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
            Sign in with Google and choose your role to continue.
          </p>
        </div>

        <div className="mb-6">
          <p className="font-semibold mb-3">Select Role</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {["Patient", "Hospital", "Admin"].map((item) => (
              <button
                key={item}
                onClick={() => setRole(item)}
                className={`px-4 py-3 rounded-2xl border font-semibold transition-all ${
                  role === item
                    ? "bg-cyan-600 text-white border-cyan-500 shadow-lg"
                    : darkMode
                    ? "bg-slate-950 border-slate-700 text-slate-300 hover:border-cyan-500"
                    : "bg-white border-slate-300 text-slate-700 hover:border-cyan-500"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full px-6 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}