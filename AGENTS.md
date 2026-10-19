# Project Guidelines & Agent Rules

## Git & Branching Workflow
- **Never commit or push directly to the `main` branch.**
- For every task, feature, or bugfix:
  1. Create and switch to a descriptive branch (e.g., `feature/<name>`, `feat/<name>`, `fix/<name>`).
  2. Implement code changes and verify with `npm test` and `npm run build`.
  3. Commit and push strictly to the respective feature branch on the remote: `git push -u origin <branch-name>`.
