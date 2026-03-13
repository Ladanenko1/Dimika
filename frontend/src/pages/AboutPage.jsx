import { LEGAL } from "../constants/site";

export default function AboutPage() {
  return (
    <div className="content-page about-page">
      <h1 className="page-title-left">О нас</h1>
      <p className="page-lead">
        С 2019 года мы работаем с ведущими мировыми брендами, предлагая клиентам только
        лучшее. Оказываем профессиональные консультации, оперативно доставляем заказы и
        сопровождаем на всех этапах сотрудничества.
      </p>
      <section className="info-panel">
        <h2>{LEGAL.title}</h2>
        {LEGAL.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>
    </div>
  );
}
