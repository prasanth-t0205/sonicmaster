/**
 * Inno Setup build script
 *
 * Compiles the installer.iss file using the Inno Setup Compiler (ISCC.exe)
 * to generate the final Windows executable installer.
 */
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const version = pkg.version;

const iscc = `${process.env.LOCALAPPDATA}\\Programs\\Inno Setup 6\\ISCC.exe`;

if (!existsSync(iscc)) {
  console.error("Inno Setup not found at:", iscc);
  process.exit(1);
}

const iss = resolve("build", "installer.iss");

console.log(`Building Inno Setup installer for v${version}...`);
execSync(`"${iscc}" /DAppVersion=${version} "${iss}"`, { stdio: "inherit" });
console.log(`Done! Installer is at release/SonicMaster-Setup-${version}.exe`);
