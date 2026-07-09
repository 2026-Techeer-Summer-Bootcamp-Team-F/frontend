import type { ScanProgressEvent } from '../types';

export function subscribeScanProgress(
  scanId: number,
  onEvent: (event: ScanProgressEvent) => void,
  onError?: (error: Event) => void,
): () => void {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
  const eventSource = new EventSource(`${baseUrl}/api/scans/${scanId}/stream`);

  eventSource.onmessage = (e: MessageEvent) => {
    const data = JSON.parse(e.data as string) as ScanProgressEvent;
    onEvent(data);
  };

  if (onError) {
    eventSource.onerror = onError;
  }

  return () => eventSource.close();
}
