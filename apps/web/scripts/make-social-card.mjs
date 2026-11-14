// Build-time rasterization of original vectors/text. No photos, models, or remote fonts.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement as h } from "react";
import { ImageResponse } from "next/og.js";

export async function makeSocialCard() {
  const brand = JSON.parse(fs.readFileSync(new URL("../../../packages/shared/brand.json", import.meta.url), "utf8"));
  const box = (style, ...children) => h("div", { style: { display: "flex", ...style } }, ...children);
  const stone = (width, height, color) => box({ width, height, borderRadius: "50%", background: color });
  const card = box({ width: "100%", height: "100%", background: "#faf7f2", color: "#141414", padding: "60px 72px", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden", fontFamily: "geist" },
    box({ position: "absolute", width: 340, height: 340, right: -100, top: -110, borderRadius: "50%", background: "#dcebf3" }),
    box({ position: "absolute", width: 200, height: 200, right: 110, bottom: -95, borderRadius: "50%", background: "#e5533d" }),
    box({ alignItems: "center", gap: 18 }, box({ alignItems: "center", flexDirection: "column", gap: 2 }, stone(18, 10, "#256a8c"), stone(30, 12, "#c2381f"), stone(42, 15, "#141414")), h("span", { style: { fontSize: 28 } }, "Independent concept demo")),
    box({ flexDirection: "column", gap: 20 }, h("span", { style: { fontSize: 104, letterSpacing: -5, lineHeight: 1.05 } }, brand.projectName), h("span", { style: { fontSize: 40, letterSpacing: -1 } }, "A clearer next step after a disaster.")),
    box({ alignItems: "center", gap: 18, fontSize: 23, color: "#57524a" }, "Sample photos", stone(7, 7, "#c2381f"), "Scripted guidance", stone(7, 7, "#256a8c"), "No uploads or live AI"),
  );
  // Prove the renderer cannot fetch an image, font, or other remote resource.
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (resource, init) => {
    const target = typeof resource === "string" ? resource : resource instanceof URL ? resource.href : resource.url;
    if (!/^(data|blob|file):/.test(target)) throw new Error("Social-card rendering must stay offline.");
    return originalFetch(resource, init);
  };
  try {
    const response = new ImageResponse(card, { width: 1200, height: 630 });
    fs.writeFileSync(fileURLToPath(new URL("../public/social-card.png", import.meta.url)), Buffer.from(await response.arrayBuffer()));
  } finally { globalThis.fetch = originalFetch; }
}
