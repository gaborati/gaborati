import fs from "fs";
 
const USERNAME = process.env.LEETCODE_USERNAME || "aaa96";
const README_PATH = "README.md";
 
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
      // LeetCode's public API sometimes requires a Referer header
      Referer: `https://leetcode.com/${username}/`,
    },
    body: JSON.stringify({
      query: QUERY,
      variables: { username },
    }),
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
 
function buildMarkdown(user) {
  const languages = user.languageProblemCount
    .filter((l) => l.problemsSolved > 0)
    .sort((a, b) => b.problemsSolved - a.problemsSolved);
 
  const skillGroups = [
    { label: "Advanced", items: user.tagProblemCounts.advanced },
    { label: "Intermediate", items: user.tagProblemCounts.intermediate },
    { label: "Fundamental", items: user.tagProblemCounts.fundamental },
  ];
 
  let md = "";
 
  md += "### Languages\n\n";
  md += "| Language | Problems solved |\n";
  md += "|----------|------------------|\n";
  for (const lang of languages) {
    md += `| ${lang.languageName} | ${lang.problemsSolved} |\n`;
  }
 
  md += "\n### Skills\n\n";
  for (const group of skillGroups) {
    const items = group.items
      .filter((s) => s.problemsSolved > 0)
      .sort((a, b) => b.problemsSolved - a.problemsSolved);
 
    if (items.length === 0) continue;
 
    md += `**${group.label}**\n\n`;
    for (const skill of items) {
      md += `- [${skill.tagName}](https://leetcode.com/tag/${skill.tagSlug}/) x${skill.problemsSolved}\n`;
    }
    md += "\n";
  }
 
  const now = new Date().toISOString().slice(0, 16).replace("T", " ");
  md += `_Last updated: ${now} UTC_\n`;
 
  return md.trim();
}
 
function updateReadme(markdown) {
  let readme = "";
  try {
    readme = fs.readFileSync(README_PATH, "utf8");
  } catch {
    readme = `${START_MARKER}\n${END_MARKER}\n`;
  }
 
  const block = `${START_MARKER}\n${markdown}\n${END_MARKER}`;
 
  if (readme.includes(START_MARKER) && readme.includes(END_MARKER)) {
    const startIdx = readme.indexOf(START_MARKER);
    const endIdx = readme.indexOf(END_MARKER) + END_MARKER.length;
    readme = readme.slice(0, startIdx) + block + readme.slice(endIdx);
  } else {
    // If the markers aren't in the README yet, append the block at the end.
    readme = readme.trim() + "\n\n" + block + "\n";
  }
 
  fs.writeFileSync(README_PATH, readme);
}
 
async function main() {
  console.log(`Fetching LeetCode stats for: ${USERNAME}`);
  const user = await fetchStats(USERNAME);
  const markdown = buildMarkdown(user);
  updateReadme(markdown);
  console.log("README.md updated successfully.");
}
 
main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
