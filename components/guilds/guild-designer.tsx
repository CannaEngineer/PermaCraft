'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CompanionSpeciesCard } from './companion-species-card';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Save, Loader2 } from 'lucide-react';

interface GuildDesignerProps {
  farmId: string;
  focalSpecies: any;
  farmContext: {
    climate_zone: string;
    soil_type?: string;
    rainfall_inches?: number;
  };
}

export function GuildDesigner({ farmId, focalSpecies, farmContext }: GuildDesignerProps) {
  const [companions, setCompanions] = useState<any[]>([]);
  const [guildName, setGuildName] = useState('');
  const [preferNative, setPreferNative] = useState(true);
  const [edibleFocus, setEdibleFocus] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function handleGetSuggestions() {
    setSuggesting(true);

    try {
      const response = await fetch('/api/guilds/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          focalSpecies: {
            scientific_name: focalSpecies.scientific_name,
            common_name: focalSpecies.common_name,
            native_region: focalSpecies.native_region,
            layer: focalSpecies.layer
          },
          farmContext,
          constraints: {
            prefer_native: preferNative,
            edible_focus: edibleFocus,
            max_companions: 6
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get suggestions');
      }

      const data = await response.json();

      setGuildName(data.suggestion.guild_name || `${focalSpecies.common_name} Guild`);
      setCompanions(data.suggestion.companions || []);

      toast({
        title: 'Guild suggested',
        description: `${data.suggestion.companions?.length || 0} companions recommended`
      });
    } catch (error) {
      console.error('Failed to get guild suggestions:', error);
      toast({
        title: 'Suggestion failed',
        variant: 'destructive'
      });
    } finally {
      setSuggesting(false);
    }
  }

  async function handleSaveGuild() {
    if (companions.length === 0) {
      toast({ title: 'Add companions first', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      // Save as custom guild template
      const response = await fetch('/api/guilds/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: guildName,
          focal_species_id: focalSpecies.id,
          companion_species: companions,
          is_public: false
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save guild');
      }

      toast({ title: 'Guild template saved' });
    } catch (error) {
      console.error('Failed to save guild:', error);
      toast({ title: 'Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  function handleRemoveCompanion(index: number) {
    setCompanions(prev => prev.filter((_, i) => i !== index));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Guild Designer
        </CardTitle>
        <CardDescription>
          AI-powered companion planting suggestions for {focalSpecies.common_name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="guild-name">Guild Name</Label>
          <Input
            id="guild-name"
            value={guildName}
            onChange={(e) => setGuildName(e.target.value)}
            placeholder="e.g., Apple Tree Standard Guild"
          />
        </div>

        <div className="space-y-2 border-b pb-4">
          <Label>Preferences:</Label>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="prefer-native"
              checked={preferNative}
              onCheckedChange={(checked) => setPreferNative(checked as boolean)}
            />
            <Label htmlFor="prefer-native" className="cursor-pointer">
              Prefer native species
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="edible-focus"
              checked={edibleFocus}
              onCheckedChange={(checked) => setEdibleFocus(checked as boolean)}
            />
            <Label htmlFor="edible-focus" className="cursor-pointer">
              Focus on edible plants
            </Label>
          </div>
        </div>

        <Button
          onClick={handleGetSuggestions}
          disabled={suggesting}
          className="w-full"
          variant="default"
        >
          {suggesting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Getting AI Suggestions...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Get AI Suggestions
            </>
          )}
        </Button>

        {companions.length > 0 && (
          <>
            <div className="space-y-3">
              <Label>Companion Species:</Label>
              {companions.map((companion, index) => (
                <CompanionSpeciesCard
                  key={index}
                  companion={companion}
                  onRemove={() => handleRemoveCompanion(index)}
                />
              ))}
            </div>

            <Button
              onClick={handleSaveGuild}
              disabled={saving}
              className="w-full"
              variant="outline"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Guild Template
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
