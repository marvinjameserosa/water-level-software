"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface InputControlsProps {
  containerDiameter: number | string;
  userThreshold: number | string;
  onDiameterChange: (value: number | string) => void;
  onThresholdChange: (value: number | string) => void;
  onSave: () => void;
  isSaving?: boolean;
}

export function InputControls({
  containerDiameter,
  userThreshold,
  onDiameterChange,
  onThresholdChange,
  onSave,
  isSaving
}: InputControlsProps) {
  return (
    <Card className="p-6 border border-border">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          Measurement Inputs
        </h2>
        <Button onClick={onSave} disabled={isSaving} size="sm">
          {isSaving ? "Saving..." : "Save Config"}
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Container Depth / Total Height [cm]
          </label>
          <Input
            type="number"
            value={containerDiameter}
            onChange={(e) => onDiameterChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
            step="0.1"
            className="bg-card"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Alert me if Water Level falls below [cm]
          </label>
          <Input
            type="number"
            value={userThreshold}
            onChange={(e) => onThresholdChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
            step="0.1"
            className="bg-card"
          />
        </div>
      </div>
    </Card>
  );
}
