'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Loader2, MapPin, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface AddressSearchProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

export function AddressSearch({ onLocationSelect }: AddressSearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Close results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchAddress = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    try {
      // Use OpenStreetMap's Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(searchQuery)}&` +
          `format=json&` +
          `limit=5&` +
          `addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Permaculture.Studio/1.0', // Required by Nominatim
          },
        }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data: SearchResult[] = await response.json();
      setResults(data);
      setShowResults(data.length > 0);
    } catch (error) {
      console.error('Address search error:', error);
      toast({
        title: 'Search Error',
        description: 'Failed to search for address. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);

    // Debounce search
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      searchAddress(value);
    }, 500);
  };

  const handleSelectResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    onLocationSelect(lat, lng, result.display_name);

    setQuery(result.display_name);
    setShowResults(false);
    setResults([]);

    toast({
      title: 'Location Set',
      description: `Centered map on: ${result.display_name}`,
    });
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div className="relative w-full" ref={resultsRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search for an address or location..."
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          className="pl-9 pr-20"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isSearching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {query && !isSearching && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Search Results Dropdown */}
      {showResults && results.length > 0 && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg max-h-80 overflow-auto">
          <CardContent className="p-2">
            {results.map((result, index) => (
              <button
                key={index}
                onClick={() => handleSelectResult(result)}
                className="w-full text-left p-3 hover:bg-accent rounded-md transition-colors flex items-start gap-2"
              >
                <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{result.display_name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{result.type}</div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
