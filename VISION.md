# ACS Web Apps vision

ACS Web Apps helps Christian students study Scripture, practice and remember what they learn, and prepare and participate in campus gatherings. The tools are open to everyone.

A student should be able to open an app, understand its purpose, and do something useful within a minute. A gathering leader should be able to rely on it during a meeting, including when the network is unreliable.

## Product commitments

- **Useful in real settings.** Begin with a specific task someone encounters during personal study or a campus gathering. Favor a complete, dependable workflow over a long feature list.
- **Free and ad-free.** No ads, paywalls, or monetization of personal content.
- **Private by default.** Keep content, progress, and settings on the device. Explain network-dependent features and local data limitations. Usage counts follow the existing restricted analytics policy; they never include user content or searches.
- **Ready without an account.** Core use requires no sign-up. Any proposed account, server, or new external dependency needs project-lead approval before implementation.
- **Offline where it matters.** Core features work after initial caching. Make required downloads, synchronization, and online collaboration explicit.
- **Accessible and calm.** Support phones, keyboards, assistive technology, and light and dark environments. Presentation screens prioritize legibility at a distance.
- **Portable and maintainable.** Each app remains self-contained, with plain HTML, CSS, and JavaScript and no build step.

## What belongs here

A new app should have a clear connection to Scripture study, memorization, music, presentation, or practical campus gathering needs. General-purpose tools belong when they solve a concrete need in those settings.

Before approving a new app, answer:

1. Who needs it, and in what situation?
2. What can they accomplish that the existing apps do not cover well?
3. Would improving an existing app solve the problem more simply?
4. What is the smallest useful first release?
5. What works offline, what leaves the device, and who will maintain it?

Avoid duplicate apps with only cosmetic differences, features driven solely by novelty, and infrastructure whose maintenance outweighs its benefit. Do not expand an app into unrelated tasks simply because the feature is easy to add.

## Priorities

When choosing between work items, prioritize:

1. Broken core workflows, data loss, privacy problems, and accessibility barriers.
2. Reliability and clarity in existing apps, especially offline and presentation use.
3. Improvements supported by an observed or reported student need.
4. New apps that fill an agreed gap.
5. Optional polish and experiments.

Usage totals are one signal, alongside direct feedback and observed usefulness. Low usage alone does not make a specialized gathering tool unsuccessful.

## How we make decisions

The project lead owns product direction. Collaborators propose changes through issues and pull requests. Ordinary changes need one other collaborator's approval; new apps and major direction changes need project-lead approval as well. See [CONTRIBUTING.md](CONTRIBUTING.md).

Keep a short decision record in the relevant issue: the problem, decision, reason, and any accepted limitation. Update this vision when the direction actually changes.

## Signs we are succeeding

- Students can complete the main task without someone explaining the interface.
- Gathering leaders can use the presentation tools reliably on their actual equipment.
- Returning users retain their settings and content through updates.
- Core tasks remain usable offline, on mobile, and with a keyboard.
- Collaborators can explain why a feature belongs and follow the same design and release conventions.
