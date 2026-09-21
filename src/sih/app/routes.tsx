import { lazy, LazyExoticComponent, ComponentType } from "react";
import { ROLES } from "./roles.js";
import { part3Routes } from "../part3";

export interface AppRoute {
  path: string;
  label: string;
  element: LazyExoticComponent<ComponentType<unknown>>;
  roles: string[];
}

export const ROUTES: AppRoute[] = [
  {
    path: "/dashboard",
    label: "Dashboard",
    element: lazy(() => import("../pages/Dashboard.tsx")),
    roles: Object.values(ROLES),
  },
  {
    path: "/patients",
    label: "Patients",
    element: lazy(() => import("../pages/Patients.tsx")),
    roles: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST],
  },
  {
    path: "/clinical-intelligence",
    label: "Clinical Intelligence",
    element: lazy(() => import("../pages/ClinicalIntelligence.tsx")),
    roles: [ROLES.DOCTOR, ROLES.NURSE],
  },
  {
    path: "/doctors",
    label: "Doctors",
    element: lazy(() => import("../pages/Doctors.tsx")),
    roles: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST],
  },
  {
    path: "/appointments",
    label: "Appointments",
    element: lazy(() => import("../pages/Appointments.tsx")),
    roles: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST, ROLES.PATIENT],
  },
  {
    path: "/laboratory",
    label: "Laboratory",
    element: lazy(() => import("../pages/Laboratory.tsx")),
    roles: [ROLES.ADMIN, ROLES.LAB_TECHNICIAN, ROLES.DOCTOR, ROLES.NURSE],
  },
  {
    path: "/pharmacy",
    label: "Pharmacy",
    element: lazy(() => import("../pages/Pharmacy.tsx")),
    roles: [ROLES.ADMIN, ROLES.PHARMACIST, ROLES.DOCTOR, ROLES.NURSE],
  },
  {
    path: "/billing",
    label: "Billing",
    element: lazy(() => import("../pages/Billing.tsx")),
    roles: [ROLES.ADMIN, ROLES.BILLING, ROLES.RECEPTIONIST],
  },
  {
    path: "/physician-workspace",
    label: "Physician Workspace",
    element: lazy(() => import("../pages/PhysicianWorkspace.tsx")),
    roles: [ROLES.DOCTOR, ROLES.ADMIN, ROLES.NURSE],
  },
  {
    path: "/reports",
    label: "Reports",
    element: lazy(() => import("../pages/Reports.tsx")),
    roles: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE],
  },
  {
    path: "/admin",
    label: "Admin",
    element: lazy(() => import("../pages/Admin.tsx")),
    roles: [ROLES.ADMIN],
  },
  // Part 3 — Medical Documents & OCR (self-contained module; see src/part3/index.ts)
  ...part3Routes,
];
