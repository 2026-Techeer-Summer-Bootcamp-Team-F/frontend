import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { startScan } from '../api/scans';
import { ProgressLive } from '../components/scan/ProgressLive';

export function RunScanPage() {
  const { targetId } = useParams<{ targetId: string }>();
  const navigate = useNavigate();
  const [scanId, setScanId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (!targetId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await startScan(Number(targetId));
      setScanId(result.scan_id);
    } catch {
      setError('스캔 시작 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = (completedScanId: number) => {
    navigate(`/dashboard/${completedScanId}`);
  };

  return (
    <section>
      <h1>스캔 실행</h1>
      {!scanId ? (
        <>
          <button onClick={handleStart} disabled={loading}>
            {loading ? '준비 중...' : '스캔 시작'}
          </button>
          {error && <p>{error}</p>}
        </>
      ) : (
        <ProgressLive scanId={scanId} onComplete={handleComplete} />
      )}
    </section>
  );
}
