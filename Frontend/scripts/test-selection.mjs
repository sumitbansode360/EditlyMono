import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Mock authenticated session so ProtectedRoute renders the page
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

const editor = page.locator(".tiptap");
await editor.waitFor({ timeout: 15000 });
await editor.click();
await page.keyboard.type("Hello world selection test");

const selectionBefore = await page.evaluate(() => {
  const sel = window.getSelection();
  return { text: sel?.toString() ?? "", rangeCount: sel?.rangeCount ?? 0 };
});

await editor.dblclick({ position: { x: 40, y: 10 } });
await page.waitForTimeout(300);

const afterDblClick = await page.evaluate(() => {
  const sel = window.getSelection();
  const editorEl = document.querySelector(".tiptap");
  const styles = editorEl ? getComputedStyle(editorEl) : null;
  const selectionRule = [...document.styleSheets]
    .flatMap((sheet) => {
      try {
        return [...sheet.cssRules];
      } catch {
        return [];
      }
    })
    .find((rule) => rule.selectorText?.includes("::selection"));
  return {
    text: sel?.toString() ?? "",
    rangeCount: sel?.rangeCount ?? 0,
    userSelect: styles?.userSelect,
    contentEditable: editorEl?.getAttribute("contenteditable"),
    selectionRule: selectionRule?.cssText ?? null,
    editorClasses: editorEl?.className ?? null,
    isFocused: document.activeElement === editorEl,
  };
});

await editor.click();
await page.keyboard.press("Control+a");
await page.waitForTimeout(300);

const afterCtrlA = await page.evaluate(() => {
  const sel = window.getSelection();
  return {
    text: sel?.toString() ?? "",
    rangeCount: sel?.rangeCount ?? 0,
    editorText: document.querySelector(".tiptap")?.textContent ?? "",
  };
});

console.log(JSON.stringify({ selectionBefore, afterDblClick, afterCtrlA }, null, 2));

await browser.close();
