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
  {
    path: "/queue",
    label: "Queue",
    element: lazy(() => import("../pages/Queue.tsx")),
    roles: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST],
  },
];
