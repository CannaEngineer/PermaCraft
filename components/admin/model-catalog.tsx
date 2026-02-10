'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AddModelForm } from './add-model-form';
import { Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  model_id: string;
  category: string;
  cost_description: string;
  description: string;
  is_active: number;
}

export function ModelCatalog() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadModels = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/ai-models');
      if (!response.ok) throw new Error('Failed to load models');
      const data = await response.json();
      setModels(data.models);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load models');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}"?`)) return;

    try {
      const response = await fetch(`/api/admin/ai-models/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete model');

      toast.success('Model removed successfully');
      loadModels();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete model');
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      text: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
      vision: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
      image_generation: 'bg-pink-500/10 text-pink-700 dark:text-pink-400',
      image_prompt: 'bg-green-500/10 text-green-700 dark:text-green-400',
    };

    return (
      <Badge className={colors[category] || ''}>
        {category.replace('_', ' ')}
      </Badge>
    );
  };

  const groupedModels = models.reduce((acc, model) => {
    if (!acc[model.category]) acc[model.category] = [];
    acc[model.category].push(model);
    return acc;
  }, {} as Record<string, AIModel[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">AI Model Catalog</h3>
          <p className="text-sm text-muted-foreground">
            Manage available AI models. Add new models to use them in your settings.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadModels} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <AddModelForm onSuccess={loadModels} />
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Loading models...
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {Object.entries(groupedModels).map(([category, categoryModels]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {getCategoryBadge(category)}
                  <span className="capitalize">{category.replace('_', ' ')} Models</span>
                  <Badge variant="outline">{categoryModels.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categoryModels.map((model) => (
                    <div
                      key={model.id}
                      className="flex items-start justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{model.name}</p>
                          <Badge variant="secondary" className="text-xs">
                            {model.provider}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mb-1">
                          {model.model_id}
                        </p>
                        {model.description && (
                          <p className="text-sm text-muted-foreground">{model.description}</p>
                        )}
                        {model.cost_description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            💰 {model.cost_description}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(model.id, model.name)}
                        className="ml-2"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {Object.keys(groupedModels).length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No models found. Add your first model to get started.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
