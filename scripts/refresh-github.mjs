import { rename, writeFile } from "node:fs/promises";
import { fetchSnapshot } from "./github-data.mjs";

const destination = new URL("../github-activity.json", import.meta.url);
const temporary = new URL("../github-activity.json.tmp", import.meta.url);
const data = await fetchSnapshot();
// Keep the last valid snapshot if GitHub is down or its markup changes.
await writeFile(temporary, `${JSON.stringify(data)}\n`);
await rename(temporary, destination);
console.log(`Updated GitHub: ${data.totalContributions.toLocaleString("en-US")} contributions, ${data.followers} followers, ${data.publicRepos} public repos.`);
