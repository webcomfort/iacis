import { readFile, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { parse, parseFragment, serialize } from 'parse5';

const root = new URL('../', import.meta.url);
const fonts = new URL('node_modules/@fontsource-variable/golos-text/', root);
const output = new URL('figma/', root);
const mime = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

async function embed(file) {
  const bytes = await readFile(file);
  return 'data:' + mime[extname(file.pathname)] + ';base64,' + bytes.toString('base64');
}

const fontSource = await readFile(new URL('index.css', fonts), 'utf8');
let fontCss = fontSource.replaceAll('Golos Text Variable', 'Golos Text');
for (const [, path] of fontSource.matchAll(/url\((\.\/files\/[^)]+)\)/g)) {
  fontCss = fontCss.replace(path, await embed(new URL(path, fonts)));
}

const page = parse(await readFile(new URL('index.html', root), 'utf8'));
const css = await readFile(new URL('styles.css', root), 'utf8');
const captureCss = await readFile(new URL('capture.css', output), 'utf8');
const imageSources = new Map();
const clockTime = new Date('2026-07-01T09:00:00Z');

async function prepare(parent) {
  if (!parent.childNodes) return;
  const children = [];
  for (const node of parent.childNodes) {
    const attr = (name) => node.attrs?.find((item) => item.name === name);
    const inactiveSlide = attr('data-slide') && !attr('data-active');
    if (['script', 'link'].includes(node.nodeName) || attr('hidden') || inactiveSlide) continue;

    if (node.nodeName === 'img') {
      const source = attr('src');
      if (!imageSources.has(source.value)) {
        imageSources.set(source.value, await embed(new URL(source.value, root)));
      }
      source.value = imageSources.get(source.value);
    }

    if (node.nodeName === 'time') {
      const time = new Intl.DateTimeFormat('ru-RU', {
        timeZone: attr('data-zone').value,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(clockTime);
      node.attrs.push({ name: 'datetime', value: time });
      node.childNodes = [{ nodeName: '#text', value: time, parentNode: node }];
    } else {
      await prepare(node);
    }

    if (node.nodeName === 'head') {
      const [style] = parseFragment('<style>\n' + fontCss + '\n' + css + '\n' + captureCss + '</style>').childNodes;
      style.parentNode = node;
      node.childNodes.push(style);
    }
    children.push(node);
  }
  parent.childNodes = children;
}

await prepare(page);
await writeFile(new URL('index.html', output), serialize(page).replace(/^[ \t]+$/gm, '') + '\n');
