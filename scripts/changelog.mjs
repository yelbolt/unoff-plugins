import { existsSync, readFileSync, writeFileSync } from "node:fs";

const [, , command, changelogPath, version] = process.argv;

if (!command || !changelogPath) {
  console.error(
    "Usage: node scripts/changelog.mjs <extract|bump> <changelog-path> [version]",
  );
  process.exit(1);
}

function findUnreleasedSection(lines) {
  const startIndex = lines.findIndex((line) =>
    /^##\s*\[Unreleased\]/i.test(line),
  );
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

if (command === "extract") {
  if (!existsSync(changelogPath)) {
    process.stdout.write("");
    process.exit(0);
  }
  const lines = readFileSync(changelogPath, "utf8").split("\n");
  const section = findUnreleasedSection(lines);
  if (!section) {
    process.stdout.write("");
    process.exit(0);
  }
  const body = lines
    .slice(section.startIndex + 1, section.endIndex)
    .join("\n")
    .trim();
  process.stdout.write(body);
} else if (command === "bump") {
  if (!version) {
    console.error("bump requires a version argument");
    process.exit(1);
  }
  if (!existsSync(changelogPath)) {
    console.warn(`No CHANGELOG.md at ${changelogPath}, skipping bump`);
    process.exit(0);
  }
  const lines = readFileSync(changelogPath, "utf8").split("\n");
  const section = findUnreleasedSection(lines);
  if (!section) {
    console.warn(
      `No "## [Unreleased]" section found in ${changelogPath}, skipping bump`,
    );
    process.exit(0);
  }
  const date = new Date().toISOString().slice(0, 10);
  lines.splice(section.startIndex + 1, 0, "", `## [${version}] - ${date}`);
  writeFileSync(changelogPath, lines.join("\n"));
} else {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}
