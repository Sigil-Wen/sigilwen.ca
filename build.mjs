import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";

const root = process.cwd();
const output = join(root, "dist", "server");
const sourceFiles = [
  ...readdirSync(root).filter((file) =>
    file.endsWith(".html") || file === "styles.css" || file === "site-navigation.js" || file === "og.png"
  ),
  "airchat/index.html",
  "angel/index.html",
  "conway/index.html",
  "essays/index.html",
  "extraordinary/index.html",
  "favorites/index.html",
  "projects/index.html",
  "videos/index.html",
];

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
};

const assets = Object.fromEntries(
  sourceFiles.map((file) => {
    const extension = extname(file);
    const binary = extension === ".png";
    const body = readFileSync(join(root, file), binary ? undefined : "utf8");
    return [
      `/${file}`,
      {
        body: binary ? body.toString("base64") : body,
        encoding: binary ? "base64" : "text",
        type: mimeTypes[extension] || "application/octet-stream",
      },
    ];
  })
);

assets["/"] = assets["/index.html"];
assets["/airchat"] = assets["/airchat/index.html"];
assets["/airchat/"] = assets["/airchat/index.html"];
assets["/angel"] = assets["/angel/index.html"];
assets["/angel/"] = assets["/angel/index.html"];
assets["/conway"] = assets["/conway/index.html"];
assets["/conway/"] = assets["/conway/index.html"];
assets["/essays"] = assets["/essays/index.html"];
assets["/essays/"] = assets["/essays/index.html"];
assets["/extraordinary"] = assets["/extraordinary/index.html"];
assets["/extraordinary/"] = assets["/extraordinary/index.html"];
assets["/favorites"] = assets["/favorites/index.html"];
assets["/favorites/"] = assets["/favorites/index.html"];
assets["/projects"] = assets["/projects/index.html"];
assets["/projects/"] = assets["/projects/index.html"];
assets["/videos"] = assets["/videos/index.html"];
assets["/videos/"] = assets["/videos/index.html"];
assets["/hacking"] = assets["/projects/index.html"];
assets["/hacking/"] = assets["/projects/index.html"];

const worker = `const assets = ${JSON.stringify(assets)};

function decodeBase64(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname);
    const asset = assets[path];

    if (!asset) {
      return new Response("Not found", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    const cacheControl = path === "/og.png"
      ? "public, max-age=604800"
      : "public, max-age=300";

    return new Response(
      asset.encoding === "base64" ? decodeBase64(asset.body) : asset.body,
      {
        headers: {
          "cache-control": cacheControl,
          "content-type": asset.type,
          "x-content-type-options": "nosniff",
        },
      }
    );
  },
};
`;

rmSync(join(root, "dist"), { recursive: true, force: true });
mkdirSync(output, { recursive: true });
writeFileSync(join(output, "index.js"), worker);
console.log(`Built ${sourceFiles.length} assets.`);
