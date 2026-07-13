import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { listGitHubRepos, type GitHubRepo } from '../api/github';
import { listProjects, deleteProject, type Project } from '../api/projects';
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

export function ImportRepoPage() {
  const navigate = useNavigate();
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
    navigate(`/agreement?repo=${encodeURIComponent(repo.full_name)}&url=${encodeURIComponent(repo.html_url)}`);
  };

  const handleDelete = async (id: number) => {
    await deleteProject(id);
    setProjects(prev => prev.filter(p => p.target_id !== id));
  };

  return (
    <div className={styles.page}>
      {/* ── 헤더 ── */}
      <div className={styles.header}>
        <p className={styles.label}>IMPORT GIT REPOSITORY</p>
        <h1 className={styles.title}>GitHub 레포지터리 연결</h1>
        <p className={styles.desc}>분석할 AI 앱 레포를 선택하면 스캔 설정 화면으로 이동합니다.</p>
      </div>

      {/* ── 검색 ── */}
      <div className={styles.searchRow}>
        <span className={styles.searchIcon}>›_</span>
        <input
          className={styles.searchInput}
          placeholder="레포지터리 검색..."
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
            미등록 레포지터리
            <span className={styles.colCount}>{unimported.length}</span>
          </p>
          <div className={styles.list}>
            {loading && (
              <p className={styles.empty}><span className={styles.blink}>█</span> 로딩 중...</p>
            )}
            {!loading && unimported.length === 0 && (
              <p className={styles.empty}>레포지터리가 없습니다.</p>
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
            {projects.map(p => (
              <div key={p.target_id} className={`${styles.repoCard} ${styles.projectCard}`}>
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
                  <button className={styles.deleteBtn} onClick={() => handleDelete(p.target_id)}>
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
