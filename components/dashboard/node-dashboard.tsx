"use client";

import { Droplets } from "lucide-react";
import { InputControls } from "@/components/dashboard/input-controls";
import { MetricDisplay } from "@/components/dashboard/metric-display";
import { ReadingsTable } from "@/components/dashboard/readings-table";
import { NodeCamera } from "@/components/dashboard/node-camera";

interface StoredReading {
  timestamp: string;
  image?: string;
  nodeId?: string;
  h?: number;
  d?: number;
  diff?: number;
}

interface NodeDashboardProps {
  nodeId: string;
  title: string;
  history: StoredReading[];
  level?: number;
  containerDiameter: number | string;
  userThreshold: number | string;
  onDiameterChange: (val: number | string) => void;
  onThresholdChange: (val: number | string) => void;
  imageUrl?: string;
  onCaptureComplete: () => void;
  onSave: () => void;
  isSaving?: boolean;
  onDeleteEntry?: (timestamp: string) => void;
  onResetNode?: () => void;
}

function formatTimestamp(timestamp: string) {
  if (!timestamp.includes("T")) return timestamp;
  return timestamp.replace("T", " ").replace("Z", "").slice(0, 19);
}

export function NodeDashboard({
  nodeId,
  title,
  history,
  level,
  containerDiameter,
  userThreshold,
  onDiameterChange,
  onThresholdChange,
  imageUrl,
  onCaptureComplete,
  onSave,
  isSaving,
  onDeleteEntry,
  onResetNode
}: NodeDashboardProps) {
  const nodeHistory = history.filter(h => (h.nodeId ?? "node_1") === nodeId);
  
  const buildReadings = () => {
    if (!nodeHistory.length) return [];
    // nodeHistory is already descending order since backend unshifts.
    return nodeHistory.map((entry, index) => {
      const totalDepth = Number(containerDiameter) || 0;
      const sensorDistance = typeof entry.d === "number" ? entry.d : 0;
      
      // The ultrasonic sensor is at the top. 
      // Water Level = Total Depth of Container - Distance to Water Surface
      // If distance >= depth (empty container), clamp to 0
      const actualWaterLevel = Math.max(0, totalDepth - sensorDistance);
      
      // The 'difference' in the table was originally mapping to distance. We'll explicitly call it distance.
      const difference = sensorDistance;
      let isAlert = false;
        
      // If the water level falls below the threshold, trigger the ALERT
      if (typeof userThreshold === "number") {
        if (actualWaterLevel <= userThreshold) {
          isAlert = true;
        }
      }

      return {
        id: `${entry.timestamp}-${index}`,
        originalTimestamp: entry.timestamp,
        nodeId: entry.nodeId ?? "node_1",
        timestamp: formatTimestamp(entry.timestamp),
        containerDiameter: totalDepth,
        waterLevel: actualWaterLevel,
        difference: sensorDistance,
        status: (isAlert ? "alert" : "ok") as "ok" | "alert",
        videoUrl: entry.image ?? "#",
      };
    });
  };

  const totalDepth = Number(containerDiameter) || 0;
  const hasData = typeof level === "number";
  const currentWaterLevel = hasData ? Math.max(0, totalDepth - level) : undefined;
  const isAlert = hasData && typeof userThreshold === "number" ? currentWaterLevel! <= userThreshold : false;

  return (
    <div className="space-y-6 border border-border rounded-xl p-6 bg-card/50">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span className="flex h-3 w-3 rounded-full bg-emerald-500" />
          {title}
        </h2>
        {onResetNode && (
          <button 
            onClick={onResetNode}
            className="text-sm font-medium text-destructive hover:underline"
          >
            Reset Node Data
          </button>
        )}
      </div>
      
      <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
        {/* Left Column: Camera and Metrics */}
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Camera Input
            </h3>
            <NodeCamera
              nodeId={nodeId}
              isAlert={isAlert}
              initialImageUrl={imageUrl}
              onCaptureComplete={onCaptureComplete}
            />
          </div>
          
          <MetricDisplay
            label={`${title} Water Level`}
            value={hasData ? currentWaterLevel!.toFixed(1) : "--"}
            unit={hasData ? "cm" : ""}
            status={hasData ? (isAlert ? "alert" : "ok") : undefined}
            icon={<Droplets className="size-5" />}
          />
        </div>

        {/* Right Column: Inputs and Table */}
        <div className="space-y-6 flex flex-col">
          <InputControls
            containerDiameter={containerDiameter}
            userThreshold={userThreshold}
            onDiameterChange={onDiameterChange}
            onThresholdChange={onThresholdChange}
            onSave={onSave}
            isSaving={isSaving}
          />
          <div className="flex-1">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Readings
            </h3>
            <ReadingsTable 
              readings={buildReadings()} 
              alertThreshold={userThreshold} 
              onDeleteEntry={onDeleteEntry}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
