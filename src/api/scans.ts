import type { Scan, ScanResult } from '../types';
import { apiClient } from './client';

export async function startScan(targetId: number): Promise<{ scan_id: number; task_id: string }> {
  const { data } = await apiClient.post<{ scan_id: number; task_id: string }>(
    `/api/scans/${targetId}/run`,
  );
  return data;
}

export async function getScan(scanId: number): Promise<Scan> {
  const { data } = await apiClient.get<Scan>(`/api/scans/${scanId}`);
  return data;
}

export async function getScanResult(scanId: number): Promise<ScanResult> {
  const { data } = await apiClient.get<ScanResult>(`/api/scans/${scanId}/result`);
  return data;
}

export async function listScans(targetId: number): Promise<Scan[]> {
  const { data } = await apiClient.get<Scan[]>(`/api/scans`, { params: { target_id: targetId } });
  return data;
}
