import { lazy, LazyExoticComponent, ComponentType } from "react";
import { ROLES } from "./roles.js";

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
    path: "/appointments",
    label: "Appointments",
    element: lazy(() => import("../pages/Appointments.tsx")),
    roles: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST, ROLES.PATIENT],
  },
  {
    path: "/queue",
    label: "Queue",
    element: lazy(() => import("../pages/Queue.tsx")),
    roles: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST],
  },
  {
    path: "/clinical",
    label: "Clinical",
    element: lazy(() => import("../pages/Clinical.tsx")),
    roles: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE],
  },
  {
    path: "/clinical-encounter",
    label: "Clinical Encounter",
    element: lazy(() => import("../pages/ClinicalEncounter.tsx")),
    roles: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE],
  },
  {
    path: "/doctors",
    label: "Doctors",
    element: lazy(() => import("../pages/Doctors.tsx")),
    roles: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST],
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
    path: "/payments",
    label: "Payments",
    element: lazy(() => import("../pages/Payments.tsx")),
    roles: [ROLES.ADMIN, ROLES.BILLING, ROLES.RECEPTIONIST],
  },
  {
    path: "/analytics",
    label: "Analytics",
    element: lazy(() => import("../pages/Analytics.tsx")),
    roles: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST],
  },
  {
    path: "/reports",
    label: "Reports",
    element: lazy(() => import("../pages/Reports.tsx")),
    roles: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE],
  },
  {
    path: "/notifications",
    label: "Notifications",
    element: lazy(() => import("../pages/Notifications.tsx")),
    roles: Object.values(ROLES),
  },
  {
    path: "/admin",
    label: "Admin",
    element: lazy(() => import("../pages/Admin.tsx")),
    roles: [ROLES.ADMIN],
  },
];
