import { chromium } from 'playwright';
const browser = await chromium.launch();
const preview = await new Promise((res,rej)=>{
  const {spawn} = await import('node:child_process');
});
