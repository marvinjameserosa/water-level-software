"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface InputControlsProps {
  containerDiameter: number | string;
  onDiameterChange: (value: number | string) => void;
  onSave: () => void;
  isSaving?: boolean;
}

export function InputControls({
  containerDiameter,
  onDiameterChange,
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
    </Card>
  );
}
