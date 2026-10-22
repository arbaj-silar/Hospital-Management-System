
function Topbar({ activePage, username }) {
  return (
    <header className="topbar">
      <div>
        <p className="breadcrumb">Hospital / {activePage}</p>
        <h1>{activePage}</h1>
      </div>

      <div className="topbar-user">
        <div className="notification-icon" title="Notifications">
          ♧
        </div>

        <div className="avatar">
          {(username || "U").charAt(0).toUpperCase()}
        </div>

        <div className="user-info">
          <strong>{username || "Hospital User"}</strong>
          <span>Authenticated user</span>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
