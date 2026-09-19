import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Matches "## [label]" — label is "Unreleased" or a version such as "0.4.0".
const headingFor = (label) =>
  new RegExp(`^##\\s*\\[${escapeRegExp(label)}\\]`, "i");

// A section runs from its "## [label]" heading to the next "## [" heading.
function findSection(lines, label) {
  const startIndex = lines.findIndex((line) => headingFor(label).test(line));
  if (startIndex === -1) return null;
  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (/^##\s*\[/.test(lines[i])) {
      endIndex = i;
      break;
    }
  }
  return { startIndex, endIndex };
}

const bodyOf = (lines, section) =>
  lines
    .slice(section.startIndex + 1, section.endIndex)
    .join("\n")
    .trim();

export function hasVersionSection(text, version) {
  return findSection(text.split("\n"), version) !== null;
}

export function unreleasedBody(text) {
  const lines = text.split("\n");
  const section = findSection(lines, "Unreleased");
  return section ? bodyOf(lines, section) : "";
}

/**
 * Release notes for a version: the "[version]" section when it exists,
 * otherwise the "[Unreleased]" one (a changelog that hasn't been bumped yet,
 * e.g. a manual release outside the `npm run release` flow).
 */
export function extractSection(text, version) {
  const lines = text.split("\n");
  if (version) {
    const section = findSection(lines, version);
    if (section) return bodyOf(lines, section);
  }
  return unreleasedBody(text);
}

/**
 * Turns "[Unreleased]" into "[version] - date": a new heading is inserted
 * right under "## [Unreleased]", so the entries that were listed there now
 * belong to the version, and "[Unreleased]" is left empty above it.
 * Idempotent: a changelog that already has a "[version]" section is untouched.
 */
export function bumpChangelog(text, version, date) {
  const lines = text.split("\n");
  if (findSection(lines, version)) return { text, status: "already-bumped" };
  const unreleased = findSection(lines, "Unreleased");
  if (!unreleased) return { text, status: "no-unreleased" };
  lines.splice(unreleased.startIndex + 1, 0, "", `## [${version}] - ${date}`);
  return { text: lines.join("\n"), status: "bumped" };
}

// Local calendar date (toISOString() is UTC and can be yesterday's date in
// the early hours of the morning).
export function localDate(now = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function main() {
  const [, , command, changelogPath, version] = process.argv;

  if (!command || !changelogPath) {
    console.error(
      "Usage: node scripts/changelog.mjs extract <changelog-path> [version]\n" +
        "       node scripts/changelog.mjs bump <changelog-path> <version>",
    );
    process.exit(1);
  }

  if (command === "extract") {
    if (!existsSync(changelogPath)) {
      process.stdout.write("");
      return;
    }
    process.stdout.write(
      extractSection(readFileSync(changelogPath, "utf8"), version),
    );
  } else if (command === "bump") {
    if (!version) {
      console.error("bump requires a version argument");
      process.exit(1);
    }
    if (!existsSync(changelogPath)) {
      console.warn(`No CHANGELOG.md at ${changelogPath}, skipping bump`);
      return;
    }
    const result = bumpChangelog(
      readFileSync(changelogPath, "utf8"),
      version,
      localDate(),
    );
    if (result.status === "bumped") {
      writeFileSync(changelogPath, result.text);
    } else if (result.status === "already-bumped") {
      console.warn(`[${version}] already in ${changelogPath}, nothing to bump`);
    } else {
      console.warn(
        `No "## [Unreleased]" section found in ${changelogPath}, skipping bump`,
      );
    }
  } else {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }
}

// Run as a CLI, but stay importable (release.mjs uses the functions above).
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
