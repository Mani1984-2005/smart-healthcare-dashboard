import { Canvas } from "@react-three/fiber";
import { motion } from "framer-motion";
import { useTheme } from "../hooks/useTheme";
import { useToast } from "../hooks/usetoast.jsx";
import FloatOrb from "../three/FloatOrb";

export default function HomePage() {
  const { theme } = useTheme();
  const { addToast } = useToast();
  const dark = theme === "dark";

  const features = [
    ["Hospital Operations", "Unified bed management, staffing, resources and operational analytics."],
    ["AI Healthcare", "Clinical decision support and intelligent diagnostics integrated into workflows."],
    ["Patient Experience", "Appointments, reports and communication in a secure patient portal."],
    ["Security & Privacy", "Role-based access, audit trails and encrypted healthcare operations."],
  ];

  return (
    <main className="min-h-screen">
      <section className={`relative min-h-screen overflow-hidden ${dark ? "bg-slate-950" : "bg-slate-50"}`}>
        <Canvas
          className="absolute inset-0"
          camera={{ position: [0, 0, 10], fov: 60 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 10, 7]} intensity={0.8} castShadow />
          <FloatOrb size={1.5} color={dark ? "#14b8a6" : "#38bdf8"} delay={0} />
          <FloatOrb size={2} color={dark ? "#38bdf8" : "#8b5cf6"} delay={2} />
          <FloatOrb size={1} color={dark ? "#f472b6" : "#d946ef"} delay={4} />
        </Canvas>

        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/10 to-slate-950/30 pointer-events-none" />

        <div className="relative min-h-screen flex items-center justify-center px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-5xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-3 mb-8">
              <div className={`w-12 h-12 rounded-2xl ${dark ? "bg-primary-600" : "bg-primary-500"} flex items-center justify-center shadow-lg`}>
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3v18M3 12h18" strokeLinecap="round" />
                </svg>
              </div>
              <span className={`text-2xl font-extrabold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}>
                MediCare Pro
              </span>
            </div>

            <h1 className={`text-5xl md:text-7xl font-black leading-[1.05] mb-6 ${dark ? "text-white" : "text-slate-900"}`}>
              Transform Healthcare
              <span className="block mt-3 text-4xl md:text-5xl font-semibold text-primary-500">
                With Cinematic Intelligence
              </span>
            </h1>
            <p className={`mb-12 text-lg max-w-2xl mx-auto leading-relaxed ${dark ? "text-slate-300" : "text-slate-600"}`}>
              A next-generation healthcare operating system combining advanced diagnostics,
              real-time patient workflows, and intelligent hospital management in one secure platform.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-primary-600 text-white font-bold py-3 px-8 rounded-2xl shadow-lg"
                onClick={() => addToast("Welcome", "Sign in to access MediCare Pro", "info")}
              >
                Get Started
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="border-2 border-primary-500 text-primary-600 font-semibold py-3 px-8 rounded-2xl"
                onClick={() => addToast("Enterprise demo", "Contact enterprise@medicarepro.com", "info")}
              >
                Watch Demo
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className={`py-20 px-6 ${dark ? "bg-slate-900" : "bg-white"}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className={`text-3xl md:text-4xl font-black ${dark ? "text-white" : "text-slate-900"}`}>
              Platform Capabilities
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(([title, description], index) => (
              <motion.article
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: index * 0.08 }}
                className={`p-6 rounded-2xl border ${dark ? "bg-slate-950/70 border-slate-800" : "bg-slate-50 border-slate-200"}`}
              >
                <h3 className={`font-bold text-lg mb-2 ${dark ? "text-white" : "text-slate-900"}`}>{title}</h3>
                <p className={`text-sm leading-relaxed ${dark ? "text-slate-400" : "text-slate-600"}`}>{description}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
