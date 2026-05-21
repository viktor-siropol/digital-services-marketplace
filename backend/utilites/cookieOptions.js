const isProduction = () => process.env.NODE_ENV === "production";

const getCookieSecure = () => {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;

  return isProduction();
};

const getCookieSameSite = () => {
  if (process.env.COOKIE_SAME_SITE) {
    return process.env.COOKIE_SAME_SITE;
  }

  return isProduction() ? "none" : "lax";
};

export const getAuthCookieOptions = () => ({
  httpOnly: true,
  secure: getCookieSecure(),
  sameSite: getCookieSameSite(),
  path: "/",
  maxAge: 30 * 24 * 60 * 60 * 1000,
});

export const getClearAuthCookieOptions = () => ({
  httpOnly: true,
  secure: getCookieSecure(),
  sameSite: getCookieSameSite(),
  path: "/",
  expires: new Date(0),
});
