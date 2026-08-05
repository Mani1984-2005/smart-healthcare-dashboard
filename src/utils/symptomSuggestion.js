export function getSymptomSuggestion(symptoms) {
  const text = symptoms.toLowerCase();

  if (!text.trim()) return null;

  if (text.includes("chest") || text.includes("heart")) {
    return {
      level: "High Priority",
      doctor: "Cardiologist",
      advice: "Chest or heart-related symptoms may need quick medical attention."
    };
  }

  if (text.includes("skin") || text.includes("allergy") || text.includes("rash")) {
    return {
      level: "Normal Priority",
      doctor: "Dermatologist",
      advice: "Skin or allergy symptoms can be checked by a dermatologist."
    };
  }

  if (text.includes("headache") || text.includes("migraine") || text.includes("brain")) {
    return {
      level: "Medium Priority",
      doctor: "Neurologist",
      advice: "Headache or migraine symptoms may need neurological consultation."
    };
  }

  if (text.includes("bone") || text.includes("fracture") || text.includes("joint") || text.includes("leg")) {
    return {
      level: "Medium Priority",
      doctor: "Orthopedic",
      advice: "Bone or joint-related symptoms may need orthopedic care."
    };
  }

  if (text.includes("fever") || text.includes("cold") || text.includes("cough")) {
    return {
      level: "Normal Priority",
      doctor: "General Doctor",
      advice: "Fever, cold, or cough may need general consultation and monitoring."
    };
  }

  return {
    level: "General Checkup",
    doctor: "Available Doctor",
    advice: "Please consult an available doctor for proper medical guidance."
  };
}