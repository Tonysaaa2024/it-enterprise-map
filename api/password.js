/* POST /api/password { target: "viewer"|"admin", password } — смена пароля (только админ). */
const { getAuth, setAuth } = require("../lib/store");
const { sessionFrom, hashPassword } = require("../lib/auth");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const s = sessionFrom(req);
  if (!s.admin) return res.status(403).json({ error: "forbidden" });

  const { target, password } = req.body || {};
  if (target !== "viewer" && target !== "admin") return res.status(400).json({ error: "Неизвестный тип пароля" });
  if (!password || String(password).length < 4) return res.status(400).json({ error: "Пароль слишком короткий (мин. 4 символа)" });

  try {
    const auth = await getAuth();
    auth[target] = hashPassword(String(password));
    await setAuth(auth);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: "store_error", detail: String(e && e.message || e) });
  }
};
