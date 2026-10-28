const express = require("express"); 
const app = express();
app.use(express.json());
const { TOKEN, PHONE_ID, VERIFY_TOKEN } = process.env;
const seen = new Set();

const send = (to, interactive) =>
  fetch(`https://graph.facebook.com/v23.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "interactive", interactive }),
  }).then(async (r) => console.log("SEND RESULT", r.status, await r.text()));

const genderMsg = {
  type: "list",
  header: { type: "text", text: "Relax Home Care Spa" },
  body: { text: "⛔🔞 We do not provide any sexual service.\nلا نقدم أي خدمات جنسية.\n\nPlease choose.\nالرجاء الاختيار." },
  footer: { text: "3 PM - 12 AM | 3 م - 12 ص" },
  action: { button: "Choose | اختر", sections: [{ title: "Choose | اختر", rows: [
    { id: "g_male", title: "Male | ذكر" },
    { id: "g_female", title: "Female | أنثى" },
    { id: "g_couple", title: "Couples | أزواج" } ] }] },
};

const serviceMsg = {
  type: "list",
  header: { type: "text", text: "Our Services | خدماتنا" },
  body: { text: "Please choose a service.\nالرجاء اختيار الخدمة." },
  action: { button: "Services | الخدمات", sections: [{ title: "Services", rows: [
    { id: "s_thai", title: "Thai Massage", description: "تدليك تايلندي" },
    { id: "s_oil", title: "Full Body Oil Massage", description: "Full Body Relaxation Massage with Oil | تد
