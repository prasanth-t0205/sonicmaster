import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import JavaScriptObfuscator from "javascript-obfuscator";

// Custom secure obfuscation plugin for production builds
function obfuscatePlugin() {
  return {
    name: "vite-plugin-javascript-obfuscator",
    enforce: "post" as const,
    apply: "build" as const,
    generateBundle(options: any, bundle: any) {
      for (const [fileName, fileObj] of Object.entries(bundle)) {
        const file = fileObj as any;
        if (file && file.type === "chunk" && fileName.endsWith(".js")) {
          console.log(`[Obfuscator] Securing & Obfuscating ${fileName}...`);
          try {
            const obfuscationResult = JavaScriptObfuscator.obfuscate(
              file.code,
              {
                compact: true,
                controlFlowFlattening: true,
                controlFlowFlatteningThreshold: 0.5, // 50% flattening is a great balance between strong security and rendering performance
                numbersToExpressions: true,
                simplify: true,
                stringArray: true,
                stringArrayThreshold: 0.75,
                splitStrings: true,
                splitStringsChunkLength: 10,
                mangle: true,
                deadCodeInjection: true,
                deadCodeInjectionThreshold: 0.2, // inject some dead code to confuse reversers
                debugProtection: false, // set to true if you want to make it incredibly hard to open devtools in prod
              },
            );
            file.code = obfuscationResult.getObfuscatedCode();
          } catch (err) {
            console.error(`[Obfuscator] Failed to obfuscate ${fileName}:`, err);
          }
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), obfuscatePlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: "./", // Crucial for Electron to load local resources under file:// and app:// protocols
  build: {
    outDir: "out", // Keeping 'out' to perfectly match Electron builder config and main.ts paths
    emptyOutDir: true,
    sourcemap: false, // Completely disable source maps so developers cannot inspect original TS source files in DevTools
  },
  server: {
    watch: {
      ignored: ["**/release/**"],
    },
  },
});
