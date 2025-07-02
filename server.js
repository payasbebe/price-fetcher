import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
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

    const cookie = loginRes.headers.get("set-cookie");
    if (!cookie) {
      return res.status(403).json({ error: "Oturum açma çerezi alınamadı" });
    }

    // Ürün sayfasını çek
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
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası", detail: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});
