'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

const SUGGESTED_INTERESTS = [
  'Food Forests', 'Composting', 'Water Harvesting', 'Soil Health',
  'Native Plants', 'Permaculture Design', 'Urban Farming', 'Agroforestry',
  'Seed Saving', 'Beekeeping', 'Mushroom Growing', 'Regenerative Agriculture',
  'Aquaponics', 'Hugelkultur', 'Companion Planting', 'Fermentation',
  'Natural Building', 'Wildlife Habitat', 'Medicinal Plants', 'Cover Cropping',
];

interface InterestSelectorProps {
  value: string[];
  onChange: (interests: string[]) => void;
}

export function InterestSelector({ value, onChange }: InterestSelectorProps) {
  const [inputValue, setInputValue] = useState('');

  const addInterest = (interest: string) => {
    const trimmed = interest.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue('');
  };

  const removeInterest = (interest: string) => {
    onChange(value.filter((i) => i !== interest));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addInterest(inputValue);
    }
  };

  const filteredSuggestions = SUGGESTED_INTERESTS.filter(
    (s) =>
      !value.includes(s) &&
      (!inputValue || s.toLowerCase().includes(inputValue.toLowerCase()))
  );

  return (
    <div className="space-y-3">
      {/* Selected interests */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((interest) => (
            <Badge key={interest} variant="secondary" className="gap-1 pr-1">
              {interest}
              <button
                type="button"
                onClick={() => removeInterest(interest)}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input */}
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type an interest and press Enter..."
        className="text-sm"
      />

      {/* Suggestions */}
      <div className="flex flex-wrap gap-1.5">
        {filteredSuggestions.slice(0, 10).map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => addInterest(suggestion)}
            className="text-xs px-2 py-1 rounded-full border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            + {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
