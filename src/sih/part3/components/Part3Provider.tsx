import { ReactNode, useState } from "react";
import { useAuthStore } from "../../store/authStore.js";
import { createPart3Client } from "../services/client";
import { Part3ClientContext } from "../services/clientContext";

/** Gives Part 3 screens their own API client. Reads (never writes) the signed-in user to request a Part 3 demo session. */
export default function Part3Provider({ children }: { children: ReactNode }) {
  const [client] = useState(() =>
    createPart3Client({
      getIdentity: () => {
        const user = useAuthStore.getState().user as { name?: string; email?: string; role?: string } | null;
        return user?.role ? { name: user.name || user.email || "Clinician", role: user.role } : null;
      },
    }),
  );
  return <Part3ClientContext.Provider value={client}>{children}</Part3ClientContext.Provider>;
}
