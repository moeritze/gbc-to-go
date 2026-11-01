# Changelog

All notable changes to this project are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Settings shows how to add the site to the phone's home screen (hidden when already opened from there).

## [1.0.1] - 2026-11-01

No app changes. Docs and project maintenance only.

### Added
- Architecture diagram in the README.
- Security policy (`SECURITY.md`) with private vulnerability reporting, and a pull request template.

### Changed
- CI uses `actions/checkout` v7 and `actions/setup-node` v7.

## [1.0.0] - 2026-11-01

First release.

### Added
- Game Boy and Game Boy Color player in the browser, installable on a phone home screen.
- Single-owner sign-in with Firebase Auth; Firestore rules allow only the owner.
- ROM library: upload ROMs from the app, stored in Firestore chunks (no Cloud Storage, stays on the free Spark plan), cached per device.
- In-game saves and save states, synced across devices.
- Touch controls and settings screen.
- Setup scripts: `create-owner`, `deploy` (cross-platform) and `verify-rules`.
- Beginner setup guide, agent-driven setup runbook and legal notes.

### Fixed
- Audio drift on iOS: backlog is dropped and audio is only scheduled while the game runs.
- Pinch zoom and text selection no longer interfere on the play screen.
- Emulator stop is safe to call twice.
- Offline flag scope on the play screen.

[Unreleased]: https://github.com/moeritze/gbc-to-go/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/moeritze/gbc-to-go/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/moeritze/gbc-to-go/releases/tag/v1.0.0
