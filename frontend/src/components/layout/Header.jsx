import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

import { SITE } from "../../constants/site";

const NAV = [
  { to: "/catalog", label: "Каталог" },
  { to: "/about", label: "О нас" },
  { to: "/contacts", label: "Контакты" }
];

export default function Header({ pageLabel }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="header-row">
        <nav className={`header-nav ${menuOpen ? "is-open" : ""}`}>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} onClick={() => setMenuOpen(false)}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <Link className="header-logo" to="/" onClick={() => setMenuOpen(false)}>
          <span className="logo-text">{SITE.logoLetters}</span>
          {pageLabel ? <span className="header-page-label">{pageLabel}</span> : null}
        </Link>

        <a className="header-phone" href={`tel:${SITE.phoneHref}`}>
          {SITE.phone}
        </a>

        <button
          type="button"
          className="header-burger"
          aria-label="Меню"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
      <div className="header-line" />
    </header>
  );
}
