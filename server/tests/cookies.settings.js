export function unsignedAsSigned(names = []) {
  return (req, _res, next) => {
    req.signedCookies ||= Object.create(null);

    for (const name of names) {
      if (req.signedCookies[name]) continue;
      const v = req.cookies?.[name];
      if (!v) continue;

      req.signedCookies[name] = v.startsWith("s:")
        ? v.slice(2).split(".")[0]
        : v;
    }
    next();
  };
}
