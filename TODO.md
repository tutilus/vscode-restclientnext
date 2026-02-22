# Merge NEXT Client

## First to do list

- [x] Add all dependencies updated version
- [x] Fix all errors
- [x] Check everything is working
- [x] Change logo image to rest-client-rest one
- [ ] Reduce README.md size (move most of the part in wiki to have a smaller package)
- [ ] Stand the first version
- [ ] Add PR and milestones
- [ ] Add minimum tests 
- [ ] Migrate adal-node@0.2.4 --> @azure/msal-node

## Warning

### Compile warnings
Found 3 types of warning but all on telemetry function.

```
WARNING in ./node_modules/@azure/opentelemetry-instrumentation-azure-sdk/node_modules/require-in-the-middle/index.js 75:15-22

WARNING in ./node_modules/require-in-the-middle/index.js 276:16-23
Critical dependency: require function is used in a way in which dependencies cannot be statically extracted

WARNING in ./node_modules/@azure/monitor-opentelemetry/dist/commonjs/shared/module.js 17:15-47
Module not found: Error: Can't resolve '@azure/functions-core' in '/home/liam/Lab/vscode-restclientnext/node_modules/@azure/monitor-opentelemetry/dist/commonjs/shared'
```

### NPM warnings

npm warn deprecated mkdirp-promise@1.1.0: This package is broken and no longer maintained. 'mkdirp' itself supports promises now, please switch to that. --> `Link to httpsnippet`
npm warn deprecated har-validator@5.1.5: this library is no longer supported
npm warn deprecated uuid@3.4.0: Please upgrade  to version 7 or higher.  Older versions may use Math.random() in certain circumstances, which is known to be problematic.  See https://v8.dev/blog/math-random for details.
npm warn deprecated node-domexception@1.0.0: Use your platform's native DOMException instead
npm warn deprecated adal-node@0.2.4: This package is no longer supported. Please migrate to @azure/msal-node.
npm warn deprecated glob@10.5.0: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me

## Issues

Still there.
 - https://github.com/Huachao/vscode-restclient/issues/1378
 - 