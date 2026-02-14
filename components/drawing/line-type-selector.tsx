'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LINE_TYPES } from '@/lib/map/line-types';

interface LineTypeSelectorProps {
  value: string;
  onChange: (type: string) => void;
}

export function LineTypeSelector({ value, onChange }: LineTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="line-type">Line Type</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="line-type">
          <SelectValue placeholder="Select line type" />
        </SelectTrigger>
        <SelectContent>
          {Object.values(LINE_TYPES).map(type => (
            <SelectItem key={type.value} value={type.value}>
              <div>
                <div className="font-medium">{type.label}</div>
                <div className="text-xs text-muted-foreground">
                  {type.description}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
