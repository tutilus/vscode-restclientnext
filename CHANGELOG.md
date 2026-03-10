# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.3.0](https://github.com/tutilus/vscode-restclientnext/compare/v1.2.0...v1.3.0) (2026-03-10)

- **Feature**: All Request Sequentielly -- fix typo + add lens ([5b31588](https://github.com/tutilus/vscode-restclientnext/commit/5b31588488360c9d040b05467b14c0b74f8f9a25)) Upstream -> [PR #1388](https://github.com/Huachao/vscode-restclient/pull/1388)
- **Feature**: Customize code Lens and optionally show environnement ([ee244fb](https://github.com/tutilus/vscode-restclientnext/commit/ee244fbef9517332f0fd9878c82ac045a35a7289))
- **Feature**: Variable descriptions with quote-aware parsing ([3c69264](https://github.com/tutilus/vscode-restclientnext/commit/3c692646e31323dcd1d7adac59cb0b48983ebbfc)), closes [#22](https://github.com/tutilus/vscode-restclientnext/issues/22) [#21](https://github.com/tutilus/vscode-restclientnext/issues/21) Upstream -> [Issue #1397](https://github.com/Huachao/vscode-restclient/issues/1397) partially done.
- **Feature**: Add new @set metadata directive [PR #24](https://github.com/tutilus/vscode-restclientnext/pull/24) Upstream [PR #1422](https://github.com/Huachao/vscode-restclient/pull/1422)
- **Bugfix**: Auth Basic regression on user:pass format ([beeb772](https://github.com/tutilus/vscode-restclientnext/commit/beeb772e212c43c80175f00ddda70c56c81d700d))
- **Chore**: Cherry pick upstream README fixes
- **Maintenance**: Package optimization ([7ef29cc](https://github.com/tutilus/vscode-restclientnext/commit/7ef29cc7c1a3258d59d06796d2678ef73db0e47c))
- **Chore**: Add github page for documentation ([9e8f233](https://github.com/tutilus/vscode-restclientnext/commit/9e8f233097a2988ab38cded853233ff7c58a79d6))
- **Chore**: Add markdown sample ([4300982](https://github.com/tutilus/vscode-restclientnext/commit/430098203ad715581031bfd1029a0df1179e0708))
- **Maintenance**: Fix permission release.workflow ([6a37e67](https://github.com/tutilus/vscode-restclientnext/commit/6a37e67f032774c99a47985ed1694293268b78dc))
- **Maintenance**: Add oxfmt and oxlint ([e07292d](https://github.com/tutilus/vscode-restclientnext/commit/e07292d626b0ebe31d6ffc5ffcfbd442fdeabb4e))

## [1.2.0](https://github.com/tutilus/vscode-restclientnext/compare/v1.1.0...v1.2.0) (2026-03-03)

- **Feature**: Add Faker.js integration for realistic fake data generation (https://github.com/tutilus/vscode-restclientnext/issues/6)
- **Feature**: Remove adal-node (https://github.com/tutilus/vscode-restclientnext/issues/5)
- **Dependency**: bump @types/node from 22.19.11 to 25.3.0 ([c2fbd0c](https://github.com/tutilus/vscode-restclientnext/commit/c2fbd0c4d462c470c80c05440d74def779b71b03))
- **Dependency**: bump httpsnippet from 2.0.0 to 3.0.1 ([26d54f1](https://github.com/tutilus/vscode-restclientnext/commit/26d54f14d3095c83ac3949dc3e0af671a03de336))
- bump minimatch ([2dd4324](https://github.com/tutilus/vscode-restclientnext/commit/2dd43244d20c4de2f83603d43f14d55d9a5c016d))
- **Dependency** Force form-data to delete critcal issue ([9beacca](https://github.com/tutilus/vscode-restclientnext/commit/9beaccaa6ea5e4595ec1856125dc7d1fb4dbdadd))
- **Chore**: fix typos (based on https://github.com/Huachao/vscode-restclient/pull/1380)
- **Chore**: Update dependencies in package-lock.json ([81eceb9](https://github.com/tutilus/vscode-restclientnext/commit/81eceb9a0de051f00ed8729eca2301a9dc503a0f))
- **Chore**: update uuid from v3 to v13 (https://github.com/Huachao/vscode-restclient/pull/1381)

## 1.1.0 (2025/02/25)

- **Bug Fix**: [xmldom deprecated](https://github.com/tutilus/vscode-restclientnext/issues/3)
- **Bug_Fix**: [basic auth passphrase only works without ':'](https://github.com/tutilus/vscode-restclientnext/issues/8)
- **Feature**: [Remove telemetry](https://github.com/tutilus/vscode-restclientnext/issues/9)
- **Feature**: Update logo
- **Maintenance**: [Add CodeQL](https://github.com/tutilus/vscode-restclientnext/pull/12)
- **Maintenance**: Add dependbot, Git Actions to publish

## 1.0.0 (2025/02/22)

- All dependencies updated
- Initial release based on version 0.25.1 (2022/07/06) - master
