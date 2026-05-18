import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";

const RouteErrorPage = () => {
  const error = useRouteError();

  let title = "Something went wrong";
  let description =
    "The page could not be loaded. Please try again or return to the marketplace.";
  let statusLabel = "Application error";

  if (isRouteErrorResponse(error)) {
    statusLabel = `${error.status} ${error.statusText}`;

    if (error.status === 404) {
      title = "Page not found";
      description =
        "The page you are looking for does not exist or may have been moved.";
    } else if (error.status === 403) {
      title = "Access denied";
      description =
        "You do not have permission to access this page with the current account.";
    } else if (error.status === 401) {
      title = "Authentication required";
      description = "Please sign in and try again.";
    } else {
      title = "Request failed";
      description =
        typeof error.data === "string" && error.data.trim()
          ? error.data
          : "The requested page could not be loaded.";
    }
  } else if (error instanceof Error) {
    description = error.message || description;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-10 md:px-6">
        <div className="w-full rounded-4xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
          <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-slate-500">
            {statusLabel}
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            {title}
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500 md:text-base">
            {description}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Go back
            </button>

            <Link
              to="/"
              className="inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Return home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteErrorPage;
