/* POST/GET /api/logout — сброс cookie-сессии. */
const { cookie } = require("../lib/auth");

module.exports = (req, res) => {
  res.setHeader("Set-Cookie", [cookie("gv", "", 0), cookie("ga", "", 0)]);
  res.status(200).json({ ok: true });
};
