"use client";

import { AlertBanner } from "@/components/dashboard/alert-banner";
import { BatteryStatus } from "@/components/dashboard/battery-status";

interface DashboardHeaderProps {
  isOnline: boolean;
  isDifferenceAlert: boolean;
  difference?: number;
  threshold?: number;
}

export function DashboardHeader({ isOnline, isDifferenceAlert, difference, threshold }: DashboardHeaderProps) {
  return (
    <>
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Dashboard</h1>
        </div>
        <BatteryStatus isOnline={isOnline} />
      </header>

      <AlertBanner
        isAlert={isDifferenceAlert}
        difference={difference}
        threshold={threshold}
      />
    </>
  );
}
