import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fg from "fast-glob";
import path from "node:path";
import fs from "node:fs";
import tailwindcss from "@tailwindcss/vite";

function buildInputs() {
  const files = fg.sync("src/**/index.{tsx,jsx}", { dot: false });
  return Object.fromEntries(
    files.map((f) => [path.basename(path.dirname(f)), path.resolve(f)])
  );
}

const toFs = (abs: string) => {
  // Use server root path instead of @fs for better compatibility
  return "./" + path.posix.relative(process.cwd(), abs).replace(/\\/g, "/");
};

const toServerRoot = (abs: string) =>
  "./" + path.posix.relative(process.cwd(), abs).replace(/\\/g, "/");

function multiEntryDevEndpoints(options: {
  entries: Record<string, string>;
  globalCss?: string[];
  perEntryCssGlob?: string;
  perEntryCssIgnore?: string[];
}): Plugin {
  const {
    entries,
    globalCss = ["src/index.css"],
    perEntryCssGlob = "**/*.{css,pcss,scss,sass}",
    perEntryCssIgnore = ["**/*.module.*"],
  } = options;

  return {
    name: "multi-entry-dev-endpoints",
    configureServer(server) {
      // Add root path handler
      server.middlewares.use("/", async (req, res, next) => {
        if (req.url === "/" || req.url === "/index.html") {
          const availableEndpoints = Object.keys(entries);
          let html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Remember Book - Dev Server</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 40px; }
      h1 { color: #333; }
      ul { list-style: none; padding: 0; }
      li { margin: 10px 0; }
      a { 
        display: inline-block; 
        padding: 10px 15px; 
        background: #f0f0f0; 
        text-decoration: none; 
        border-radius: 5px; 
        color: #333;
      }
      a:hover { background: #e0e0e0; }
    </style>
  </head>
  <body>
    <h1>Remember Book - Development Server</h1>
    <p>Available applications:</p>
    <ul>
      ${availableEndpoints
        .map((name) => `<li><a href="/${name}">${name}</a></li>`)
        .join("")}
    </ul>
  </body>
</html>`;
          // Allow other Vite plugins (e.g. react) to inject their preamble/transformations
          try {
            html = await server.transformIndexHtml(req.url!, html);
          } catch (err) {
            console.error("transformIndexHtml (root) failed", err);
          }
          res.setHeader("Content-Type", "text/html");
          res.end(html);
          return;
        }
        next();
      });

      for (const [name, entryFile] of Object.entries(entries)) {
        server.middlewares.use(`/${name}`, async (req, res, next) => {
          if (req.url === "/" || req.url === "/index.html") {
            const entryDir = path.dirname(entryFile);

            // Collect per-entry CSS
            const perEntryCss = fg.sync(perEntryCssGlob, {
              cwd: entryDir,
              absolute: true,
              dot: false,
              ignore: perEntryCssIgnore,
            });

            // Global CSS (only include existing files)
            const existingGlobalCss = globalCss.filter((p) =>
              fs.existsSync(path.resolve(p))
            );

            // We now rely on explicit CSS imports inside each entry (e.g. index.tsx -> ../index.css)
            // to ensure Tailwind passes through Vite's transform pipeline. Injecting raw <link>
            // tags here can serve the unprocessed source (missing utilities). So skip automatic links.
            const cssImports = "";

            let html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name}</title>
    ${cssImports}
  </head>
  <body>
    <div id="${name}-root"></div>
    <script type="module" src="${toFs(entryFile)}"></script>
  </body>
</html>`;
            try {
              html = await server.transformIndexHtml(req.url!, html);
            } catch (err) {
              console.error(`transformIndexHtml (${name}) failed`, err);
            }
            res.setHeader("Content-Type", "text/html");
            res.end(html);
          } else {
            next();
          }
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    react({
      jsxRuntime: "automatic",
      jsxImportSource: "react",
    }),
    multiEntryDevEndpoints({
      entries: buildInputs(),
    }),
  ],
  server: {
    port: 5173,
    host: true,
  },
});
