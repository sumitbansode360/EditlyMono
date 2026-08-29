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

const dblClickViaCoords = await page.evaluate(() => {
  const editorEl = document.querySelector('[contenteditable="true"].tiptap');
  const p = editorEl?.querySelector("p");
  if (!p) return { error: "no paragraph" };

  const text = p.textContent ?? "";
  const idx = text.indexOf("world");
  if (idx < 0) return { error: "no world", text };

  const range = document.createRange();
  const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  let offset = idx;
  while (node) {
    const len = node.textContent?.length ?? 0;
    if (offset <= len) break;
    offset -= len;
    node = walker.nextNode();
  }
  if (!node) return { error: "no text node" };

  range.setStart(node, offset + 2);
  range.collapse(true);
  const rect = range.getBoundingClientRect();

  return {
    text,
    idx,
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    nodeText: node.textContent,
  };
});

if (dblClickViaCoords.rect) {
  await page.mouse.dblclick(
    dblClickViaCoords.rect.x + dblClickViaCoords.rect.width / 2,
    dblClickViaCoords.rect.y + dblClickViaCoords.rect.height / 2
  );
}

await page.waitForTimeout(100);

const immediate = await page.evaluate(() => {
  const sel = window.getSelection();
  const anchor = sel?.anchorNode?.textContent ?? null;
  const focus = sel?.focusNode?.textContent ?? null;
  return {
    text: sel?.toString() ?? "",
    anchorOffset: sel?.anchorOffset,
    focusOffset: sel?.focusOffset,
    anchor,
    focus,
    activeElement: document.activeElement?.className ?? null,
  };
});

await page.waitForTimeout(500);

const afterDelay = await page.evaluate(() => {
  const sel = window.getSelection();
  return { text: sel?.toString() ?? "" };
});

console.log(JSON.stringify({ dblClickViaCoords, immediate, afterDelay }, null, 2));

await browser.close();
