// Part 3 — Medical Documents & OCR. Frontend entry: the only thing the rest of the app needs to import.
import { lazy } from "react";
import type { AppRoute } from "../app/routes";
import { ROLES } from "../app/roles.js";

const clinical = [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE];

export const part3Routes: AppRoute[] = [
  { path: "/medical-documents", label: "Medical Documents", element: lazy(() => import("./pages/MedicalDocumentsPage")), roles: clinical },
  // Detail page: reachable from the list; intentionally not listed in the sidebar (the sidebar shows only paths it has an icon for).
  { path: "/medical-documents/:documentId", label: "Medical Document", element: lazy(() => import("./pages/DocumentWorkspacePage")), roles: clinical },
];
