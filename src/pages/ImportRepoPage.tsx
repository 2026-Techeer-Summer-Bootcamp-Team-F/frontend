import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { listGitHubRepos, type GitHubRepo } from '../api/github';
import { listProjects, deleteProject, type Project } from '../api/projects';
import { listScans, type Scan } from '../api/scans';
import { MOCK_REPOS } from '../api/mock';
import styles from './ImportRepoPage.module.css';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return '오늘';
  if (days < 30) return `${days}일 전`;
  const months = Math.floor(days / 30);
  return `${months}개월 전`;
}

const STATUS_COLOR: Record<string, string> = {
  done: 'var(--accent)',
  failed: 'var(--red)',
  running: 'var(--orange)',
  pending: 'var(--text-muted)',
  cancelled: 'var(--text-muted)',
};

export function ImportRepoPage() {
  const navigate = useNavigate();
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // 토글 열린 프로젝트 id set
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  // 프로젝트별 스캔 기록: Map<target_id, Scan[]>
  const [scanMap, setScanMap] = useState<Map<number, Scan[]>>(new Map());
  // 스캔 기록 로딩 중인 프로젝트
  const [loadingScans, setLoadingScans] = useState<Set<number>>(new Set());

  useEffect(() => {
    Promise.all([listGitHubRepos(), listProjects()])
      .then(([r, p]) => {
        setRepos(Array.isArray(r) ? r : MOCK_REPOS);
        setProjects(Array.isArray(p) ? p : []);
      })
      .catch(() => { setRepos(MOCK_REPOS); })
      .finally(() => setLoading(false));
  }, []);

  const registeredIds = useMemo(
    () => new Set(projects.map(p => p.repo_url ?? '')),
    [projects],
  );

  const unimported = useMemo(
    () => repos
      .filter(r => !registeredIds.has(r.html_url))
      .filter(r => r.full_name.toLowerCase().includes(query.toLowerCase())),
    [repos, registeredIds, query],
  );

  const handleImport = (repo: GitHubRepo) => {
    navigate(`/agreement?repo=${encodeURIComponent(repo.full_name)}&url=${encodeURIComponent(repo.html_url)}`);
  };

  const handleDeleteProject = async (id: number) => {
    await deleteProject(id);
    setProjects(prev => prev.filter(p => p.target_id !== id));
    setOpenIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    setScanMap(prev => { const n = new Map(prev); n.delete(id); return n; });
  };

  const handleToggle = async (targetId: number) => {
    setOpenIds(prev => {
      const next = new Set(prev);
      next.has(targetId) ? next.delete(targetId) : next.add(targetId);
      return next;
    });

    // 처음 열 때 스캔 기록 fetch
    if (!openIds.has(targetId) && !scanMap.has(targetId)) {
      setLoadingScans(prev => new Set(prev).add(targetId));
      try {
        // TODO: listScans(targetId) — target_id 필터 API 연동 후 교체
        const all = await listScans();
        const filtered = all.filter(s => (s as any).target_id === targetId);
        setScanMap(prev => new Map(prev).set(targetId, filtered));
      } catch {
        setScanMap(prev => new Map(prev).set(targetId, []));
      } finally {
        setLoadingScans(prev => { const n = new Set(prev); n.delete(targetId); return n; });
      }
    }
  };

  const handleDeleteScan = (targetId: number, scanId: number) => {
    // TODO: API 연동 후 실제 삭제 호출 추가
    setScanMap(prev => {
      const scans = prev.get(targetId) ?? [];
      return new Map(prev).set(targetId, scans.filter(s => s.scan_id !== scanId));
    });
  };

  return (
    <div className={styles.page}>
      {/* ── 헤더 ── */}
      <div className={styles.header}>
        <p className={styles.label}>IMPORT GIT REPOSITORY</p>
        <h1 className={styles.title}>GitHub 레포지토리 연결</h1>
        <p className={styles.desc}>분석할 AI 앱 레포를 선택하면 스캔 설정 화면으로 이동합니다.</p>
      </div>

      {/* ── 검색 ── */}
      <div className={styles.searchRow}>
        <span className={styles.searchIcon}>›_</span>
        <input
          className={styles.searchInput}
          placeholder="레포지토리 검색..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {/* ── 좌우 분할 ── */}
      <div className={styles.columns}>
        {/* 왼쪽: 미등록 레포 */}
        <div className={styles.column}>
          <p className={styles.colLabel}>
            <span className={styles.colDot} />
            미등록 레포지토리
            <span className={styles.colCount}>{unimported.length}</span>
          </p>
          <div className={styles.list}>
            {loading && (
              <p className={styles.empty}><span className={styles.blink}>█</span> 로딩 중...</p>
            )}
            {!loading && unimported.length === 0 && (
              <p className={styles.empty}>레포지토리가 없습니다.</p>
            )}
            {unimported.map(repo => (
              <div key={repo.full_name} className={styles.repoCard}>
                <div className={styles.repoMeta}>
                  <div className={styles.repoNameRow}>
                    <span className={styles.repoName}>{repo.full_name}</span>
                    {repo.private && <span className={styles.badge}>Private</span>}
                  </div>
                  <span className={styles.repoDesc}>{repo.description ?? '설명 없음'}</span>
                </div>
                <div className={styles.repoRight}>
                  <span className={styles.repoTime}>{timeAgo(repo.updated_at)}</span>
                  <button className={styles.importBtn} onClick={() => handleImport(repo)}>
                    Import
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 구분선 */}
        <div className={styles.divider} />

        {/* 오른쪽: 등록된 프로젝트 */}
        <div className={styles.column}>
          <p className={styles.colLabel}>
            <span className={`${styles.colDot} ${styles.colDotActive}`} />
            등록된 프로젝트
            <span className={styles.colCount}>{projects.length}</span>
          </p>
          <div className={styles.list}>
            {projects.length === 0 && (
              <p className={styles.empty}>아직 등록된 프로젝트가 없습니다.</p>
            )}
            {projects.map(p => {
              const isOpen = openIds.has(p.target_id);
              const scans = scanMap.get(p.target_id) ?? [];
              const isLoadingScans = loadingScans.has(p.target_id);

              return (
                <div key={p.target_id} className={styles.projectBlock}>
                  {/* 프로젝트 헤더 행 */}
                  <div className={`${styles.repoCard} ${styles.projectCard}`}>
                    <div className={styles.repoMeta}>
                      <div className={styles.repoNameRow}>
                        <span className={styles.repoName}>{p.project_name}</span>
                        <span className={styles.badge}>{p.actor_type.toUpperCase()}</span>
                      </div>
                      <span className={styles.repoDesc}>
                        {p.config?.url ?? '엔드포인트 미설정'}
                      </span>
                    </div>
                    <div className={styles.repoRight}>
                      <button
                        className={styles.scanBtn}
                        onClick={() => navigate(`/analysis/${p.target_id}`)}
                      >
                        스캔 시작
                      </button>
                      <button
                        className={styles.toggleBtn}
                        onClick={() => handleToggle(p.target_id)}
                        title="분석 기록"
                      >
                        {isOpen ? '▲' : '▼'}
                      </button>
                      <button className={styles.deleteBtn} onClick={() => handleDeleteProject(p.target_id)}>
                        삭제
                      </button>
                    </div>
                  </div>

                  {/* 스캔 기록 패널 */}
                  {isOpen && (
                    <div className={styles.scanPanel}>
                      <p className={styles.scanPanelLabel}>분석 기록</p>
                      {isLoadingScans && (
                        <p className={styles.scanEmpty}><span className={styles.blink}>█</span> 불러오는 중...</p>
                      )}
                      {!isLoadingScans && scans.length === 0 && (
                        <p className={styles.scanEmpty}>분석 기록이 없습니다.</p>
                      )}
                      {scans.map(sc => (
                        <div key={sc.scan_id} className={styles.scanRow}>
                          <span className={styles.scanId}>#{sc.scan_id}</span>
                          <span
                            className={styles.scanStatus}
                            style={{ color: STATUS_COLOR[sc.status] ?? 'var(--text-muted)' }}
                          >
                            {sc.status}
                          </span>
                          <span className={styles.scanDate}>
                            {sc.started_at ? timeAgo(sc.started_at) : '—'}
                          </span>
                          <div className={styles.scanActions}>
                            {sc.status === 'done' && (
                              <button
                                className={styles.reportBtn}
                                onClick={() => navigate(`/report/${sc.scan_id}`)}
                              >
                                리포트
                              </button>
                            )}
                            <button
                              className={styles.scanDeleteBtn}
                              onClick={() => handleDeleteScan(p.target_id, sc.scan_id)}
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
