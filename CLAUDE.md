# CLAUDE.md

이 파일은 Claude Code 진입점이다. 프로젝트 규칙의 **단일 진실원천(SSOT)은 [AGENTS.md](AGENTS.md)** 이며, 아래에서 그대로 임포트한다 (Cursor·Codex 등 다른 툴도 AGENTS.md 를 네이티브로 읽는다 — 내용을 복제하지 말고 항상 AGENTS.md 를 고친다).

@AGENTS.md

## Claude Code 전용 진입점

- **서브에이전트 실행 정의**: `.claude/agents/*.md` (PM·UX·frontend-dev·api-integration-dev·QA·reviewer·devops·manager). 각 역할의 도구·경계·산출물 규약.
- **슬래시 커맨드**: `.claude/commands/pipeline.md`(7단계 순차 위임), `.claude/commands/status.md`(read-only 현황).
- **Cursor 패리티**: 같은 워크플로가 `.cursor/rules/agents-workflow.mdc` + `.cursor/commands/*.md` 로 미러링돼 있다. Cursor 는 서브에이전트 위임이 없어 "한 에이전트가 역할 순차 연기" 방식 — 산출물·라벨·머지 규칙은 동일.
