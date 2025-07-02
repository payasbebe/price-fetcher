import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch"; // Node 18+ kullanıyorsan gerek yok
dotenv.config();

const app = express();
app.use(express.json());

app.post("/get-price", async (req, res) => {
  const { productUrl } = req.body;

  if (!productUrl) {
    return res.status(400).json({ error: "productUrl gerekli" });
  }

  try {
    // Giriş yap
    const loginRes = await fetch("https://www.payasbebe.com/Uye/giris", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `email=${encodeURIComponent(process.env.LOGIN_EMAIL)}&password=${encodeURIComponent(process.env.LOGIN_PASSWORD)}`,
      redirect: "manual"
    });

    const rawCookies = loginRes.headers.raw()["set-cookie"];
    if (!rawCookies || rawCookies.length === 0) {
      return res.status(403).json({ error: "Oturum açma çerezi alınamadı" });
    }

    // Tüm çerezleri birleştir
    const cookie = rawCookies.map(entry => entry.split(";")[0]).join("; ");

    // Ürün sayfasını çerezle çek
    const productHtml = await fetch(productUrl, {
      headers: {
        "Cookie": cookie
      }
    }).then(r => r.text());

    // Fiyatı ayrıştır
    const match = productHtml.match(/<h2 class="pro-detail-price">\s*([\d.,]+)\s*₺\s*<span class="price-alternate">([\d.,]+)\s*\$/);
    if (!match) {
      return res.status(404).json({ error: "Fiyat bulunamadı" });
    }

    const priceTL = match[1].trim();
    const priceUSD = match[2].trim();

    return res.json({ priceTL, priceUSD });
  } catch (err) {
    console.error("❌ Sunucu hatası:", err);
    return res.status(500).json({ error: "Sunucu hatası", detail: err.message });
  }
});

// Render'da PORT mutlaka environment'dan alınmalı
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Sunucu çalışıyor: http://localhost:${PORT}`);
});
