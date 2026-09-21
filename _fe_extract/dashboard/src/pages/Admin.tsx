import { useEffect } from "react";
import { PageHeader } from "../components/ui";
import { useAdminStore } from "../stores/adminStore.ts";
import HospitalProfileForm from "../components/admin/HospitalProfileForm.tsx";
import DepartmentsPanel from "../components/admin/DepartmentsPanel.tsx";
import ServiceChargesPanel from "../components/admin/ServiceChargesPanel.tsx";
import StaffRolesPanel from "../components/admin/StaffRolesPanel.tsx";

export default function Admin() {
  const { hospitalProfile, error, loadAdminData, updateHospitalProfile } = useAdminStore();

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Admin control center"
        description="Hospital branding, departments, billing defaults, and staff role assignments."
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950 dark:text-rose-100">
          <p className="font-semibold">Sync issue</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      <HospitalProfileForm profile={hospitalProfile} onSave={updateHospitalProfile} />
      <DepartmentsPanel />
      <ServiceChargesPanel />
      <StaffRolesPanel />
    </div>
  );
}
