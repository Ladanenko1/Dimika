export default function PageDivider({ title }) {
  if (!title) return <div className="page-divider page-divider--empty" />;
  return (
    <div className="page-divider">
      <span className="page-divider-line" />
      <span className="page-divider-title">{title}</span>
      <span className="page-divider-line" />
    </div>
  );
}
