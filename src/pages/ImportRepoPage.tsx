import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listGitHubRepos, type GitHubRepo } from '../api/github';
import { listProjects, deleteProject, type Project } from '../api/projects';
import { listScans, type Scan } from '../api/scans';
import { MOCK_REPOS } from '../api/mock';
import styles from './ImportRepoPage.module.css';
import { useTutorial } from '../hooks/useTutorial';
import { TutorialOverlay } from '../components/tutorial/TutorialOverlay';

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

  const tutorialSteps = useMemo(() => [
    {
      selector: 'repo-list',
      title: '미등록 레포지토리',
      desc: 'GitHub에서 가져온 레포지토리 목록입니다. 아직 분석 대상으로 등록되지 않은 레포들이 여기에 표시됩니다.',
    },
    {
      selector: 'import-btn',
      title: 'Import',
      desc: '이 버튼을 누르면 레포를 분석 대상으로 등록하는 흐름이 시작됩니다. 동의 후 엔드포인트를 설정하면 됩니다.',
    },
    {
      selector: 'project-list',
      title: '등록된 프로젝트',
      desc: '등록이 완료된 분석 대상 프로젝트 목록입니다. 각 프로젝트에 대해 스캔을 실행할 수 있습니다.',
    },
    {
      selector: 'scan-btn',
      title: '스캔 시작',
      desc: 'AI 레드팀 분석을 시작합니다. 공격 유형과 설정을 선택하는 화면으로 이동합니다.',
    },
    {
      selector: 'toggle-btn',
      title: '분석 기록',
      desc: '이 버튼으로 해당 프로젝트의 과거 스캔 기록을 펼치거나 접을 수 있습니다. 완료된 스캔은 리포트로 바로 이동할 수 있습니다.',
    },
    {
      selector: 'delete-btn',
      title: '프로젝트 삭제',
      desc: '프로젝트를 등록 해제합니다. 스캔 기록은 함께 삭제됩니다.',
    },
  ], []);

  const tutorial = useTutorial('repos', tutorialSteps);

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
      {tutorial.active && tutorial.currentStep && (
        <TutorialOverlay
          step={tutorial.currentStep}
          stepIndex={tutorial.step}
          total={tutorial.total}
          onNext={tutorial.next}
          onPrev={tutorial.prev}
          onSkip={tutorial.skip}
        />
      )}
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
        <div className={styles.column} data-tutorial="repo-list">
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
            {unimported.map((repo, idx) => (
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
                  <button
                    className={styles.importBtn}
                    onClick={() => handleImport(repo)}
                    {...(idx === 0 ? { 'data-tutorial': 'import-btn' } : {})}
                  >
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
        <div className={styles.column} data-tutorial="project-list">
          <p className={styles.colLabel}>
            <span className={`${styles.colDot} ${styles.colDotActive}`} />
            등록된 프로젝트
            <span className={styles.colCount}>{projects.length}</span>
          </p>
          <div className={styles.list}>
            {projects.length === 0 && (
              <p className={styles.empty}>아직 등록된 프로젝트가 없습니다.</p>
            )}
            {projects.map((p, pIdx) => {
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
                        {...(pIdx === 0 ? { 'data-tutorial': 'scan-btn' } : {})}
                      >
                        스캔 시작
                      </button>
                      <button
                        className={styles.toggleBtn}
                        onClick={() => handleToggle(p.target_id)}
                        title="분석 기록"
                        {...(pIdx === 0 ? { 'data-tutorial': 'toggle-btn' } : {})}
                      >
                        {isOpen ? '▲' : '▼'}
                      </button>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDeleteProject(p.target_id)}
                        {...(pIdx === 0 ? { 'data-tutorial': 'delete-btn' } : {})}
                      >
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
