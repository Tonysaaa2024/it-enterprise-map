/* GET /api/session — статус текущей сессии { viewer, admin }. */
const { sessionFrom } = require("../lib/auth");

module.exports = (req, res) => {
  const s = sessionFrom(req);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ viewer: !!s.viewer, admin: !!s.admin });
};
