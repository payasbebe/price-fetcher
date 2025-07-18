const express = require("express");
const fetch = require("node-fetch");
const fetchCookie = require("fetch-cookie");
const { CookieJar } = require("tough-cookie");
const cheerio = require("cheerio");
require("dotenv").config();

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
    const $ = cheerio.load(productHtml);

    // TL fiyatı: .pro-detail-price içindeki ilk ₺ ifadesi
    const priceText = $(".pro-detail-price").first().text();
    const matchTL = priceText.match(/([\d.,]+)\s*₺/);

    // USD fiyatı: .price-alternate içindeki ilk $ ifadesi
    const usdText = $(".price-alternate").first().text();
    const matchUSD = usdText.match(/([\d.,]+)\s*\$/);

    if (!matchTL) {
      return res.status(404).json({ error: "TL fiyat bulunamadı" });
    }

    const priceTL = matchTL[1].replace(",", ".").trim(); // Örn: "179.00"
    const priceUSD = matchUSD ? matchUSD[1].replace(",", ".").trim() : null;

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
