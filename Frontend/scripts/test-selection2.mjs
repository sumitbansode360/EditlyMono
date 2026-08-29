import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.addInitScript(() => {
  localStorage.setItem("refresh_token", "fake-token-for-test");
});

await page.route("**/api/token/refresh/**", (route) =>
  route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ access: "fake-access" }) })
);
await page.route("**/api/auth/me/**", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ id: 1, username: "test", email: "test@example.com" }),
  })
);

await page.goto("http://localhost:3000/documents/1", { waitUntil: "networkidle", timeout: 60000 });

const editor = page.locator('[contenteditable="true"].tiptap');
await editor.waitFor({ timeout: 15000 });
await editor.click();
await page.keyboard.type("Hello world selection test");

const selectionStyles = await page.evaluate(() => {
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  return {
    accent,
    hslAccentBackground: (() => {
      const el = document.createElement("div");
      el.style.background = `hsl(${accent})`;
      return el.style.background;
    })(),
    accentBackground: (() => {
      const el = document.createElement("div");
      el.style.background = accent;
      return el.style.background;
    })(),
  };
});

await editor.getByText("world").dblclick();
await page.waitForTimeout(300);

const afterWordDblClick = await page.evaluate(() => {
  const sel = window.getSelection();
  return { text: sel?.toString() ?? "", rangeCount: sel?.rangeCount ?? 0 };
});

const box = await editor.boundingBox();
if (box) {
  await page.mouse.move(box.x + 20, box.y + 15);
  await page.mouse.down();
  await page.mouse.move(box.x + 250, box.y + 15);
  await page.mouse.up();
}
await page.waitForTimeout(200);

const afterDrag = await page.evaluate(() => {
  const sel = window.getSelection();
  return { text: sel?.toString() ?? "", rangeCount: sel?.rangeCount ?? 0 };
});

await editor.click();
await page.keyboard.press("Control+a");
await page.waitForTimeout(200);

const afterCtrlA = await page.evaluate(() => {
  const sel = window.getSelection();
  return { text: sel?.toString() ?? "", rangeCount: sel?.rangeCount ?? 0 };
});

console.log(JSON.stringify({ selectionStyles, afterWordDblClick, afterDrag, afterCtrlA }, null, 2));

await browser.close();
