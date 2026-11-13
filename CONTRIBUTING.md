# Contributing to ACS Web Apps

Start with [VISION.md](VISION.md), [DESIGN.md](DESIGN.md), and the technical rules in [AGENTS.md](AGENTS.md). The project is plain HTML, CSS, and JavaScript served directly, with self-contained offline apps and no build step or npm dependencies.

## Choose and agree on work

Use GitHub Issues as the shared backlog. Use a Project with **Next**, **In progress**, **In review**, **Later**, and **Done**, or equivalent labels if a Project is not configured. Keep only a few items in Next, assign one owner to each active issue, and finish active work before starting more.

A feature issue states the user, situation, problem, smallest useful change, and observable acceptance criteria. New apps, major redesigns, changes to product direction, accounts, servers, and new dependencies need project-lead agreement in the issue before implementation. Small fixes can go straight to a PR with a clear problem statement.

The project lead orders Next using the vision's priorities. Review the queue regularly and archive ideas that no longer fit. Ideas in Later are possibilities, not commitments.

## Implement on a branch

1. Start from current `main` and create a short-lived branch such as `fix/timer-controls` or `feature/verse-import`.
2. Keep the change focused on the agreed problem. Preserve existing storage keys, saved content, registry compatibility, and offline behavior.
3. Follow the design guide for new interfaces. Copy `apps/_template/` for a new app, then customize its metadata, icons, README, and registry entry. Copy the existing inline analytics script from a registered app and set the new fixed folder identifier; the template itself must not report usage.
4. Update relevant docs and bump the service-worker cache version whenever cached content changes. Include new offline assets in that worker's list.
5. Open a draft PR early if feedback would help. Link the issue and explain any scope changes there.

## Verify before review

Run the dependency-free repository checks:

```sh
python3 scripts/validate.py
# Also require cache-version checks against your branch point:
python3 scripts/validate.py --base origin/main
```

Node.js and Python 3 are needed for validation only; users need neither to run the apps. The checks cover JavaScript syntax (including inline classic scripts), manifests, registry destinations, service-worker asset lists, and cache-version changes. They do not prove usability, correct rendering, or complete offline behavior.

Serve the repo with `python3 -m http.server 8000` and manually check what the change affects:

- Main task and relevant empty, error, and saved states.
- Phone and desktop layouts, light and dark themes, keyboard navigation, and visible focus.
- Reload and update behavior for installed or cached users; local content survives.
- Offline use after initial caching, plus a clear explanation for features that require a network.
- Standalone app hosting and guarded `file://` behavior when paths or initialization change.
- Presentation output, permissions, and external displays when affected.

Record actual results and limitations in the PR. Documentation-only changes need link and diff checks, not unrelated app testing.

## Review and merge

Ordinary PRs need one approval from another collaborator. New apps and major product or visual direction changes also need project-lead approval; the lead's approval can satisfy the one-review requirement when the lead is not the author. The lead's own major changes still need another collaborator's review. Resolve review discussions and pass validation before merging. Material changes after approval need another look.

Reviewers check the user problem and acceptance criteria, design consistency, accessibility, privacy, data preservation, cache versions, and the evidence of testing. Explain blocking concerns concretely and distinguish them from optional suggestions.

Use squash merge with a descriptive title. Delete the merged feature branch. A merge to `main` is a release because GitHub Pages deploys that branch. After deployment, verify the changed app on the public site. Revert a broken release through a PR and advance cache versions again; restoring an older cache version can leave installed clients stale.

For an urgent production incident, a project lead may authorize an emergency bypass. Record why in an issue, apply the smallest fix, run relevant checks, and obtain a follow-up review promptly.

## Repository setup checklist

These are administrator steps; adding these files does not configure GitHub settings automatically.

1. Merge the validation workflow and let **Validate / repository** complete once.
2. Configure protection or a ruleset for `main`: require PRs, one approval, resolved conversations, and the repository validation check. Dismiss stale approvals after new commits. Block force pushes and branch deletion. Use the exact check name GitHub displays after the first run.
3. Enforce project-lead review of direction changes through review policy. A universal one-review setting alone cannot enforce this conditional rule. Assign a lead reviewer on those PRs; add CODEOWNERS later once specific account handles and owned paths are agreed.
4. Preserve the scheduled Show Songs updater deliberately. It currently pushes data and a cache bump directly to `main` using `GITHUB_TOKEN`. Before enforcing protection, either move it to reviewed PRs with credentials that trigger required checks, or provide a narrowly scoped automation bypass if the repository supports one. Do not broadly exempt all collaborators. Keep its explicit Pages rebuild step.
5. Create the backlog Project or labels and identify the current project lead in the repository's contributor information.

See the workflow file and validator for the exact automated scope. Dependency additions and hosted configuration changes remain explicit project decisions.
