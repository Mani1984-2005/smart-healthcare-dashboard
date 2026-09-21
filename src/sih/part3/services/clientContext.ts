import { createContext, useContext } from "react";
import type { Part3Client } from "./client";

export const Part3ClientContext = createContext<Part3Client | null>(null);

export function usePart3Client(): Part3Client {
  const client = useContext(Part3ClientContext);
  if (!client) throw new Error("usePart3Client must be used inside <Part3Provider>.");
  return client;
}
