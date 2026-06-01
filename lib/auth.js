/* Аутентификация: хэширование паролей (scrypt), подпись токена сессии (HMAC),
   работа с cookie. Без внешних зависимостей — только встроенный crypto Node. */
const crypto = require("crypto");

const SECRET = process.env.AUTH_SECRET || "dev-insecure-secret-change-me";
const DAY = 86400;

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(pw), salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(pw, rec) {
  if (!rec || !rec.salt || !rec.hash) return false;
  const h = crypto.scryptSync(String(pw), rec.salt, 64).toString("hex");
  const a = Buffer.from(h, "hex");
  const b = Buffer.from(rec.hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s) {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString();
}

function sign(payload) {
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(crypto.createHmac("sha256", SECRET).update(body).digest());
  return body + "." + sig;
}

function verify(token) {
  if (!token || token.indexOf(".") < 0) return null;
  const [body, sig] = token.split(".");
  const expect = b64url(crypto.createHmac("sha256", SECRET).update(body).digest());
  if (sig.length !== expect.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try {
    const p = JSON.parse(b64urlDecode(body));
    if (p.exp && Date.now() > p.exp) return null;
    return p;
  } catch (_) { return null; }
}

function parseCookies(req) {
  const h = (req.headers && req.headers.cookie) || "";
  const out = {};
  h.split(";").forEach((part) => {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function cookie(name, val, maxAgeSec) {
  const parts = [`${name}=${val}`, "Path=/", "HttpOnly", "SameSite=Lax", "Secure"];
  if (maxAgeSec != null) parts.push(`Max-Age=${maxAgeSec}`);
  return parts.join("; ");
}

// Сессия из cookie. Админ автоматически считается и зрителем.
function sessionFrom(req) {
  const c = parseCookies(req);
  const gv = verify(c.gv);
  const ga = verify(c.ga);
  const admin = !!(ga && ga.role === "admin");
  const viewer = admin || !!(gv && gv.role === "viewer");
  return { viewer, admin };
}

module.exports = {
  DAY, hashPassword, verifyPassword, sign, verify,
  parseCookies, cookie, sessionFrom,
};
