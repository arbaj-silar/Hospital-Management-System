
function StatCard({ title, value, description, icon, color }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${color}`}>{icon}</div>

      <p className="stat-title">{title}</p>
      <h2 className="stat-value">{value}</h2>
      <p className="stat-description">{description}</p>
    </article>
  );
}

export default StatCard;
