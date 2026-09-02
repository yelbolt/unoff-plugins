import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const [, , mode, target] = process.argv;

if (mode !== "development" && mode !== "production" && mode !== "start") {
  console.error(
    "Usage: node scripts/build.mjs <development|production> [target]\n" +
      "       node scripts/build.mjs start <plugin>",
  );
  process.exit(1);
}

const root = process.cwd();
const IGNORED_DIRS = new Set(["node_modules", "dist", "scripts"]);

const isPluginDir = (dir) => existsSync(join(dir, "package.json"));

const listPlatforms = () =>
  readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith(".") && !IGNORED_DIRS.has(name));

const listPluginsOfPlatform = (platform) => {
  const platformDir = join(root, platform);
  if (!existsSync(platformDir)) return [];
  return readdirSync(platformDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => isPluginDir(join(platformDir, name)))
    .map((name) => `${platform}/${name}`);
};

const listAllPlugins = () => listPlatforms().flatMap(listPluginsOfPlatform);

function resolveTarget(target) {
  if (!target) return listAllPlugins();

  if (target.includes("/")) {
    if (!isPluginDir(join(root, target))) {
      console.error(
        `'${target}' is not a known plugin workspace (missing package.json)`,
      );
      process.exit(1);
    }
    return [target];
  }

  if (listPlatforms().includes(target)) {
    return listPluginsOfPlatform(target);
  }

  const matches = listAllPlugins().filter(
    (plugin) => plugin.split("/")[1] === target,
  );
  if (matches.length === 0) {
    console.error(`No plugin or platform named '${target}' found`);
    process.exit(1);
  }
  if (matches.length > 1) {
    console.error(
      `'${target}' is ambiguous across platforms (${matches.join(", ")}). Use "platform/name" instead.`,
    );
    process.exit(1);
  }
  return matches;
}

if (mode === "start") {
  if (!target) {
    console.error(
      "start requires exactly one plugin, e.g. node scripts/build.mjs start token-lint",
    );
    process.exit(1);
  }
  const plugins = resolveTarget(target);
  if (plugins.length !== 1) {
    console.error(
      `start requires exactly one plugin; '${target}' resolved to ${plugins.length}: ${plugins.join(", ")}`,
    );
    process.exit(1);
  }
  const [plugin] = plugins;
  console.log(`Starting ${plugin} (its own start:dev — build watch + preview)`);
  const child = spawn("npm", ["run", "start:dev"], {
    cwd: join(root, plugin),
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  process.on("SIGINT", () => {
    child.kill("SIGINT");
    process.exit(0);
  });
  child.on("close", (code) => process.exit(code ?? 0));
} else {
  const plugins = resolveTarget(target);

  if (plugins.length === 0) {
    console.error(
      `No plugin workspace found${target ? ` for '${target}'` : ""}`,
    );
    process.exit(1);
  }

  const script = mode === "development" ? "build" : "build:prod";
  const isDev = mode === "development";

  console.log(
    `${isDev ? "Watching" : "Building"} ${plugins.length} plugin(s) in ${mode} mode: ${plugins.join(", ")}`,
  );

  const children = plugins.map((plugin) => {
    const child = spawn("npm", ["run", script], {
      cwd: join(root, plugin),
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.pluginName = plugin;
    return child;
  });

  if (isDev) {
    process.on("SIGINT", () => {
      children.forEach((child) => child.kill("SIGINT"));
      process.exit(0);
    });
  } else {
    let exitCode = 0;
    await Promise.all(
      children.map(
        (child) =>
          new Promise((resolve) => {
            child.on("close", (code) => {
              if (code) {
                exitCode = code;
                console.error(`✗ ${child.pluginName} exited with code ${code}`);
              }
              resolve();
            });
          }),
      ),
    );
    process.exit(exitCode);
  }
}
