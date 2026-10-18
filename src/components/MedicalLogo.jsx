// src/components/MedicalLogo.jsx

export default function MedicalLogo({ className = "w-10 h-10" }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" className="fill-cyan-600" />
      <path d="M24 12V36M12 24H36" stroke="white" strokeWidth="4" strokeLinecap="round" />
      <path d="M16 20C16 17.7909 17.7909 16 20 16H28C30.2091 16 32 17.7909 32 20V28C32 30.2091 30.2091 32 28 32H20C17.7909 32 16 30.2091 16 28V20Z" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
    </svg>
  );
}
