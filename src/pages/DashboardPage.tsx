import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getScanResult } from '../api/scans';
import { AtlasHeatmap } from '../components/dashboard/AtlasHeatmap';
import { EvolutionTree } from '../components/dashboard/EvolutionTree';
import { EvidenceViewer } from '../components/dashboard/EvidenceViewer';
import type { ScanResult } from '../types';

export function DashboardPage() {
  const { scanId } = useParams<{ scanId: string }>();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scanId) return;
    getScanResult(Number(scanId))
      .then(setResult)
      .catch(() => setError('결과를 불러오는 중 오류가 발생했습니다.'))
      .finally(() => setLoading(false));
  }, [scanId]);

  if (loading) return <p>결과 로딩 중...</p>;
  if (error) return <p>{error}</p>;
  if (!result) return null;

  return (
    <section>
      <h1>스캔 결과 대시보드</h1>
      <AtlasHeatmap findings={result.findings} />
      <EvolutionTree attempts={result.attempts} />
      <EvidenceViewer findings={result.findings} attempts={result.attempts} />
    </section>
  );
}
