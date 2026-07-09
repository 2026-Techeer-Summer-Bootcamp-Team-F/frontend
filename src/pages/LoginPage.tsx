import { getGitHubLoginUrl } from '../api/auth';

export function LoginPage() {
  return (
    <section>
      <h1>AI Red Team</h1>
      <p>AI 챗봇·에이전트 앱 자동 모의해킹 도구</p>
      <a href={getGitHubLoginUrl()}>GitHub으로 로그인</a>
    </section>
  );
}
