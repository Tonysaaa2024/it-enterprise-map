/* GET  /api/content — текущий контент (нужна сессия зрителя/админа).
   POST /api/content — сохранить контент (только админ). */
const { getContent, setContent, getVendorLinks } = require("../lib/store");
const { sessionFrom } = require("../lib/auth");

module.exports = async (req, res) => {
  const s = sessionFrom(req);

  if (req.method === "GET") {
    if (!s.viewer) return res.status(401).json({ error: "unauthorized" });
    try {
      const c = await getContent();
      let vendorLinks = {};
      try { vendorLinks = await getVendorLinks(); } catch (_) {}
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json(Object.assign({}, c, { vendorLinks }));
    } catch (e) {
      return res.status(500).json({ error: "store_error", detail: String(e && e.message || e) });
    }
  }

  if (req.method === "POST") {
    if (!s.admin) return res.status(403).json({ error: "forbidden" });
    const body = req.body || {};
    if (!body.classes || !Array.isArray(body.classes) || !body.zones || !body.floorOrder) {
      return res.status(400).json({ error: "Некорректный формат контента" });
    }
    try {
      await setContent({
        zones: body.zones,
        floorOrder: body.floorOrder,
        classes: body.classes,
        header: body.header || {},
      });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: "store_error", detail: String(e && e.message || e) });
    }
  }

  res.status(405).json({ error: "method_not_allowed" });
};
