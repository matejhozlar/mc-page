export function runInProduction(fn) {
  if (process.env.NODE_ENV === "production") {
    fn();
  }
}
