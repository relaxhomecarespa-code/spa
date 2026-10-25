const express = require("express");
const app = express();
app.use(express.json());
const { TOKEN, PHONE_ID, VERIFY_TOKEN } = process.env;

const send = (to, interactive) =>
  fetch(`https://graph.facebook.com/v23.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "interactive", interactive }),
  }).then(async (r) => console.log("SEND RESULT", r.status, await r.text()));

const genderMsg = {
  type: "list",
  header: { type: "text", text: "Relax Home Care Spa" },
  body: { text: "⛔🔞 We do not provide any sexual service.\nلا نقدم أي خدمات جنسية.\n\nPlease choose your gender.\nالرجاء اختيار الجنس." },
  footer: { text: "3 PM - 12 AM | 3 م - 12 ص" },
  action: { button: "Choose | اختر", sections: [{ title: "Gender | الجنس", rows: [
    { id: "g_male", title: "Male | ذكر" },
    { id: "g_female", title: "Female | أنثى" } ] }] },
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
  res.sendStatus(200);
  console.log("INCOMING", JSON.stringify(req.body));
  const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg) return;
  const from = msg.from;
  const id = msg.interactive?.list_reply?.id || msg.interactive?.button_reply?.id;
  if (!id) return send(from, genderMsg);
  if (id.startsWith("g_")) return send(from, serviceMsg);
  console.log("SERVICE CHOSEN", from, id);
});

app.listen(process.env.PORT || 3000);
