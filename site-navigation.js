const primaryLinks = [
  { id: "about", href: "/#about", label: "About" },
  { id: "conway", href: "/conway", label: "Conway" },
  { id: "extraordinary", href: "/extraordinary", label: "Extraordinary" },
  { id: "airchat", href: "/airchat", label: "Airchat" },
  { id: "projects", href: "/projects", label: "Projects" },
  { id: "essays", href: "/essays", label: "Essays" },
  { id: "favorites", href: "/favorites", label: "Favorites" },
  { id: "videos", href: "/videos", label: "Videos" },
  { id: "angel", href: "/angel", label: "Angel Investing" },
];

const socialLinks = [
  { href: "https://x.com/0xSigil", label: "X/Twitter" },
  { href: "https://www.youtube.com/c/SigilWen", label: "YouTube" },
  { href: "https://github.com/Sigil-Wen", label: "GitHub" },
];

class SiteNavigation extends HTMLElement {
  connectedCallback() {
    const current = this.getAttribute("current") || "";
    const primary = primaryLinks.map(({ id, href, label }) => {
      const active = id === current ? ' aria-current="page"' : "";
      return `<a href="${href}"${active}>${label}</a>`;
    }).join("");
    const social = socialLinks.map(({ href, label }) =>
      `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`
    ).join("");

    this.innerHTML = `
      <aside class="sidebar">
        <p class="sidebar-brand"><a href="/">sigilwen.ca</a></p>
        <nav aria-label="Primary navigation">${primary}</nav>
        <p class="sidebar-heading">Find me on</p>
        <nav aria-label="Social links">${social}</nav>
      </aside>
    `;
  }
}

customElements.define("site-navigation", SiteNavigation);
