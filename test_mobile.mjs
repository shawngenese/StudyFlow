import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.goto("http://127.0.0.1:4173", {waitUntil: "domcontentloaded"});
await page.waitForTimeout(1500);
await page.screenshot({path: "C:/Users/shawn/react-app/dash_mobile.png", fullPage:true});
console.log("dash done");
const navToggle = page.getByLabel("Open menu");
console.log("navToggle visible", await navToggle.isVisible());
await navToggle.click(); await page.waitForTimeout(800);
await page.screenshot({path: "C:/Users/shawn/react-app/sidebar_open.png", fullPage:true});
console.log("sidebar open done");
const todayBtn = page.locator(".sidebar-item").filter({hasText:"Today"}).first();
console.log("todayBtn count", await todayBtn.count());
if(await todayBtn.count()>0){
  await todayBtn.click({force:true}); await page.waitForTimeout(800);
  console.log("clicked today");
  console.log("sidebar is-open count", await page.locator("#app-sidebar.is-open").count());
  console.log("heading", await page.locator("h1").first().textContent());
}
await page.screenshot({path: "C:/Users/shawn/react-app/after_today.png", fullPage:true});
await browser.close();
