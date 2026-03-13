import { Outlet, useLocation } from "react-router-dom";

import Footer from "./Footer";
import Header from "./Header";

export default function SiteLayout() {
  const { pathname } = useLocation();

  return (
    <div className="site-shell">
      <Header />
      <main className="site-main">
        <Outlet />
      </main>
      <Footer schedule={pathname === "/contacts" ? "10:00 - 18:00 Пн-Сб" : undefined} />
    </div>
  );
}
