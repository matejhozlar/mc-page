import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.classList.add("scroll-override");
    body.classList.add("scroll-override");

    window.scrollTo({ top: 0 });

    requestAnimationFrame(() => {
      html.classList.remove("scroll-override");
      body.classList.remove("scroll-override");
    });
  }, [pathname]);

  return null;
}
