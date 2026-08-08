// scripts/updateLeetcode.js
//
// Fetches per-language and per-skill-tag solved problem counts from
// LeetCode's public GraphQL API, generates a styled SVG stats card,
// saves it as leetcode-card.svg, and makes sure README.md embeds it
// between the <!-- LEETCODE-STATS:START --> and
// <!-- LEETCODE-STATS:END --> markers.
 
import fs from "fs";
 
const USERNAME = process.env.LEETCODE_USERNAME || "aaa96";
const README_PATH = "README.md";
const SVG_PATH = "leetcode-card.svg";
 
const START_MARKER = "<!-- LEETCODE-STATS:START -->";
const END_MARKER = "<!-- LEETCODE-STATS:END -->";
 
const QUERY = `
  query userProblemsSolved($username: String!) {
    matchedUser(username: $username) {
      languageProblemCount {
        languageName
        problemsSolved
      }
      tagProblemCounts {
        advanced {
          tagName
          tagSlug
          problemsSolved
        }
        intermediate {
          tagName
          tagSlug
          problemsSolved
        }
        fundamental {
          tagName
          tagSlug
          problemsSolved
        }
      }
    }
  }
`;
 
async function fetchStats(username) {
  const res = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: `https://leetcode.com/${username}/`,
    },
    body: JSON.stringify({ query: QUERY, variables: { username } }),
  });
 
  if (!res.ok) {
    throw new Error(`LeetCode API error: ${res.status} ${res.statusText}`);
  }
 
  const json = await res.json();
 
  if (json.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`);
  }
 
  if (!json.data.matchedUser) {
    throw new Error(`No LeetCode user found for "${username}".`);
  }
 
  return json.data.matchedUser;
}
 
function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
 
// Lay out pills left to right, wrapping to a new row when the card width
// (minus side padding) would be exceeded. Returns rows of positioned pills
// and the total height consumed.
function layoutPills(items, startY, cardWidth) {
  const padX = 28;
  const maxX = cardWidth - padX;
  const pillHeight = 26;
  const rowGap = 10;
  const pillGap = 8;
  const charWidth = 6.5;
 
  let x = padX;
  let y = startY;
  const positioned = [];
 
  for (const item of items) {
    const label = `${item.tagName} x${item.problemsSolved}`;
    const width = Math.round(label.length * charWidth + 24);
 
    if (x + width > maxX && x !== padX) {
      x = padX;
      y += pillHeight + rowGap;
    }
 
    positioned.push({ label, x, y, width, height: pillHeight });
    x += width + pillGap;
  }
 
  const endY = y + pillHeight;
  return { positioned, endY };
}
 
function buildSvg(user) {
  const cardWidth = 680;
  const padX = 28;
 
  const languages = user.languageProblemCount
    .filter((l) => l.problemsSolved > 0)
    .sort((a, b) => b.problemsSolved - a.problemsSolved);
 
  const maxSolved = Math.max(1, ...languages.map((l) => l.problemsSolved));
  const barMaxWidth = 300;
  const langColors = ["#F0997B", "#EF9F27", "#5DCAA5", "#7F77DD", "#D4537E"];
 
  const skillGroups = [
    { label: "ADVANCED", items: user.tagProblemCounts.advanced, fg: "#ED93B1", bg: "#4B1528", border: "#D4537E", title: "#D4537E" },
    { label: "INTERMEDIATE", items: user.tagProblemCounts.intermediate, fg: "#AFA9EC", bg: "#26215C", border: "#7F77DD", title: "#7F77DD" },
    { label: "FUNDAMENTAL", items: user.tagProblemCounts.fundamental, fg: "#5DCAA5", bg: "#04342C", border: "#1D9E75", title: "#1D9E75" },
  ].map((g) => ({
    ...g,
    items: g.items.filter((s) => s.problemsSolved > 0).sort((a, b) => b.problemsSolved - a.problemsSolved),
  }));
 
  let svgParts = [];
  let y = 80;
 
  // Languages section
  svgParts.push(`<text x="${padX}" y="${y}" fill="#8b949e" font-size="13" font-family="sans-serif">Languages</text>`);
  y += 26;
 
  languages.forEach((lang, i) => {
    const barWidth = Math.max(20, Math.round((lang.problemsSolved / maxSolved) * barMaxWidth));
    const color = langColors[i % langColors.length];
    svgParts.push(`<text x="${padX}" y="${y}" fill="#e6edf3" font-size="13" font-family="sans-serif">${escapeXml(lang.languageName)}</text>`);
    svgParts.push(`<rect x="120" y="${y - 12}" width="${barMaxWidth}" height="14" rx="7" fill="#21262d"/>`);
    svgParts.push(`<rect x="120" y="${y - 12}" width="${barWidth}" height="14" rx="7" fill="${color}"/>`);
    svgParts.push(`<text x="${120 + barMaxWidth + 10}" y="${y}" fill="#8b949e" font-size="12" font-family="sans-serif">${lang.problemsSolved}</text>`);
    y += 26;
  });
 
  y += 10;
  svgParts.push(`<line x1="${padX}" y1="${y}" x2="${cardWidth - padX}" y2="${y}" stroke="#21262d" stroke-width="1"/>`);
  y += 28;
 
  svgParts.push(`<text x="${padX}" y="${y}" fill="#8b949e" font-size="13" font-family="sans-serif">Skills</text>`);
  y += 20;
 
  for (const group of skillGroups) {
    if (group.items.length === 0) continue;
 
    svgParts.push(`<text x="${padX}" y="${y}" fill="${group.title}" font-size="12" font-family="sans-serif" font-weight="600">${group.label}</text>`);
    y += 10;
 
    const { positioned, endY } = layoutPills(group.items, y, cardWidth);
    for (const p of positioned) {
      svgParts.push(`<rect x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" rx="13" fill="${group.bg}" stroke="${group.border}" stroke-width="1"/>`);
      svgParts.push(`<text x="${p.x + p.width / 2}" y="${p.y + 17}" fill="${group.fg}" font-size="12" font-family="sans-serif" text-anchor="middle">${escapeXml(p.label)}</text>`);
    }
    y = endY + 24;
  }
 
  const now = new Date().toISOString().slice(0, 10);
  y += 6;
  svgParts.push(`<text x="${cardWidth - padX}" y="${y}" fill="#484f58" font-size="10" font-family="sans-serif" text-anchor="end">updated ${now}</text>`);
 
  const cardHeight = y + 20;
 
  const svg = `<svg width="${cardWidth}" height="${cardHeight}" viewBox="0 0 ${cardWidth} ${cardHeight}" xmlns="http://www.w3.org/2000/svg" role="img">
<title>LeetCode stats for ${escapeXml(USERNAME)}</title>
<rect x="0" y="0" width="${cardWidth}" height="${cardHeight}" rx="12" fill="#0d1117" stroke="#30363d" stroke-width="1"/>
<text x="${padX}" y="42" fill="#e6edf3" font-size="18" font-family="sans-serif" font-weight="600">LeetCode stats — ${escapeXml(USERNAME)}</text>
${svgParts.join("\n")}
</svg>`;
 
  return svg;
}
 
function updateReadme() {
  let readme = "";
  try {
    readme = fs.readFileSync(README_PATH, "utf8");
  } catch {
    readme = `${START_MARKER}\n${END_MARKER}\n`;
  }
 
  const block = `${START_MARKER}\n![LeetCode stats](./${SVG_PATH})\n${END_MARKER}`;
 
  if (readme.includes(START_MARKER) && readme.includes(END_MARKER)) {
    const startIdx = readme.indexOf(START_MARKER);
    const endIdx = readme.indexOf(END_MARKER) + END_MARKER.length;
    readme = readme.slice(0, startIdx) + block + readme.slice(endIdx);
  } else {
    readme = readme.trim() + "\n\n" + block + "\n";
  }
 
  fs.writeFileSync(README_PATH, readme);
}
 
async function main() {
  console.log(`Fetching LeetCode stats for: ${USERNAME}`);
  const user = await fetchStats(USERNAME);
  const svg = buildSvg(user);
  fs.writeFileSync(SVG_PATH, svg);
  updateReadme();
  console.log("leetcode-card.svg and README.md updated successfully.");
}
 
main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
