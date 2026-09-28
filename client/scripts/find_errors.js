import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as parser from '@babel/parser';
import traverseModule from '@babel/traverse';

const traverse = traverseModule.default || traverseModule;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

const STANDARD_GLOBALS = new Set([
  'window', 'document', 'navigator', 'localStorage', 'sessionStorage',
  'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'requestAnimationFrame', 'cancelAnimationFrame', 'fetch', 'Headers',
  'Request', 'Response', 'FormData', 'Blob', 'File', 'FileReader',
  'URL', 'URLSearchParams', 'Event', 'CustomEvent', 'MouseEvent',
  'KeyboardEvent', 'HTMLElement', 'Element', 'Node', 'MutationObserver',
  'IntersectionObserver', 'ResizeObserver', 'Intl', 'Math', 'JSON',
  'Date', 'RegExp', 'Error', 'TypeError', 'RangeError', 'ReferenceError',
  'SyntaxError', 'Promise', 'Array', 'Object', 'String', 'Number',
  'Boolean', 'Symbol', 'BigInt', 'Set', 'Map', 'WeakSet', 'WeakMap',
  'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'undefined', 'NaN',
  'Infinity', 'alert', 'confirm', 'prompt', 'history', 'location',
  'BroadcastChannel', 'AbortController'
]);

const HTML_TAGS = new Set([
  'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b',
  'base', 'bdi', 'bdo', 'blockquote', 'body', 'br', 'button', 'canvas',
  'caption', 'cite', 'code', 'col', 'colgroup', 'data', 'datalist',
  'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em',
  'embed', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1',
  'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hr', 'html', 'i',
  'iframe', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li',
  'link', 'main', 'map', 'mark', 'meta', 'meter', 'nav', 'noscript',
  'object', 'ol', 'optgroup', 'option', 'output', 'p', 'param',
  'picture', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp',
  'script', 'section', 'select', 'small', 'source', 'span', 'strong',
  'style', 'sub', 'summary', 'sup', 'svg', 'table', 'tbody', 'td',
  'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title',
  'tr', 'track', 'u', 'ul', 'var', 'video', 'wbr', 'circle', 'path',
  'line', 'rect', 'text', 'polygon', 'polyline', 'g', 'defs', 'clipPath'
]);

const INVALID_DOM_PROPS = new Set([
  'textTransform', 'fontSize', 'fontWeight', 'backgroundColor', 'color',
  'padding', 'margin', 'borderRadius', 'display', 'border', 'width', 'height'
]);

const SVG_TAGS = new Set([
  'svg', 'rect', 'circle', 'path', 'line', 'polygon', 'polyline', 'g', 'defs', 'clipPath', 'text'
]);

function getAllFiles(dir, exts = ['.jsx', '.js']) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, exts));
    } else {
      const ext = path.extname(fullPath);
      if (exts.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

const allFiles = getAllFiles(srcDir);
console.log(`Found ${allFiles.length} files in client/src/`);

let totalErrors = 0;

for (const filePath of allFiles) {
  const relPath = path.relative(srcDir, filePath);
  const code = fs.readFileSync(filePath, 'utf8');

  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: [
        'jsx',
        'importMeta',
        'exportDefaultFrom',
        'exportNamespaceFrom'
      ]
    });
  } catch (err) {
    console.error(`[SYNTAX ERROR] ${relPath}: ${err.message}`);
    totalErrors++;
    continue;
  }

  // 1. Check imports resolve to existing files
  traverse(ast, {
    ImportDeclaration(pathNode) {
      const source = pathNode.node.source.value;
      if (source.startsWith('.')) {
        const fileDir = path.dirname(filePath);
        let resolved = path.resolve(fileDir, source);
        const candidates = [
          resolved,
          resolved + '.js',
          resolved + '.jsx',
          path.join(resolved, 'index.js'),
          path.join(resolved, 'index.jsx')
        ];
        const exists = candidates.some(c => fs.existsSync(c));
        if (!exists) {
          console.error(`[BROKEN IMPORT] ${relPath}:${pathNode.node.loc?.start.line} -> Cannot find module '${source}'`);
          totalErrors++;
        }
      }
    },

    // 2. Check JSX Elements and undefined variables
    JSXOpeningElement(pathNode) {
      const nameNode = pathNode.node.name;
      if (nameNode.type === 'JSXIdentifier') {
        const tagName = nameNode.name;
        if (/^[A-Z]/.test(tagName)) {
          // Custom component identifier
          const binding = pathNode.scope.getBinding(tagName);
          if (!binding && !STANDARD_GLOBALS.has(tagName)) {
            console.error(`[UNDEFINED JSX COMPONENT] ${relPath}:${pathNode.node.loc?.start.line} -> '<${tagName}>' is not defined or imported!`);
            totalErrors++;
          }
        } else if (HTML_TAGS.has(tagName) && !SVG_TAGS.has(tagName)) {
          // Check for invalid style props directly on HTML DOM elements
          for (const attr of pathNode.node.attributes) {
            if (attr.type === 'JSXAttribute' && attr.name && attr.name.type === 'JSXIdentifier') {
              const propName = attr.name.name;
              if (INVALID_DOM_PROPS.has(propName)) {
                console.error(`[INVALID DOM PROP] ${relPath}:${attr.loc?.start.line} -> <${tagName} ${propName}=...> (invalid direct style prop on HTML element)`);
                totalErrors++;
              }
            }
          }
        }
      }
    },

    // Check duplicate imports
    Program(pathNode) {
      const importedNames = new Map();
      pathNode.node.body.forEach(stmt => {
        if (stmt.type === 'ImportDeclaration') {
          stmt.specifiers.forEach(spec => {
            const localName = spec.local.name;
            if (importedNames.has(localName)) {
              console.error(`[DUPLICATE IMPORT] ${relPath}:${spec.loc?.start.line} -> '${localName}' is imported multiple times`);
              totalErrors++;
            } else {
              importedNames.set(localName, spec.loc?.start.line);
            }
          });
        }
      });
    },

    // 3. Check for nesting issues
    JSXElement(pathNode) {
      const opening = pathNode.node.openingElement;
      if (opening.name.type !== 'JSXIdentifier') return;
      const tag = opening.name.name;

      // Check nested buttons
      if (tag === 'button') {
        let parent = pathNode.parentPath;
        while (parent && parent.node.type === 'JSXElement') {
          const parentTag = parent.node.openingElement.name.type === 'JSXIdentifier' ? parent.node.openingElement.name.name : null;
          if (parentTag === 'button') {
            console.error(`[NESTED BUTTON] ${relPath}:${opening.loc?.start.line} -> <button> cannot be nested inside another <button>`);
            totalErrors++;
            break;
          }
          parent = parent.parentPath;
        }
      }

      // Check nested links (a inside a, Link inside Link, a inside Link, Link inside a)
      if (['a', 'Link', 'NavLink'].includes(tag)) {
        let parent = pathNode.parentPath;
        while (parent && parent.node.type === 'JSXElement') {
          const parentTag = parent.node.openingElement.name.type === 'JSXIdentifier' ? parent.node.openingElement.name.name : null;
          if (['a', 'Link', 'NavLink'].includes(parentTag)) {
            console.error(`[NESTED LINK] ${relPath}:${opening.loc?.start.line} -> <${tag}> cannot be nested inside <${parentTag}>`);
            totalErrors++;
            break;
          }
          parent = parent.parentPath;
        }
      }

      // Check tr parent
      if (tag === 'tr') {
        let parent = pathNode.parentPath;
        // Skip JSXFragment or conditional/expression container if any, find nearest JSXElement
        while (parent && parent.node.type !== 'JSXElement' && parent.parentPath) {
          parent = parent.parentPath;
        }
        if (parent && parent.node.type === 'JSXElement') {
          const parentTag = parent.node.openingElement.name.type === 'JSXIdentifier' ? parent.node.openingElement.name.name : null;
          if (parentTag && !['table', 'tbody', 'thead', 'tfoot'].includes(parentTag)) {
            console.error(`[INVALID TABLE NESTING] ${relPath}:${opening.loc?.start.line} -> <tr> cannot be directly inside <${parentTag}>`);
            totalErrors++;
          }
        }
      }

      // Check td / th parent
      if (['td', 'th'].includes(tag)) {
        let parent = pathNode.parentPath;
        while (parent && parent.node.type !== 'JSXElement' && parent.parentPath) {
          parent = parent.parentPath;
        }
        if (parent && parent.node.type === 'JSXElement') {
          const parentTag = parent.node.openingElement.name.type === 'JSXIdentifier' ? parent.node.openingElement.name.name : null;
          if (parentTag && parentTag !== 'tr') {
            console.error(`[INVALID CELL NESTING] ${relPath}:${opening.loc?.start.line} -> <${tag}> cannot be directly inside <${parentTag}> (must be in <tr>)`);
            totalErrors++;
          }
        }
      }

      // Check invalid block elements inside <p>
      const BLOCK_ELEMENTS = new Set(['div', 'table', 'p', 'form', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'article']);
      if (BLOCK_ELEMENTS.has(tag)) {
        let parent = pathNode.parentPath;
        while (parent && parent.node.type === 'JSXElement') {
          const parentTag = parent.node.openingElement.name.type === 'JSXIdentifier' ? parent.node.openingElement.name.name : null;
          if (parentTag === 'p') {
            console.error(`[INVALID P NESTING] ${relPath}:${opening.loc?.start.line} -> <${tag}> cannot be placed inside <p>`);
            totalErrors++;
            break;
          }
          parent = parent.parentPath;
        }
      }
    }
  });
}

console.log(`\n===========================================`);
console.log(`Scan finished. Found ${totalErrors} issue(s).`);
console.log(`===========================================`);
