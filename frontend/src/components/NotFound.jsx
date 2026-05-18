import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-3xl items-center justify-center px-4 py-10 md:px-6">
        <div className="w-full rounded-4xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
          <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-slate-500">
            404 not found
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            This page does not exist
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500 md:text-base">
            The link may be broken, outdated, or the page may have been removed.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Go to homepage
            </Link>

            <Link
              to="/shop"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Browse products
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
