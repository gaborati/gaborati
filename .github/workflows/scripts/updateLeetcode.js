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
