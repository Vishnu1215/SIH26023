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
  'BroadcastChannel', 'AbortController', 'import', 'React'
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

  traverse(ast, {
    // Check all Identifier references
    Identifier(pathNode) {
      const name = pathNode.node.name;
      if (STANDARD_GLOBALS.has(name)) return;
      if (pathNode.isIdentifier() && pathNode.isReferencedIdentifier()) {
        const binding = pathNode.scope.getBinding(name);
        if (!binding) {
          // Check if parent is a member expression property (e.g. obj.name)
          if (pathNode.parentPath.isMemberExpression() && pathNode.parentPath.node.property === pathNode.node && !pathNode.parentPath.node.computed) {
            return;
          }
          // Check if parent is an object property key (e.g. { name: 1 })
          if (pathNode.parentPath.isObjectProperty() && pathNode.parentPath.node.key === pathNode.node && !pathNode.parentPath.node.computed) {
            return;
          }
          // Check if parent is JSXAttribute (e.g. <div name=... />)
          if (pathNode.parentPath.isJSXAttribute()) {
            return;
          }
          // Check if it's in typeof foo
          if (pathNode.parentPath.isUnaryExpression({ operator: 'typeof' })) {
            return;
          }

          console.error(`[UNDEFINED IDENTIFIER] ${relPath}:${pathNode.node.loc?.start.line} -> '${name}' is referenced but not declared or imported!`);
          totalErrors++;
        }
      }
    }
  });
}

console.log(`\n===========================================`);
console.log(`Scan finished. Found ${totalErrors} identifier issue(s).`);
console.log(`===========================================`);
