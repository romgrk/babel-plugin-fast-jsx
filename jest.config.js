const semver = require("semver");

const nodeVersion = process.versions.node;
const supportsESMAndJestLightRunner = semver.satisfies(
  nodeVersion,
  // ^12.22 || >=14.17 : Node will throw "t.isIdentifier is not a function" when test is running in worker threads.
  // ^13.7: `resolve.exports` specifies conditional exports in package.json
  "^12.22 || ^13.7 || >=14.17"
);
// const isPublishBundle = process.env.IS_PUBLISH;

module.exports = {
  runner: supportsESMAndJestLightRunner ? "jest-light-runner" : "jest-runner",
  testRegex: "./test/*",
}
