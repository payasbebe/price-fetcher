import cheerio from "cheerio";

// ... yukarıdaki kodlar aynı

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

    // TL fiyatı: <h2 class="pro-detail-price"> içindeki ilk ₺
    const priceText = $(".pro-detail-price").first().text();
    const matchTL = priceText.match(/([\d.,]+)\s*₺/);

    // USD fiyatı: .price-alternate sınıfı
    const usdText = $(".price-alternate").first().text();
    const matchUSD = usdText.match(/([\d.,]+)\s*\$/);

    if (!matchTL) {
      return res.status(404).json({ error: "TL fiyat bulunamadı" });
    }

    const priceTL = matchTL[1].replace(",", ".").trim(); // 179.00
    const priceUSD = matchUSD ? matchUSD[1].replace(",", ".").trim() : null;

    return res.json({ priceTL, priceUSD });

  } catch (err) {
    console.error("🔥 Sunucu hatası:", err);
    res.status(500).json({ error: "Sunucu hatası", detail: err.message });
  }
});
