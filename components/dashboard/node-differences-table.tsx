"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface StoredReading {
  timestamp: string;
  image?: string;
  nodeId?: string;
  h?: number;
  d?: number;
  diff?: number;
}

interface NodeDifferencesTableProps {
  history: StoredReading[];
  node1Diameter: number;
  node2Diameter: number;
  differenceThreshold: number | string;
}

interface PairedRow {
  id: string;
  timestamp: string;
  node1WaterLevel: number;
  node2WaterLevel: number;
  difference: number;
  exceedsThreshold: boolean;
}

function formatTimestamp(timestamp: string) {
  if (!timestamp.includes("T")) return timestamp;
  return timestamp.replace("T", " ").replace("Z", "").slice(0, 19);
}

function buildPairedRows(
  history: StoredReading[],
  node1Diameter: number,
  node2Diameter: number,
  threshold: number | string
): PairedRow[] {
  const node1Readings = history.filter(h => (h.nodeId ?? "node_1") === "node_1");
  const node2Readings = history.filter(h => (h.nodeId ?? "node_1") === "node_2");

  if (!node1Readings.length || !node2Readings.length) return [];

  // For each node1 reading, find the closest node2 reading by timestamp
  const paired: PairedRow[] = [];
  const usedNode2Indices = new Set<number>();

  for (const n1 of node1Readings) {
    const n1Time = new Date(n1.timestamp).getTime();
    let bestIdx = -1;
    let bestDelta = Infinity;

    for (let j = 0; j < node2Readings.length; j++) {
      if (usedNode2Indices.has(j)) continue;
      const delta = Math.abs(new Date(node2Readings[j].timestamp).getTime() - n1Time);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestIdx = j;
      }
    }

    if (bestIdx === -1) continue;
    usedNode2Indices.add(bestIdx);

    const n2 = node2Readings[bestIdx];
    const n1Distance = typeof n1.d === "number" ? n1.d : 0;
    const n2Distance = typeof n2.d === "number" ? n2.d : 0;
    const n1WaterLevel = Math.max(0, node1Diameter - n1Distance);
    const n2WaterLevel = Math.max(0, node2Diameter - n2Distance);
    const diff = Math.abs(n1WaterLevel - n2WaterLevel);

    paired.push({
      id: `${n1.timestamp}-${n2.timestamp}`,
      timestamp: formatTimestamp(n1.timestamp),
      node1WaterLevel: n1WaterLevel,
      node2WaterLevel: n2WaterLevel,
      difference: diff,
      exceedsThreshold: typeof threshold === "number" ? diff > threshold : false,
    });
  }

  return paired;
}

export function NodeDifferencesTable({
  history,
  node1Diameter,
  node2Diameter,
  differenceThreshold,
}: NodeDifferencesTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const rows = buildPairedRows(history, node1Diameter, node2Diameter, differenceThreshold);
  const totalPages = Math.max(1, Math.ceil(rows.length / itemsPerPage));
  const currentRows = rows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <Card className="p-6 border border-border">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          Node Differences
        </h2>
        {totalPages > 1 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-semibold text-foreground">
                Timestamp
              </th>
              <th className="text-right py-3 px-4 font-semibold text-foreground">
                Node 1 Water Level (cm)
              </th>
              <th className="text-right py-3 px-4 font-semibold text-foreground">
                Node 2 Water Level (cm)
              </th>
              <th className="text-right py-3 px-4 font-semibold text-foreground">
                Difference (cm)
              </th>
            </tr>
          </thead>
          <tbody>
            {currentRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-muted-foreground">
                  No paired readings available yet.
                </td>
              </tr>
            ) : (
              currentRows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-border transition-colors ${
                    row.exceedsThreshold
                      ? "bg-destructive/5 hover:bg-destructive/10"
                      : "hover:bg-secondary/50"
                  }`}
                >
                  <td className="py-3 px-4 text-foreground">
                    {row.timestamp}
                  </td>
                  <td className="py-3 px-4 text-right text-foreground">
                    {row.node1WaterLevel.toFixed(1)}
                  </td>
                  <td className="py-3 px-4 text-right text-foreground">
                    {row.node2WaterLevel.toFixed(1)}
                  </td>
                  <td className={`py-3 px-4 text-right font-semibold ${
                    row.exceedsThreshold ? "text-destructive" : "text-foreground"
                  }`}>
                    {row.difference.toFixed(1)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
