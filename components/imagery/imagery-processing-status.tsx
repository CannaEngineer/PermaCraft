'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';

interface ImageryProcessingStatusProps {
  farmId: string;
  imageryId: string;
}

export function ImageryProcessingStatus({ farmId, imageryId }: ImageryProcessingStatusProps) {
  const [status, setStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Don't poll if already in terminal state
    if (status === 'completed' || status === 'failed') {
      return;
    }

    const interval = setInterval(() => {
      checkStatus();
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [imageryId, status]);

  async function checkStatus() {
    try {
      const response = await fetch(`/api/farms/${farmId}/imagery/${imageryId}`);
      const data = await response.json();

      setStatus(data.processing_status);
      setErrorMessage(data.error_message);
    } catch (error) {
      console.error('Failed to check status:', error);
    }
  }

  function getStatusIcon() {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  }

  function getStatusBadge() {
    const variants: Record<typeof status, "default" | "secondary" | "destructive" | "outline"> = {
      pending: 'secondary',
      processing: 'default',
      completed: 'outline',
      failed: 'destructive'
    };

    return (
      <Badge variant={variants[status]}>
        {status.toUpperCase()}
      </Badge>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {getStatusIcon()}
            Processing Status
          </span>
          {getStatusBadge()}
        </CardTitle>
        {status === 'processing' && (
          <CardDescription>
            Processing your imagery... This may take a few minutes.
          </CardDescription>
        )}
        {status === 'failed' && errorMessage && (
          <CardDescription className="text-red-500">
            Error: {errorMessage}
          </CardDescription>
        )}
      </CardHeader>
      {status === 'processing' && (
        <CardContent>
          <Progress value={undefined} className="w-full" />
        </CardContent>
      )}
    </Card>
  );
}
