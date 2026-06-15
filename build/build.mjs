import { execSync, spawnSync } from "child_process";
import { createHash } from "crypto";
import { existsSync, readFileSync, rmSync, writeFileSync, statSync } from "fs";
import { resolve, basename } from "path";

/**
 * Extract the current project version from package.json
 */
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const version = pkg.version;

const args = process.argv.slice(2);
console.log(`[Build System] Dynamic version detected: v${version}`);
console.log(`[Build System] Received arguments:`, args);

/**
 * Parse CLI arguments to determine if we should publish to GitHub
 */
const shouldPublish = args.some(
  (arg) =>
    arg === "--publish" ||
    arg === "-p" ||
    arg.startsWith("--publish=") ||
    arg.startsWith("-p="),
);

let publishPolicy = "always";
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if ((arg === "--publish" || arg === "-p") && args[i + 1]) {
    publishPolicy = args[i + 1];
  } else if (arg.startsWith("--publish=")) {
    publishPolicy = arg.split("=")[1];
  } else if (arg.startsWith("-p=")) {
    publishPolicy = arg.split("=")[1];
  }
}

/**
 * Utility functions
 */
function sha512Base64(filePath) {
  const buf = readFileSync(filePath);
  return createHash("sha512").update(buf).digest("base64");
}

/**
 * Generates latest.yml content that electron-updater expects.
 * See: https://www.electron.build/auto-update#auto-updatable-targets
 */
function buildLatestYml(installerPath, version) {
  const fileName = basename(installerPath);
  const sha512 = sha512Base64(installerPath);
  const size = statSync(installerPath).size;
  const releaseDate = new Date().toISOString();

  const content =
    [
      `version: ${version}`,
      `files:`,
      `  - url: ${fileName}`,
      `    sha512: ${sha512}`,
      `    size: ${size}`,
      `path: ${fileName}`,
      `sha512: ${sha512}`,
      `releaseDate: '${releaseDate}'`,
    ].join("\n") + "\n";

  return { content, sha512, size, fileName, releaseDate };
}

function findAppBuilderCli() {
  const candidates = [
    resolve("node_modules", "app-builder-bin", "win", "x64", "app-builder.exe"),
    resolve("node_modules", ".bin", "app-builder"),
    resolve("node_modules", ".bin", "app-builder.cmd"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Could not find app-builder CLI. Ensure app-builder-bin is installed and available in node_modules.\n" +
      `Expected one of:\n${candidates.join("\n")}`,
  );
}

function generateBlockmap(installerPath) {
  const appBuilderCli = findAppBuilderCli();
  const blockmapPath = `${installerPath}.blockmap`;

  console.log(
    `[Build System] Generating blockmap for ${basename(installerPath)}...`,
  );

  execSync(
    `"${appBuilderCli}" blockmap --input "${installerPath}" --output "${blockmapPath}"`,
    { stdio: "inherit" },
  );

  if (!existsSync(blockmapPath)) {
    throw new Error(
      `Blockmap generation failed: ${blockmapPath} was not created.`,
    );
  }

  return blockmapPath;
}

/**
 * Upload a file to a GitHub Release using the GH_TOKEN + GitHub REST API.
 * If the release does not exist yet, create it automatically.
 * Falls back to `gh` CLI if available.
 */
function publishFileToGitHub(filePath, version, publishConfig) {
  const ghToken = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!ghToken) {
    throw new Error(
      "GH_TOKEN environment variable is not set.\n" +
        "Set it with: $env:GH_TOKEN = 'your_token'",
    );
  }

  const { owner, repo } = publishConfig;
  const tag = `v${version}`;
  const fileName = basename(filePath);

  // Check if gh CLI is available
  const ghCli = spawnSync("gh", ["--version"], { shell: true });
  if (ghCli.status === 0) {
    // Use gh CLI — most reliable method
    ensureGitHubReleaseExistsWithGh(tag, owner, repo, ghToken);
    console.log(`[GitHub] Uploading "${fileName}" via gh CLI...`);
    execSync(
      `gh release upload ${tag} "${filePath}" --repo ${owner}/${repo} --clobber`,
      { stdio: "inherit", env: { ...process.env, GH_TOKEN: ghToken } },
    );
    return;
  }

  // Fall back to GitHub REST API via curl (built-in on Windows 10+)
  console.log(`[GitHub] gh CLI not found, using GitHub REST API directly...`);
  const releaseId = ensureGitHubReleaseExistsWithCurl(
    tag,
    owner,
    repo,
    ghToken,
  );
  const uploadUrl = `https://uploads.github.com/repos/${owner}/${repo}/releases/${releaseId}/assets?name=${encodeURIComponent(fileName)}`;

  console.log(`[GitHub] Uploading "${fileName}" to release ${releaseId}...`);
  execSync(
    `curl -X POST -H "Authorization: token ${ghToken}" -H "Content-Type: application/octet-stream" --data-binary @"${filePath}" "${uploadUrl}"`,
    { stdio: "inherit" },
  );
}

function ensureGitHubReleaseExistsWithGh(tag, owner, repo, ghToken) {
  const viewRelease = spawnSync(
    "gh",
    ["release", "view", tag, "--repo", `${owner}/${repo}`],
    {
      shell: true,
      stdio: "ignore",
      env: { ...process.env, GH_TOKEN: ghToken },
    },
  );

  if (viewRelease.status === 0) {
    return;
  }

  console.log(`[GitHub] Release ${tag} not found, creating draft release...`);
  execSync(
    `gh release create ${tag} --repo ${owner}/${repo} --title "${tag}" --notes "Automated release for ${tag}" --draft`,
    { stdio: "inherit", env: { ...process.env, GH_TOKEN: ghToken } },
  );
}

function ensureGitHubReleaseExistsWithCurl(tag, owner, repo, ghToken) {
  const releaseInfoCmd = `curl -s -H "Authorization: token ${ghToken}" -H "Accept: application/vnd.github.v3+json" https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`;
  const releaseInfo = JSON.parse(execSync(releaseInfoCmd).toString());

  if (releaseInfo?.id) {
    return releaseInfo.id;
  }

  console.log(
    `[GitHub] Release ${tag} not found, creating draft release via REST API...`,
  );
  const createReleaseCmd = `curl -s -X POST -H "Authorization: token ${ghToken}" -H "Accept: application/vnd.github.v3+json" -H "Content-Type: application/json" https://api.github.com/repos/${owner}/${repo}/releases -d '{"tag_name":"${tag}","name":"${tag}","body":"Automated release for ${tag}","draft":true}'`;
  const newRelease = JSON.parse(execSync(createReleaseCmd).toString());

  if (!newRelease?.id) {
    throw new Error(
      `Failed to create GitHub Release for tag ${tag} in ${owner}/${repo}.`,
    );
  }

  return newRelease.id;
}

// ─── Main Build Pipeline ──────────────────────────────────────────────────────
try {
  // Step 1: Build Vite frontend
  console.log("\n[Build System] Step 1: Building Vite frontend...");
  execSync("npm run vite-build", { stdio: "inherit" });

  // Step 2: Compile Electron TypeScript
  console.log(
    "\n[Build System] Step 2: Compiling Electron main/preload TypeScript...",
  );
  execSync("npx tsc -p electron", { stdio: "inherit" });

  // Step 3: Package with electron-builder (--dir only — no publishing)
  console.log(
    "\n[Build System] Step 3: Packaging with Electron Builder (--dir)...",
  );
  execSync("npx electron-builder --dir", { stdio: "inherit" });

  // Step 4: Compile Inno Setup installer
  console.log("\n[Build System] Step 4: Compiling Inno Setup installer...");
  const iscc = `${process.env.LOCALAPPDATA}\\Programs\\Inno Setup 6\\ISCC.exe`;

  if (!existsSync(iscc)) {
    console.error(`[Build System] ERROR: ISCC.exe not found at: ${iscc}`);
    process.exit(1);
  }

  const iss = resolve("build", "installer.iss");
  execSync(`"${iscc}" /DAppVersion=${version} "${iss}"`, { stdio: "inherit" });

  const installerFinal = resolve("release", `SonicMaster-Setup-${version}.exe`);

  if (!existsSync(installerFinal)) {
    console.error(
      `[Build System] ERROR: Installer not found at "${installerFinal}"`,
    );
    process.exit(1);
  }

  console.log(
    `[Build System] Installer ready: release/SonicMaster-Setup-${version}.exe`,
  );

  // Cleanup win-unpacked (no longer needed)
  const winUnpacked = resolve("release", "win-unpacked");
  if (existsSync(winUnpacked)) {
    console.log("[Build System] Cleaning up win-unpacked...");
    rmSync(winUnpacked, { recursive: true, force: true });
  }

  // Step 5: Generate latest.yml
  console.log("\n[Build System] Step 5: Generating latest.yml...");
  const {
    content: yamlContent,
    sha512,
    size,
    fileName,
  } = buildLatestYml(installerFinal, version);
  const latestYmlPath = resolve("release", "latest.yml");
  writeFileSync(latestYmlPath, yamlContent, "utf8");

  console.log("[Build System] latest.yml content:");
  console.log("─".repeat(50));
  console.log(yamlContent);
  console.log("─".repeat(50));

  const blockmapPath = generateBlockmap(installerFinal);

  console.log(`[Build System] Files ready in ./release/:`);
  console.log(
    `  ✓ SonicMaster-Setup-${version}.exe  (${(size / 1024 / 1024).toFixed(1)} MB)`,
  );
  console.log(`  ✓ SonicMaster-Setup-${version}.exe.blockmap`);
  console.log(`  ✓ latest.yml`);

  // Step 6: Publish to GitHub Releases
  if (shouldPublish) {
    console.log("\n[Build System] Step 6: Publishing to GitHub Releases...");
    const publishConfig = pkg.build?.publish;
    if (!publishConfig) {
      console.error(
        "[Build System] ERROR: Missing build.publish in package.json",
      );
      process.exit(1);
    }

    // Upload .exe first, then blockmap, then latest.yml
    publishFileToGitHub(installerFinal, version, publishConfig);
    console.log(`[Build System] ✓ Uploaded SonicMaster-Setup-${version}.exe`);

    publishFileToGitHub(blockmapPath, version, publishConfig);
    console.log(
      `[Build System] ✓ Uploaded SonicMaster-Setup-${version}.exe.blockmap`,
    );

    publishFileToGitHub(latestYmlPath, version, publishConfig);
    console.log(`[Build System] ✓ Uploaded latest.yml`);

    console.log(`\n[Build System] 🎉 Published v${version} successfully!`);
    console.log(
      `  → https://github.com/${publishConfig.owner}/${publishConfig.repo}/releases/tag/v${version}`,
    );
    console.log(
      `\n  electron-updater will now detect this release via latest.yml ✓`,
    );
  } else {
    console.log(
      "\n[Build System] Build complete (not published). Run 'npm run publish' to upload to GitHub.",
    );
  }
} catch (err) {
  console.error("\n[Build System] ERROR: Build failed!");
  console.error(err.message || err);
  process.exit(1);
}
