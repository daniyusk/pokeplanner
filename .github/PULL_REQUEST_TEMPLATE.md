## Summary

<!-- Briefly describe what this pull request changes and why. -->

## Related Issue

<!-- Link related issue(s), e.g., Closes #123 -->

## Type of Change

- [ ] Bug fix (`fix:`)
- [ ] New feature (`feat:`)
- [ ] Campaign data / mechanics update
- [ ] Refactoring (`refactor:`)
- [ ] Documentation (`docs:`)
- [ ] Tests / Chore (`test:` / `chore:`)

## Verification Checklist

- [ ] `pnpm check` passes cleanly (Biome + `tsc --noEmit`)
- [ ] `pnpm test` passes cleanly
- [ ] `pnpm build` succeeds cleanly
- [ ] `pnpm data:validate` passes (if campaign manifests or pipeline scripts were modified)
- [ ] `src/domain/` remains 100% pure TypeScript with zero React, Zustand, or browser API imports
- [ ] New or modified domain logic includes tests covering public seams
- [ ] All UI copy, comments, documentation, and commits are in English using Conventional Commits
