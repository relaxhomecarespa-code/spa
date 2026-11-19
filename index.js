const express = require("express");
const app = express();
app.use(express.json());

const { TOKEN, PHONE_ID, VERIFY_TOKEN } = process.env;

const QUIET_MS = 48 * 60 * 60 * 1000; // same customer: 48 hours quiet
const MAX_AGE_S = 5 * 60;             // ignore messages older than 5 minutes
const SEEN_TTL_MS = 60 * 60 * 1000;   // remember message ids for 1 hour

const lastReply = new Map(); // phone -> time of last menu
const seenIds = new Map();   // message id -> time first seen

// cleanup so memory doesn't grow forever
setInterval(() => {
  const now = Date.now();
  for (const [k, t] of seenIds) if (now - t > SEEN_TTL_MS) seenIds.delete(k);
  for (const [k, t] of lastReply) if (now - t > QUIET_MS) lastReply.delete(k);
}, 10 * 60 * 1000);

const send = (to, interactive) =>
  fetch(`https://graph.facebook.com/v23.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "interactive", interactive }),
  })
    .then(async (r) => console.log("SEND RESULT", r.status, await r.text()))
    .catch((e) => console.error("SEND ERROR", e));

const genderMsg = {
  type: "list",
  header: { type: "text", text: "Relax Home Care Spa" },
  body: { text: "⛔🔞 We do not provide any sexual service.\nلا نقدم أي خدمات جنسية.\n\nPlease choose.\nالرجاء الاختيار." },
  footer: { text: "3 PM - 12 AM | 3 م - 12 ص" },
  action: { button: "Choose | اختر", sections: [{ title: "Choose | اختر", rows: [
    { id: "g_male", title: "👨 Male | ذكر", description: "With Male Therapist | مع معالج" },
    { id: "g_female", title: "👩 Female | أنثى", description: "With Female Therapist | مع معالجة" },
    { id: "g_couple", title: "👫 Couples | أزواج" } ] }] },
};

const serviceMsg = {
  type: "list",
  header: { type: "text", text: "Our Services | خدماتنا" },
  body: { text: "Please choose a service.\nالرجاء اختيار الخدمة." },
  action: { button: "Services | الخدمات", sections: [{ title: "Services", rows: [
    { id: "s_thai", title: "Thai Massage", description: "تدليك تايلندي" },
    { id: "s_oil", title: "Full Body Oil Massage", description: "Full Body Relaxation Massage with Oil | تدليك استرخاء بالزيت" },
    { id: "s_cup", title: "Dry Cupping Massage", description: "الحجامة الجافة" },
    { id: "s_foot", title: "Foot Massage", description: "تدليك القدمين" },
    { id: "s_preg", title: "Pregnancy Massage", description: "تدليك الحمل" } ] }] },
};

app.get("/webhook", (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) return res.send(req.query["hub.challenge"]);
  res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // always answer WhatsApp immediately

  try {
    const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!msg) return; // status updates (sent/delivered/read) land here

    console.log("INCOMING", msg.id, msg.from, msg.type);

    const now = Date.now();

    // 1) duplicate / retried message -> ignore
    if (seenIds.has(msg.id)) {
      console.log("DUPLICATE IGNORED", msg.id);
      return;
    }
    seenIds.set(msg.id, now);

    // 2) old message (e.g. delivered late after Render restart) -> ignore
    const ageSec = now / 1000 - Number(msg.timestamp);
    if (ageSec > MAX_AGE_S) {
      console.log("OLD MESSAGE IGNORED", msg.id, Math.round(ageSec), "sec old");
      return;
    }

    const from = msg.from;
    const id = msg.interactive?.list_reply?.id || msg.interactive?.button_reply?.id;

    // normal text -> gender menu (once per 48h)
    if (!id) {
      const last = lastReply.get(from);
      if (last && now - last < QUIET_MS) return;
      lastReply.set(from, now);
      return send(from, genderMsg);
    }

    if (id.startsWith("g_")) return send(from, serviceMsg);

    console.log("SERVICE CHOSEN", from, id);
  } catch (e) {
    console.error("WEBHOOK ERROR", e);
  }
});

app.listen(process.env.PORT || 3000);
