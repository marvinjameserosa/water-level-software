"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

interface Reading {
  id: string;
  originalTimestamp: string;
  nodeId: string;
  timestamp: string;
  containerDiameter: number;
  waterLevel: number;
  difference: number;
  status: "ok" | "alert";
  videoUrl: string;
}

interface ReadingsTableProps {
  readings: Reading[];
  alertThreshold: number | string;
  onDeleteEntry?: (timestamp: string) => void;
}

export function ReadingsTable({ readings, alertThreshold, onDeleteEntry }: ReadingsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const totalPages = Math.ceil(readings.length / itemsPerPage);
  const currentReadings = readings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <Card className="p-6 border border-border">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          Past Readings
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
                Node
              </th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">
                Timestamp
              </th>
              <th className="text-right py-3 px-4 font-semibold text-foreground">
                Total Depth (cm)
              </th>
              <th className="text-right py-3 px-4 font-semibold text-foreground" title="Distance from the sensor at the top down to the water surface">
                Distance to Water (cm)
              </th>
              <th className="text-right py-3 px-4 font-semibold text-foreground">
                Water Level (cm)
              </th>
              <th className="text-center py-3 px-4 font-semibold text-foreground">
                Status
              </th>
              <th className="text-center py-3 px-4 font-semibold text-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {currentReadings.map((reading) => (
              <tr
                key={reading.id}
                className="border-b border-border hover:bg-secondary/50 transition-colors"
              >
                <td className="py-3 px-4 text-foreground font-medium">
                  {reading.nodeId}
                </td>
                <td className="py-3 px-4 text-foreground">
                  {reading.timestamp}
                </td>
                <td className="py-3 px-4 text-right text-foreground">
                  {reading.containerDiameter.toFixed(1)}
                </td>
                <td className="py-3 px-4 text-right font-semibold text-foreground">
                  {reading.difference.toFixed(1)}
                </td>
                <td className="py-3 px-4 text-right text-foreground">
                  {reading.waterLevel.toFixed(1)}
                </td>
                <td className="py-3 px-4 text-center">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      (typeof alertThreshold === "number" && reading.waterLevel <= alertThreshold)
                        ? "bg-destructive/20 text-destructive"
                        : "bg-success/20 text-success"
                    }`}
                  >
                    {(typeof alertThreshold === "number" && reading.waterLevel <= alertThreshold) ? "ALERT" : "OK"}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(reading.videoUrl, "_blank")}
                      disabled={!reading.videoUrl || reading.videoUrl === "#"}
                      title="View Photo"
                    >
                      <Eye className="size-4" />
                    </Button>
                    {onDeleteEntry && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (window.confirm("Delete this entry?")) {
                            onDeleteEntry(reading.originalTimestamp);
                          }
                        }}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title="Delete Entry"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
