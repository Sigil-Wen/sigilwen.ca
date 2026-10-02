(() => {
  const profileUrl = "https://github.com/Sigil-Wen";
  const svgNamespace = "http://www.w3.org/2000/svg";
  const numberFormat = new Intl.NumberFormat("en-US");
  const dateFormat = new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
  const monthFormat = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
  const deployedHosts = new Set(["sigilwen.ca", "www.sigilwen.ca", "sigil-wen.github.io"]);
  let activityRequest;
  let latestActivityRequest;
  let calendarId = 0;

  const isCount = (value) => Number.isSafeInteger(value) && value >= 0;

  function validateActivity(data) {
    if (data?.username !== "Sigil-Wen" ||
        ![data.followers, data.following, data.publicRepos, data.totalContributions].every(isCount) ||
        !Number.isFinite(Date.parse(data.updatedAt)) ||
        !Array.isArray(data.days) || data.days.length < 365 || data.days.length > 373) {
      throw new Error("Invalid GitHub activity snapshot");
    }

    let previousDate = 0;
    for (const day of data.days) {
      const timestamp = Date.parse(`${day.date}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Number.isFinite(timestamp) ||
          new Date(timestamp).toISOString().slice(0, 10) !== day.date ||
          !isCount(day.count) || !Number.isInteger(day.level) || day.level < 0 || day.level > 4 ||
          (previousDate && timestamp - previousDate !== 86400000)) {
        throw new Error("Invalid GitHub contribution day");
      }
      previousDate = timestamp;
    }
    if (new Date(`${data.days[0].date}T00:00:00Z`).getUTCDay() !== 0) {
      throw new Error("GitHub calendar must start on Sunday");
    }
    return data;
  }

  function loadActivity() {
    if (!activityRequest) {
      activityRequest = fetch("/github-activity.json", { cache: "no-cache", signal: AbortSignal.timeout(10_000) })
        .then((response) => {
          if (!response.ok) throw new Error("GitHub activity is unavailable");
          return response.json();
        })
        .then(validateActivity);
    }
    return activityRequest;
  }

  function loadLatestActivity() {
    if (!latestActivityRequest) {
      latestActivityRequest = fetch("https://raw.githubusercontent.com/Sigil-Wen/sigilwen.ca/main/github-activity.json", { cache: "no-cache", signal: AbortSignal.timeout(10_000) })
        .then((response) => {
          if (!response.ok) throw new Error("Latest GitHub activity is unavailable");
          return response.json();
        })
        .then(validateActivity);
    }
    return latestActivityRequest;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function svgElement(tag, attributes, text) {
    const node = document.createElementNS(svgNamespace, tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function link(text, href) {
    const node = element("a", "", text);
    node.href = href;
    return node;
  }

  function calendar(data) {
    const weeks = Math.ceil(data.days.length / 7);
    const width = 34 + weeks * 12 + 12;
    const titleId = `github-calendar-title-${++calendarId}`;
    const svg = svgElement("svg", {
      class: "github-calendar", viewBox: `0 0 ${width} 110`,
      role: "img", "aria-labelledby": titleId,
    });
    const start = dateFormat.format(new Date(`${data.days[0].date}T00:00:00Z`));
    const end = dateFormat.format(new Date(`${data.days.at(-1).date}T00:00:00Z`));
    svg.append(svgElement("title", { id: titleId },
      `${numberFormat.format(data.totalContributions)} GitHub contributions in the last year. Daily activity from ${start} to ${end}. Darker green means more contributions.`));

    for (const [label, row] of [["Mon", 1], ["Wed", 3], ["Fri", 5]]) {
      svg.append(svgElement("text", { x: 0, y: 29 + row * 12, class: "github-calendar-label" }, label));
    }

    data.days.forEach((day, index) => {
      const date = new Date(`${day.date}T00:00:00Z`);
      const x = 34 + Math.floor(index / 7) * 12;
      const y = 21 + (index % 7) * 12;
      if (date.getUTCDate() === 1 || (index === 0 && date.getUTCDate() <= 7)) {
        svg.append(svgElement("text", { x, y: 11, class: "github-calendar-label" }, monthFormat.format(date)));
      }
      const cell = svgElement("rect", {
        x, y, width: 9, height: 9, rx: 2,
        class: "github-calendar-day", "data-level": day.level,
      });
      const contributions = `${numberFormat.format(day.count)} contribution${day.count === 1 ? "" : "s"}`;
      cell.append(svgElement("title", {}, `${contributions} on ${dateFormat.format(date)}`));
      svg.append(cell);
    });

    return svg;
  }

  class GitHubActivity extends HTMLElement {
    async connectedCallback() {
      if (this.dataset.initialized) return;
      this.dataset.initialized = "true";
      let displayedSnapshot;
      try {
        const data = await loadActivity();
        if (!this.isConnected) return;
        this.render(data);
        displayedSnapshot = data;
      } catch {
        // Keep the original profile link available if the snapshot cannot load.
      }

      if (deployedHosts.has(window.location.hostname)) {
        try {
          const latest = await loadLatestActivity();
          if (this.isConnected && (!displayedSnapshot || Date.parse(latest.updatedAt) > Date.parse(displayedSnapshot.updatedAt))) {
            this.render(latest);
          }
        } catch {
          // The bundled snapshot remains useful when GitHub cannot be reached.
        }
      }
    }

    render(data) {
      const header = element("div", "github-activity-header");
      const total = element("p", "github-contribution-total");
      total.append(element("strong", "", numberFormat.format(data.totalContributions)), " contributions in the last year");
      const profile = element("p", "github-profile");
      profile.append(link("@Sigil-Wen on GitHub", profileUrl));
      header.append(total, profile);

      const stats = element("ul", "github-stats");
      stats.setAttribute("role", "list");
      for (const [count, label, query] of [
        [data.followers, "followers", "followers"],
        [data.following, "following", "following"],
        [data.publicRepos, "public repos", "repositories"],
      ]) {
        const item = element("li");
        item.append(link(`${numberFormat.format(count)} ${label}`, `${profileUrl}?tab=${query}`));
        stats.append(item);
      }

      const scroll = element("div", "github-calendar-scroll");
      scroll.tabIndex = 0;
      scroll.setAttribute("role", "region");
      scroll.setAttribute("aria-label", "GitHub contribution calendar. Scroll horizontally to see the full year.");
      scroll.append(calendar(data));

      const footer = element("div", "github-activity-footer");
      const updated = element("p", "github-updated", "Updated ");
      const time = element("time", "", dateFormat.format(new Date(data.updatedAt)));
      time.dateTime = data.updatedAt;
      updated.append(time);
      const legend = element("div", "github-calendar-legend");
      legend.setAttribute("aria-hidden", "true");
      legend.append(element("span", "", "Less"));
      for (let level = 0; level < 5; level++) {
        const swatch = element("span", "github-calendar-swatch");
        swatch.dataset.level = level;
        legend.append(swatch);
      }
      legend.append(element("span", "", "More"));
      footer.append(updated, legend);

      this.replaceChildren(header, stats, scroll, footer);
    }
  }

  if (!customElements.get("github-activity")) customElements.define("github-activity", GitHubActivity);
})();
