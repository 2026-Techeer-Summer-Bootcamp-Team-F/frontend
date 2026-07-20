import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listGitHubRepos, type GitHubRepo } from '../api/github';
import { listProjects, deleteProject, type Project } from '../api/projects';
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
      desc: '이 버튼을 누르면 해당 프로젝트의 스캔 버전 관리 화면으로 이동합니다. 스캔 시기별 코드 변경점과 취약점 해결 여부를 확인할 수 있습니다.',
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
    navigate(`/projects/new?repo=${encodeURIComponent(repo.full_name)}&url=${encodeURIComponent(repo.html_url)}`);
  };

  const handleDeleteProject = async (id: number) => {
    await deleteProject(id);
    setProjects(prev => prev.filter(p => p.target_id !== id));
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
                        onClick={() => navigate(`/versions/${p.target_id}`)}
                        title="스캔 버전 관리"
                        {...(pIdx === 0 ? { 'data-tutorial': 'toggle-btn' } : {})}
                      >
                        분석 기록
                      </button>
                      <button
                        className={styles.toggleBtn}
                        onClick={() => navigate(`/projects/new?edit=${p.target_id}`)}
                        title="표적 정보 수정 (URL·설정 등)"
                      >
                        수정
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
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
