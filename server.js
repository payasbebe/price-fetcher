import express from "express";
import fetch from "node-fetch";
import fetchCookie from "fetch-cookie";
import { CookieJar } from "tough-cookie";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

// Çerez yöneten fetch
const jar = new CookieJar();
const fetchWithCookies = fetchCookie(fetch, jar);

// 🔁 Ping kontrolü için kök rota
app.get("/", (req, res) => {
  res.status(200).send("🟢 Sunucu çalışıyor");
});

// 💰 Fiyat verisi çekmek için ana endpoint
app.post("/get-price", async (req, res) => {
  const { productUrl } = req.body;

  if (!productUrl) {
    return res.status(400).json({ error: "productUrl gerekli" });
  }

  try {
    // Giriş yap
    const loginRes = await fetchWithCookies("https://www.payasbebe.com/Uye/giris", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://www.payasbebe.com/Uye/giris"
      },
      body: `email=${encodeURIComponent(process.env.LOGIN_EMAIL)}&sifre=${encodeURIComponent(process.env.LOGIN_PASSWORD)}`,
    });

    if (!loginRes.ok) {
      return res.status(401).json({ error: "Giriş başarısız" });
    }

    // Ürün sayfasını al
    const productRes = await fetchWithCookies(productUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://www.payasbebe.com/"
      }
    });

    const productHtml = await productRes.text();

    // Fiyatı ayrıştır
    const match = productHtml.match(/<h2 class="pro-detail-price">\s*([\d.,]+)\s*₺\s*<span class="price-alternate">([\d.,]+)\s*\$/);

    if (!match) {
      return res.status(404).json({ error: "Fiyat bulunamadı" });
    }

    const priceTL = match[1].trim();
    const priceUSD = match[2].trim();

    return res.json({ priceTL, priceUSD });

  } catch (err) {
    console.error("🔥 Sunucu hatası:", err);
    res.status(500).json({ error: "Sunucu hatası", detail: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Sunucu çalışıyor: http://0.0.0.0:${PORT}`);
});
