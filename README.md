# Personal-Website
 Sigil's epicly styled personal website hosted at sigilwen.ca :^)

## GitHub activity

The homepage and Projects page display public GitHub activity from
`github-activity.json`. Refresh the snapshot with `npm run refresh:github`;
run `npm run build` to include it in the bundled preview.

The `Refresh GitHub activity` workflow refreshes the snapshot daily and can
also be run manually in GitHub Actions. It commits only the public data file
using the repository's built-in token; no personal token is needed. Failed
fetches or unexpected GitHub markup leave the previous snapshot intact.

The live site renders its local snapshot first, then checks the raw file on
the main branch for newer data. This keeps the graph current even though
commits made by the Actions token do not trigger a GitHub Pages rebuild.
Local previews use only their local snapshot. The date below the graph
shows when the data was last fetched.
