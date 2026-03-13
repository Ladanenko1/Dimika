import { SITE } from "../constants/site";

function IconPin() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"
      />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2zm1 11h4v-2h-3V7h-2v6z"
      />
    </svg>
  );
}

export default function ContactsPage() {
  return (
    <div className="content-page contacts-page">
      <h1 className="page-title-left">Контакты</h1>
      <p className="page-lead">
        Dimika предоставляет лучшие мировые бренды, грамотную консультацию, а также помощь на
        всех этапах сделки.
      </p>

      <section className="info-panel store-panel">
        <h2>Физический магазин</h2>
        <p className="store-line">
          <IconPin /> {SITE.address}
        </p>
        <p className="store-line">
          <IconClock /> {SITE.scheduleContacts}
        </p>
      </section>

      <section className="map-section">
        <iframe title="Яндекс Карты" src={SITE.mapWidget} loading="lazy" />
      </section>
    </div>
  );
}
