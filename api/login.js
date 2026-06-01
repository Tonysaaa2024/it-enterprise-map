/* POST /api/login { role: "viewer"|"admin", password } — проверка пароля и выдача cookie-сессии. */
const { getAuth } = require("../lib/store");
const { verifyPassword, sign, cookie, DAY } = require("../lib/auth");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const { role, password } = req.body || {};
  const isAdmin = role === "admin";
  let auth;
  try { auth = await getAuth(); }
  catch (e) { return res.status(500).json({ error: "store_error", detail: String(e && e.message || e) }); }

  const rec = isAdmin ? auth.admin : auth.viewer;
  if (!verifyPassword(password || "", rec)) {
    return res.status(401).json({ error: "Неверный пароль" });
  }

  const exp = Date.now() + 30 * DAY * 1000;
  const cookies = [];
  if (isAdmin) {
    cookies.push(cookie("ga", sign({ role: "admin", exp }), 30 * DAY));
    cookies.push(cookie("gv", sign({ role: "viewer", exp }), 30 * DAY)); // админ видит и сайт
  } else {
    cookies.push(cookie("gv", sign({ role: "viewer", exp }), 30 * DAY));
  }
  res.setHeader("Set-Cookie", cookies);
  return res.status(200).json({ ok: true, role: isAdmin ? "admin" : "viewer" });
};
