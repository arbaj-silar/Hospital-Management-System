
function Sidebar({ activePage, setActivePage, onLogout }) {
  const menuItems = [
  { name: "Dashboard", icon: "▦" },
  { name: "Doctors", icon: "⚕" },
  { name: "Patients", icon: "♙" },
  { name: "Appointments", icon: "▣" },
  { name: "Notifications", icon: "♧" },
];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">✚</div>
        <div>
          <h2>CarePoint</h2>
          <span>Hospital Management</span>
        </div>
      </div>

      <p className="menu-label">MAIN MENU</p>

      <nav className="sidebar-menu">
        {menuItems.map((item) => (
          <button
            key={item.name}
            className={`menu-item ${
              activePage === item.name ? "active" : ""
            }`}
            onClick={() => setActivePage(item.name)}
          >
            <span className="menu-icon">{item.icon}</span>
            {item.name}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="help-card">
          <strong>Need assistance?</strong>
          <p>Contact your hospital administrator for help.</p>
        </div>

        <button className="logout-button" onClick={onLogout}>
          ↪ <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
