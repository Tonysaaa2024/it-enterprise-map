/* Хранилище (Upstash Redis / Vercel KV). Хранит:
   - "content": { zones, floorOrder, classes, header }
   - "auth":    { viewer:{salt,hash}, admin:{salt,hash} }
   При первом обращении заполняется значениями по умолчанию (seed + дефолтные пароли). */
const { Redis } = require("@upstash/redis");
const seed = require("./seed");
const { hashPassword } = require("./auth");

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const CONTENT_KEY = "content";
const AUTH_KEY = "auth";

const DEFAULT_VIEWER = process.env.DEFAULT_VIEWER_PASSWORD || "globus";
const DEFAULT_ADMIN = process.env.DEFAULT_ADMIN_PASSWORD || "globus-admin";

function defaultContent() {
  return {
    zones: seed.ZONES,
    floorOrder: seed.FLOOR_ORDER,
    classes: seed.CLASSES,
    header: seed.HEADER,
  };
}

async function getContent() {
  let c = await redis.get(CONTENT_KEY);
  if (!c) { c = defaultContent(); await redis.set(CONTENT_KEY, c); }
  return c;
}
async function setContent(c) { await redis.set(CONTENT_KEY, c); }

async function getAuth() {
  let a = await redis.get(AUTH_KEY);
  if (!a || !a.viewer || !a.admin) {
    a = { viewer: hashPassword(DEFAULT_VIEWER), admin: hashPassword(DEFAULT_ADMIN) };
    await redis.set(AUTH_KEY, a);
  }
  return a;
}
async function setAuth(a) { await redis.set(AUTH_KEY, a); }

module.exports = { getContent, setContent, getAuth, setAuth, defaultContent };
