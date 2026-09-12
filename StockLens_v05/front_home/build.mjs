import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

const output = new URL("./dist/", import.meta.url);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(new URL("./public/", import.meta.url), output, { recursive: true });

const options = {
  errorCorrectionLevel: "H",
  margin: 2,
  width: 520,
  color: { dark: "#102f5f", light: "#ffffff" }
};

await Promise.all([
  QRCode.toFile(fileURLToPath(new URL("./dist/assets/qr-mobile.png", import.meta.url)), "https://mobile.lens.glaciar.org", options),
  QRCode.toFile(fileURLToPath(new URL("./dist/assets/qr-web.png", import.meta.url)), "https://web.lens.glaciar.org", options)
]);

console.log("StockLens home built with Mobile and Web QR codes.");
