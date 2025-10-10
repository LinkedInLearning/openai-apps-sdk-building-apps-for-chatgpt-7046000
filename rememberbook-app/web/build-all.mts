import { build, type InlineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fg from "fast-glob";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import pkg from "./package.json" with { type: "json" };
import tailwindcss from "@tailwindcss/vite";

const entries = fg.sync("src/**/index.{tsx,jsx}");
const outDir = "assets";

const PER_ENTRY_CSS_GLOB = "**/*.{css,pcss,scss,sass}";
const PER_ENTRY_CSS_IGNORE = "**/*.module.*".split(",").map((s) => s.trim());
const GLOBAL_CSS_LIST = [path.resolve("src/index.css")];

const targets: string[] = [
  "ideas-list",
  "idea-detail",
];
const builtNames: string[] = [];

function wrapEntryPlugin(
  virtualId: string,
  entryFile: string,
  cssPaths: string[]
): Plugin {
  return {
    name: `virtual-entry-wrapper:${entryFile}`,
    resolveId(id) {
      if (id === virtualId) return id;
      return null;
    },
    load(id) {
      if (id !== virtualId) {
        return null;
      }

      const cssImports = cssPaths
        .map((css) => `import ${JSON.stringify(css)};`)
        .join("\n");

      return `
${cssImports}
import ${JSON.stringify(entryFile)};
`;
    },
  };
}

fs.rmSync(outDir, { recursive: true, force: true });

for (const file of entries) {
  const name = path.basename(path.dirname(file));
  if (targets.length && !targets.includes(name)) {
    continue;
  }

  const entryAbs = path.resolve(file);
  const entryDir = path.dirname(entryAbs);

  // Collect CSS for this entry using the glob(s) rooted at its directory
  const perEntryCss = fg.sync(PER_ENTRY_CSS_GLOB, {
    cwd: entryDir,
    absolute: true,
    dot: false,
    ignore: PER_ENTRY_CSS_IGNORE,
  });

  // Global CSS (Tailwind, etc.), only include those that exist
  const globalCss = GLOBAL_CSS_LIST.filter((p) => fs.existsSync(p));

  // Final CSS list (global first for predictable cascade)
  const cssToInclude = [...globalCss, ...perEntryCss].filter((p) =>
    fs.existsSync(p)
  );

  const createConfig = (): InlineConfig => ({
    plugins: [
      tailwindcss(),
      react(),
      {
        name: "remove-manual-chunks",
        outputOptions(options) {
          if ("manualChunks" in options) {
            delete (options as any).manualChunks;
          }
          return options;
        },
      },
    ],
    build: {
      outDir,
      emptyOutDir: false,
      lib: {
        entry: entryAbs,
        name,
        formats: ["es"],
      },
      rollupOptions: {
        output: {
          entryFileNames: (chunkInfo) => {
            // Create a stable content hash for the bundle
            const hash = crypto
              .createHash("md5")
              .update(`${pkg.version}-${name}`)
              .digest("hex")
              .slice(0, 8);
            
            const filename = `${name}.${hash}.js`;
            builtNames.push(filename);
            return filename;
          },
          assetFileNames: (assetInfo) => {
            if (assetInfo.name && assetInfo.name.endsWith('.css')) {
              const hash = crypto
                .createHash("md5")
                .update(`${pkg.version}-${name}`)
                .digest("hex")
                .slice(0, 8);
              return `${name}.${hash}.css`;
            }
            return assetInfo.name || 'asset';
          },
        },
      },
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
  });

  console.log(`Building ${name}...`);
  
  try {
    await build(createConfig());
    console.log(`✓ Built ${name}`);
  } catch (error) {
    console.error(`✗ Failed to build ${name}:`, error);
    process.exit(1);
  }
}

// Generate HTML templates for each component
for (const file of entries) {
  const name = path.basename(path.dirname(file));
  if (targets.length && !targets.includes(name)) {
    continue;
  }

  const jsFile = builtNames.find(f => f.startsWith(name));
  const cssFile = fs.readdirSync(outDir).find(f => f.startsWith(name) && f.endsWith('.css'));
  
  if (jsFile) {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name}</title>
    ${cssFile ? `<link rel="stylesheet" href="./${cssFile}" />` : ''}
  </head>
  <body>
    <div id="${name}-root"></div>
    <script type="module" src="./${jsFile}"></script>
  </body>
</html>`;

    const htmlHash = crypto
      .createHash("md5")
      .update(htmlContent)
      .digest("hex")
      .slice(0, 8);
    
    const htmlFilename = `${name}.${htmlHash}.html`;
    fs.writeFileSync(path.join(outDir, htmlFilename), htmlContent);
    console.log(`✓ Generated ${htmlFilename}`);
  }
}

console.log(`\n🎉 Build complete! Assets generated in ./${outDir}/`);
console.log(`Built components: ${targets.join(", ")}`);

// Create a manifest file for the MCP server
const manifest = {
  version: pkg.version,
  buildTimestamp: new Date().toISOString(),
  components: targets.reduce((acc, name) => {
    const jsFile = builtNames.find(f => f.startsWith(name));
    const cssFile = fs.readdirSync(outDir).find(f => f.startsWith(name) && f.endsWith('.css'));
    const htmlFile = fs.readdirSync(outDir).find(f => f.startsWith(name) && f.endsWith('.html'));
    
    if (jsFile) {
      acc[name] = {
        js: jsFile,
        css: cssFile || null,
        html: htmlFile || null,
        rootElementId: `${name}-root`,
        // Include versioned URI for cache busting
        resourceUri: `ui://widget/v${pkg.version}/${name}.html`,
        templateUri: `ui://widget/v${pkg.version}/${name}.html`
      };
    }
    return acc;
  }, {} as Record<string, any>)
};

fs.writeFileSync(
  path.join(outDir, "manifest.json"), 
  JSON.stringify(manifest, null, 2)
);
console.log("✓ Generated manifest.json");