import { Link } from "react-router-dom";

import { SITE } from "../../constants/site";

function IconPin() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"
      />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2zm1 11h4v-2h-3V7h-2v6z"
      />
    </svg>
  );
}

export default function Footer({ schedule }) {
  const hours = schedule || SITE.schedule;
  return (
    <footer className="site-footer">
      <div className="footer-line" />
      <div className="footer-inner">
        <div className="footer-col">
          <a className="footer-phone" href={`tel:${SITE.phoneHref}`}>
            {SITE.phone}
          </a>
          <p className="footer-meta">
            <IconPin /> {SITE.address}
          </p>
          <p className="footer-meta">
            <IconClock /> {hours}
          </p>
        </div>

        <nav className="footer-nav">
          <Link to="/">Главная страница</Link>
          <Link to="/catalog">Каталог</Link>
          <Link to="/about">О нас</Link>
          <Link to="/contacts">Контакты</Link>
        </nav>

        <div className="footer-col footer-col-brand">
          <span className="logo-text">{SITE.logoLetters}</span>
          <div className="footer-socials">
            <a href={SITE.telegram} target="_blank" rel="noreferrer" aria-label="Telegram">
              <span>TG</span>
            </a>
            <a href={SITE.whatsapp} target="_blank" rel="noreferrer" aria-label="WhatsApp">
              <span>WA</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
