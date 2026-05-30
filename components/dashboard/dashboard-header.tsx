"use client";

import { AlertBanner } from "@/components/dashboard/alert-banner";
import { BatteryStatus } from "@/components/dashboard/battery-status";

interface DashboardHeaderProps {
  isOnline: boolean;
  node1Alert: boolean;
  node2Alert: boolean;
}

export function DashboardHeader({ isOnline, node1Alert, node2Alert }: DashboardHeaderProps) {
  return (
    <>
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Dashboard</h1>
        </div>
        <BatteryStatus isOnline={isOnline} />
      </header>

      {(node1Alert || node2Alert) && (
        <AlertBanner
          title="Water Level Alert"
          description={`Water level is ${node1Alert ? "Node 1" : "Node 2"} below threshold.`}
        />
      )}
    </>
  );
}
