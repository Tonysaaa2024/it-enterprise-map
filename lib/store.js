/* Хранилище (Upstash Redis / Vercel KV). Хранит:
   - "content": { zones, floorOrder, classes, header }
   - "auth":    { viewer:{salt,hash}, admin:{salt,hash} }
   При первом обращении контент заполняется сидом, а пароли — из env (DEFAULT_*_PASSWORD). */
const { Redis } = require("@upstash/redis");
const seed = require("./seed");
const { hashPassword } = require("./auth");

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const CONTENT_KEY = "content";
const AUTH_KEY = "auth";

// Публичные дефолтные пароли удалены (репозиторий открытый). Первичная инициализация
// паролей берётся только из env. Если переменные не заданы — сид падает с ошибкой,
// а не создаёт известный всем пароль.
const DEFAULT_VIEWER = process.env.DEFAULT_VIEWER_PASSWORD;
const DEFAULT_ADMIN = process.env.DEFAULT_ADMIN_PASSWORD;

function defaultContent() {
  return {
    zones: seed.ZONES,
    floorOrder: seed.FLOOR_ORDER,
    classes: seed.CLASSES,
    header: seed.HEADER,
  };
}

// Контент считается «новым» (двухэтажным), если у зон есть поле building.
function isNewFormat(c) {
  return !!(c && c.zones && Object.values(c.zones).some((z) => z && z.building != null));
}

async function getContent() {
  let c = await redis.get(CONTENT_KEY);
  // авто-миграция: пустое ИЛИ старый одноэтажный формат → перезаписываем сидом
  if (!isNewFormat(c)) { c = defaultContent(); await redis.set(CONTENT_KEY, c); }
  return c;
}
async function setContent(c) { await redis.set(CONTENT_KEY, c); }

const LINKS_KEY = "vendorlinks";
async function getVendorLinks() {
  let l = await redis.get(LINKS_KEY);
  if (!l || typeof l !== "object") { l = seed.VENDOR_LINKS || {}; await redis.set(LINKS_KEY, l); }
  return l;
}
async function setVendorLinks(l) { await redis.set(LINKS_KEY, l); }

async function getAuth() {
  let a = await redis.get(AUTH_KEY);
  if (!a || !a.viewer || !a.admin) {
    if (!DEFAULT_VIEWER || !DEFAULT_ADMIN) {
      throw new Error("Не могу инициализировать пароли: задайте DEFAULT_VIEWER_PASSWORD и DEFAULT_ADMIN_PASSWORD в env (публичные дефолты удалены).");
    }
    a = { viewer: hashPassword(DEFAULT_VIEWER), admin: hashPassword(DEFAULT_ADMIN) };
    await redis.set(AUTH_KEY, a);
  }
  return a;
}
async function setAuth(a) { await redis.set(AUTH_KEY, a); }

module.exports = { getContent, setContent, getVendorLinks, setVendorLinks, getAuth, setAuth, defaultContent };
