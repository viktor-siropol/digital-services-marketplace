import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

const FooterLinkGroup = ({ title, links }) => {
  if (!links.length) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>

      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="text-sm text-slate-500 transition hover:text-slate-900"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

const Footer = () => {
  const { userInfo } = useSelector((state) => state.auth);

  const isSellerWorkspace = userInfo?.isSeller || userInfo?.isAdmin;
  const isAdminWorkspace = userInfo?.isAdmin;

  const marketplaceLinks = [
    { label: "Browse products", to: "/" },
    { label: "Favorites", to: "/favorites" },
  ];

  const accountLinks = userInfo
    ? [
        { label: "Profile", to: "/profile" },
        { label: "My orders", to: "/my-orders" },
      ]
    : [
        { label: "Log in", to: "/login" },
        { label: "Create account", to: "/register" },
      ];

  const sellerLinks = isSellerWorkspace
    ? [
        { label: "Sales orders", to: "/seller/orders" },
        { label: "My products", to: "/seller/products" },
        { label: "Create product", to: "/seller/products/new" },
      ]
    : [];

  const adminLinks = isAdminWorkspace
    ? [
        { label: "Users", to: "/admin/userlist" },
        { label: "Categories", to: "/admin/category" },
      ]
    : [];

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-5">
          <div className="md:col-span-2 xl:col-span-2">
            <Link
              to="/"
              className="text-lg font-semibold tracking-tight text-slate-900"
            >
              BitMarket
            </Link>

            <p className="mt-4 max-w-md text-sm leading-7 text-slate-500">
              A clean marketplace experience for discovering products, managing
              orders, and running a lightweight seller workspace.
            </p>
          </div>

          <FooterLinkGroup title="Marketplace" links={marketplaceLinks} />
          <FooterLinkGroup title="Account" links={accountLinks} />
          <FooterLinkGroup
            title="Seller & Admin"
            links={[...sellerLinks, ...adminLinks]}
          />
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© 2026 BitMarket. Built as a portfolio-grade marketplace app.</p>
          <p>Responsive UI · Favorites · Orders · PayPal · Seller tools</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
