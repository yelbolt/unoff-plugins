import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  bumpChangelog,
  extractSection,
  hasVersionSection,
  localDate,
  unreleasedBody,
} from "./changelog.mjs";

const BASE_BRANCH = "dev";
const REMOTE = "origin";
const IGNORED_DIRS = new Set(["node_modules", "dist", "scripts"]);
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const USAGE = `Usage: npm run release -- <plugin> <version|patch|minor|major> [options]

  <plugin>    "token-lint" or "penpot/token-lint" ("platform/name" if the
              bare name exists on several platforms)
  <version>   an explicit X.Y.Z, or patch / minor / major, computed from the
              version currently on ${REMOTE}/${BASE_BRANCH}

Options:
  --push      push the branch and open the PR into ${BASE_BRANCH} (needs gh)
  --dry-run   print what would happen, change nothing
  --force     allow releasing with an empty [Unreleased] section`;

// --- helpers ----------------------------------------------------------------

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

const git = (...args) => run("git", args);

function gitOk(...args) {
  try {
    git(...args);
    return true;
  } catch {
    return false;
  }
}

// File content at a git ref, or null when it doesn't exist there.
function readAt(ref, path) {
  try {
    return execFileSync("git", ["show", `${ref}:${path}`], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
}

const parse = (version) => SEMVER.exec(version)?.slice(1).map(Number);

function compare(a, b) {
  const [pa, pb] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] > pb[i] ? 1 : -1;
  }
  return 0;
}

function resolveVersion(input, baseline) {
  const wanted = input.replace(/^v/, "");
  if (SEMVER.test(wanted)) return wanted;
  const [major, minor, patch] = parse(baseline);
  if (input === "major") return `${major + 1}.0.0`;
  if (input === "minor") return `${major}.${minor + 1}.0`;
  if (input === "patch") return `${major}.${minor}.${patch + 1}`;
  return fail(
    `'${input}' is not a version: use X.Y.Z, patch, minor or major.\n\n${USAGE}`,
  );
}

// Mirrors scripts/build.mjs's and the detect-plugins action's resolution,
// narrowed to exactly one plugin.
function listPlugins() {
  return readdirSync(root, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        !IGNORED_DIRS.has(entry.name),
    )
    .flatMap((platform) =>
      readdirSync(join(root, platform.name), { withFileTypes: true })
        .filter(
          (entry) =>
            entry.isDirectory() &&
            existsSync(join(root, platform.name, entry.name, "package.json")),
        )
        .map((entry) => `${platform.name}/${entry.name}`),
    );
}

function resolvePlugin(input) {
  const plugins = listPlugins();
  if (input.includes("/")) {
    if (!plugins.includes(input)) {
      fail(`'${input}' is not a known plugin workspace (missing package.json)`);
    }
    return input;
  }
  const matches = plugins.filter((plugin) => plugin.split("/")[1] === input);
  if (matches.length === 0) {
    fail(`No plugin named '${input}' found. Known: ${plugins.join(", ")}`);
  }
  if (matches.length > 1) {
    fail(
      `'${input}' is ambiguous across platforms (${matches.join(", ")}). Use "platform/name" instead.`,
    );
  }
  return matches[0];
}

// --- arguments --------------------------------------------------------------

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("--")));
const positionals = args.filter((arg) => !arg.startsWith("--"));
const KNOWN_FLAGS = new Set(["--push", "--dry-run", "--force"]);

for (const flag of flags) {
  if (!KNOWN_FLAGS.has(flag)) fail(`Unknown option ${flag}\n\n${USAGE}`);
}
if (positionals.length !== 2) fail(`Expected <plugin> and <version>.\n\n${USAGE}`);

const dryRun = flags.has("--dry-run");
const push = flags.has("--push");
const force = flags.has("--force");

const plugin = resolvePlugin(positionals[0]);
const [platform, name] = plugin.split("/");
const packagePath = `${plugin}/package.json`;
const changelogPath = `${plugin}/CHANGELOG.md`;

// --- preconditions (read-only) ---------------------------------------------

if (dryRun) console.log("Dry run: nothing will be changed.\n");

try {
  git("fetch", REMOTE, "--tags");
} catch {
  console.warn(
    `⚠ Could not fetch ${REMOTE}; working from the refs already known locally.`,
  );
}

if (git("status", "--porcelain", "--untracked-files=no")) {
  fail("The working tree has uncommitted changes. Commit or stash them first.");
}

const baseRef = `${REMOTE}/${BASE_BRANCH}`;
if (!gitOk("rev-parse", "--verify", "--quiet", baseRef)) {
  fail(`${baseRef} not found. Is '${REMOTE}' configured and reachable?`);
}

const basePackage = readAt(baseRef, packagePath);
if (basePackage === null) {
  fail(
    `${plugin} is not on ${baseRef} yet. Merge it into ${BASE_BRANCH} before releasing it.`,
  );
}
const baselineVersion = JSON.parse(basePackage).version;
const version = resolveVersion(positionals[1], baselineVersion);

if (compare(version, baselineVersion) <= 0) {
  fail(
    `${plugin} is already at ${baselineVersion} on ${baseRef}; ${version} is not a newer version.`,
  );
}

const tag = `${platform}-${name}-v${version}`;
if (gitOk("rev-parse", "--verify", "--quiet", `refs/tags/${tag}`)) {
  fail(`Tag ${tag} already exists: ${plugin} v${version} was already released.`);
}

// Branch: reuse it when it exists (locally, or on the remote), else cut it
// from origin/dev so the PR contains this release and nothing else.
const branch = `release/${name}-${version}`;
const currentBranch = git("rev-parse", "--abbrev-ref", "HEAD");
let mode;
let sourceRef;
if (currentBranch === branch) {
  mode = "current";
  sourceRef = "HEAD";
} else if (gitOk("rev-parse", "--verify", "--quiet", `refs/heads/${branch}`)) {
  mode = "local";
  sourceRef = branch;
} else if (
  gitOk("rev-parse", "--verify", "--quiet", `refs/remotes/${REMOTE}/${branch}`)
) {
  mode = "remote";
  sourceRef = `${REMOTE}/${branch}`;
} else {
  mode = "create";
  sourceRef = baseRef;
}

// Read what the release branch will contain, not what the current checkout
// happens to have.
const sourceChangelog = readAt(sourceRef, changelogPath);
const sourcePackage = readAt(sourceRef, packagePath);
if (sourcePackage === null) fail(`${packagePath} not found on ${sourceRef}.`);
const packageAlreadyBumped = JSON.parse(sourcePackage).version === version;

if (sourceChangelog === null) {
  if (!force) fail(`${changelogPath} not found on ${sourceRef}. Use --force to release without one.`);
} else if (!hasVersionSection(sourceChangelog, version)) {
  if (!unreleasedBody(sourceChangelog) && !force) {
    fail(
      `[Unreleased] is empty in ${changelogPath}: nothing to release. Add the changes first, or use --force.`,
    );
  }
} else if (unreleasedBody(sourceChangelog)) {
  console.warn(
    `⚠ ${changelogPath} already has [${version}] but [Unreleased] still lists entries; they stay under [Unreleased].`,
  );
}

// --- plan -------------------------------------------------------------------

const branchStep = {
  current: `stay on ${branch}`,
  local: `check out the existing ${branch}`,
  remote: `check out ${REMOTE}/${branch}`,
  create: `create ${branch} from ${baseRef}`,
}[mode];

console.log(`Release   ${plugin} ${baselineVersion} → ${version}`);
console.log(`Branch    ${branch}  (${branchStep})`);
console.log(`Tag       ${tag}  (created by CI on merge)\n`);

const steps = [
  branchStep,
  packageAlreadyBumped
    ? `${packagePath} already at ${version}`
    : `set ${packagePath} to ${version} (and the lockfile)`,
  sourceChangelog !== null && hasVersionSection(sourceChangelog, version)
    ? `${changelogPath} already has [${version}]`
    : `move [Unreleased] to [${version}] - ${localDate()} in ${changelogPath}`,
  `commit "chore(release): ${plugin} v${version}"`,
  push
    ? `push ${branch} and open the PR into ${BASE_BRANCH}`
    : `(no --push: push and open the PR yourself)`,
];
steps.forEach((step, index) => console.log(`  ${index + 1}. ${step}`));
console.log();

if (dryRun) process.exit(0);

// --- execute ----------------------------------------------------------------

if (mode === "local") git("checkout", branch);
if (mode === "remote") git("checkout", "-b", branch, "--track", sourceRef);
if (mode === "create") git("checkout", "-b", branch, "--no-track", baseRef);

if (!packageAlreadyBumped) {
  run("npm", [
    "version",
    version,
    "--no-git-tag-version",
    "--ignore-scripts",
    "--workspace",
    plugin,
  ]);
}

const changelogFile = join(root, changelogPath);
if (existsSync(changelogFile)) {
  const result = bumpChangelog(
    readFileSync(changelogFile, "utf8"),
    version,
    localDate(),
  );
  if (result.status === "bumped") writeFileSync(changelogFile, result.text);
}

const toStage = [packagePath, changelogPath, "package-lock.json"].filter(
  (path) => existsSync(join(root, path)),
);
git("add", "--", ...toStage);

if (gitOk("diff", "--cached", "--quiet")) {
  console.log("Nothing to commit: the release branch already has everything.");
} else {
  git("commit", "-m", `chore(release): ${plugin} v${version}`);
  console.log(`✓ Committed on ${branch}`);
}

if (push) {
  git("push", "--set-upstream", REMOTE, branch);
  console.log(`✓ Pushed ${branch}`);

  const existing = run("gh", [
    "pr", "list",
    "--head", branch,
    "--base", BASE_BRANCH,
    "--state", "open",
    "--json", "url",
    "--jq", ".[0].url // empty",
  ]);
  if (existing) {
    console.log(`✓ PR already open: ${existing}`);
  } else {
    const notes = existsSync(changelogFile)
      ? extractSection(readFileSync(changelogFile, "utf8"), version)
      : "";
    const body =
      `## ${plugin} v${version}\n\n` +
      `Merging this PR releases the plugin: CI builds it, tags \`${tag}\`, ` +
      `publishes the GitHub Release and deploys it to GitHub Pages.\n\n` +
      `### Release notes\n\n${notes || "_No changelog entries._"}`;
    const created = spawnSync(
      "gh",
      [
        "pr", "create",
        "--base", BASE_BRANCH,
        "--head", branch,
        "--title", `release: ${plugin} v${version}`,
        "--body-file", "-",
      ],
      { cwd: root, encoding: "utf8", input: body },
    );
    if (created.status !== 0) fail(`gh pr create failed:\n${created.stderr}`);
    console.log(`✓ PR opened: ${created.stdout.trim()}`);
  }
} else {
  console.log(
    `\nNext: git push -u ${REMOTE} ${branch}, then open a PR into ${BASE_BRANCH}.`,
  );
}
