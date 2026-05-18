"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertBanner } from "@/components/dashboard/alert-banner";
import { BatteryStatus } from "@/components/dashboard/battery-status";
import { NodeDashboard } from "@/components/dashboard/node-dashboard";
import { useToast } from "@/hooks/use-toast";

type StoredReading = {
  timestamp: string;
  image?: string;
  nodeId?: string;
  h?: number;
  d?: number;
  diff?: number;
};

const DEFAULT_DIAMETER = 10.4;
const DEFAULT_WATER_LEVEL = 10.7;
const DEFAULT_USER_THRESHOLD = 2.0;

function latestCaptureForNode(history: StoredReading[], nodeId: string) {
  for (let i = history.length - 1; i >= 0; i--) {
    if ((history[i].nodeId ?? "node_1") === nodeId) {
      return history[i];
    }
  }
  return undefined;
}

export default function WaterLevelDashboard() {
  const [history, setHistory] = useState<StoredReading[]>([]);
  const [isErrorState, setIsErrorState] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const { toast } = useToast();

  // Per-node states for inputs
  const [node1Config, setNode1Config] = useState<{ diameter: number | string; threshold: number | string }>({ diameter: DEFAULT_DIAMETER, threshold: DEFAULT_USER_THRESHOLD });
  const [node2Config, setNode2Config] = useState<{ diameter: number | string; threshold: number | string }>({ diameter: DEFAULT_DIAMETER, threshold: DEFAULT_USER_THRESHOLD });

  const [isSaving, setIsSaving] = useState(false);
  const [globalInterval, setGlobalInterval] = useState<number | string>(30);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('/api/system/config?ts=' + Date.now(), { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.interval) setGlobalInterval(data.interval);
          if (data.node_1) setNode1Config(data.node_1);
          if (data.node_2) setNode2Config(data.node_2);
        }
      } catch (e) {
        console.error("Failed to load config:", e);
      } finally {
        setIsConfigLoaded(true);
      }
    }
    loadConfig();
  }, []);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/system/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval: globalInterval, node_1: node1Config, node_2: node2Config })
      });
      toast({
        title: "Configuration Saved",
        description: "Measurement inputs successfully updated.",
      });
    } catch (e) {
      console.error("Failed to save config:", e);
      toast({
        title: "Save Failed",
        description: "Could not save configuration to backend.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/data.json?ts=' + Date.now(), { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.history)) setHistory(data.history);
      }
    } catch (err: any) {
      console.error("Data history load failed:", err);
      if (!isErrorState) {
        toast({
          title: "Connection Error",
          description: err?.message || "Data history load failed.",
          variant: "destructive",
        });
        setIsErrorState(true);
      }
    }
  }, [isErrorState, toast]);

  const fetchStateData = useCallback(async () => {
    try {
      const res = await fetch('/api/system/node', { cache: "no-store" });
      if (!res.ok) {
        if (!isErrorState) {
          toast({
            title: "Connection Error",
            description: `API returned an error: ${res.statusText}`,
            variant: "destructive",
          });
          setIsErrorState(true);
        }
        return;
      }
      setIsErrorState(false);
      
      const nodes = await res.json();

      setHistory((prev) => {
        const newHistory = [...prev];
        const now = new Date().toISOString();
        let changed = false;

        const updateNodeHistory = (nodeId: string, state: any) => {
          if (!state) return;
          const last = latestCaptureForNode(newHistory, nodeId);
          if (!last || last.h !== state.h || last.d !== state.d || last.diff !== state.diff) {
            newHistory.push({
              timestamp: now,
              nodeId,
              h: state.h,
              d: state.d,
              diff: state.diff,
            });
            changed = true;
          }
        };

        updateNodeHistory("node_1", nodes?.node_1);
        updateNodeHistory("node_2", nodes?.node_2);

        if (newHistory.length > 50) return newHistory.slice(newHistory.length - 50);
        return changed ? newHistory : prev;
      });

    } catch (error: any) {
      console.error("Failed to load state data:", error);
      if (!isErrorState) {
        toast({
          title: "Connection Error",
          description: error?.message || "Could not reach data API.",
          variant: "destructive",
        });
        setIsErrorState(true);
      }
    }
  }, [isErrorState, toast]);

  useEffect(() => {
    fetchHistory().finally(() => setInitialLoadDone(true));
  }, [fetchHistory]);

  useEffect(() => {
    if (!initialLoadDone) return;
    
    void fetchStateData();
    const intervalMs = typeof globalInterval === 'number' ? globalInterval * 1000 : 30000;
    const intervalId = window.setInterval(() => {
      fetchHistory();
      fetchStateData();
    }, intervalMs);
    return () => window.clearInterval(intervalId);
  }, [fetchStateData, fetchHistory, initialLoadDone, globalInterval]);

  const node1Latest = latestCaptureForNode(history, "node_1");
  const node2Latest = latestCaptureForNode(history, "node_2");

  // Extract the raw distance measured by the ultrasonic sensor (from the top)
  const node1Distance = node1Latest?.d;
  const node2Distance = node2Latest?.d;
  
  // Evaluate alerts directly based on Actual Water Level
  const node1CurrentLevel = typeof node1Distance === "number" ? Math.max(0, Number(node1Config.diameter) - node1Distance) : undefined;
  const node2CurrentLevel = typeof node2Distance === "number" ? Math.max(0, Number(node2Config.diameter) - node2Distance) : undefined;

  const node1Alert = typeof node1Config.threshold === "number" && node1CurrentLevel !== undefined ? node1CurrentLevel <= node1Config.threshold : false;
  const node2Alert = typeof node2Config.threshold === "number" && node2CurrentLevel !== undefined ? node2CurrentLevel <= node2Config.threshold : false;

  const node1ImageUrl = Array([...history]).reverse().find(h => (h.nodeId ?? "node_1") === "node_1" && h.image)?.image;
  const node2ImageUrl = Array([...history]).reverse().find(h => (h.nodeId ?? "node_1") === "node_2" && h.image)?.image;

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Dashboard</h1>
        </div>
        <BatteryStatus isOnline={!isErrorState} />
      </header>

      {(node1Alert || node2Alert) && (
        <AlertBanner
          title="Water Level Alert"
          description={`Water level is ${node1Alert ? "Node 1" : "Node 2"} below threshold.`}
        />
      )}

      <div className="bg-card/50 border border-border p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Global Settings</h2>
          <p className="text-sm text-muted-foreground">Configure the polling interval for continuous background monitoring.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium whitespace-nowrap">Polling Interval (s):</label>
          <input 
            type="number" 
            className="flex h-9 w-24 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={globalInterval}
            onChange={(e) => setGlobalInterval(e.target.value === "" ? "" : parseFloat(e.target.value))}
            min={5}
          />
          <button 
            onClick={handleSaveConfig} 
            disabled={isSaving}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="grid gap-8">
        <NodeDashboard
          nodeId="node_1"
          title="Node 1"
          history={history}
          level={node1Distance}
          containerDiameter={node1Config.diameter}
          userThreshold={node1Config.threshold}
          onDiameterChange={(val) => setNode1Config(prev => ({ ...prev, diameter: val }))}
          onThresholdChange={(val) => setNode1Config(prev => ({ ...prev, threshold: val }))}
          imageUrl={node1ImageUrl}
          onCaptureComplete={fetchHistory}
          onSave={handleSaveConfig}
          isSaving={isSaving}
        />

        <NodeDashboard
          nodeId="node_2"
          title="Node 2"
          history={history}
          level={node2Distance}
          containerDiameter={node2Config.diameter}
          userThreshold={node2Config.threshold}
          onDiameterChange={(val) => setNode2Config(prev => ({ ...prev, diameter: val }))}
          onThresholdChange={(val) => setNode2Config(prev => ({ ...prev, threshold: val }))}
          imageUrl={node2ImageUrl}
          onCaptureComplete={fetchHistory}
          onSave={handleSaveConfig}
          isSaving={isSaving}
        />
      </div>
    </div>
  );
}
