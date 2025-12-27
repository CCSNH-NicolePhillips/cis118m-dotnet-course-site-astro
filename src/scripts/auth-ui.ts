import { login, logout, getUser } from "../lib/auth";

function qs(sel: string) {
  return document.querySelector(sel);
}

(async () => {
  const btnIn = qs("[data-auth='login']") as HTMLButtonElement | null;
  const btnOut = qs("[data-auth='logout']") as HTMLButtonElement | null;
  const who = qs("[data-auth='who']") as HTMLElement | null;

  const user = await getUser();

  if (btnIn) {
    btnIn.style.display = user ? "none" : "inline-flex";
    btnIn.addEventListener("click", () => login(window.location.pathname + window.location.search));
  }

  if (btnOut) {
    btnOut.style.display = user ? "inline-flex" : "none";
    btnOut.addEventListener("click", () => logout());
  }

  if (who) {
    who.textContent = user?.email ? `Signed in: ${user.email}` : "";
  }
})();
