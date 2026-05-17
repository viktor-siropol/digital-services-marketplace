const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

const Loader = ({ size = "lg", fullScreen = false, label = "Loading" }) => {
  const resolvedSizeClass = sizeClasses[size] || sizeClasses.lg;

  const spinner = (
    <div
      className={`relative ${resolvedSizeClass}`}
      role="status"
      aria-label={label}
    >
      <div className="absolute inset-0 rounded-full border border-slate-200" />
      <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-slate-900 border-r-slate-400" />
      <span className="sr-only">{label}</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-6">
        {spinner}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center justify-center">{spinner}</div>
  );
};

export default Loader;
