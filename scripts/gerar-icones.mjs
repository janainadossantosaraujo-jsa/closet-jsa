// Gera os ícones PNG do PWA (cabide) sem dependências: rasterização por distância + PNG via zlib.
// Uso: npm run icones   (grava em public/ e public/icons/)
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const FUNDO = [0x6b, 0x4e, 0x3d];
const CABIDE = [0xf7, 0xf4, 0xf0];

// ---- geometria do cabide em coordenadas 0..1 (y para baixo) ----
const DY = 0.07; // centraliza verticalmente
const PESCOCO = [0.5, 0.4 + DY];
const ESQ = [0.16, 0.68 + DY];
const DIR = [0.84, 0.68 + DY];
const CENTRO_GANCHO = [0.5, 0.255 + DY];
const RAIO_GANCHO = 0.08;
const TOPO_HASTE = [0.5, CENTRO_GANCHO[1] + RAIO_GANCHO];
const ESPESSURA = 0.05;

function distSegmento(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function distArco(px, py) {
  const [cx, cy] = CENTRO_GANCHO;
  const ang = Math.atan2(py - cy, px - cx); // -PI..PI
  // arco de 3/4: de 180° (esquerda) passando pelo topo e direita até 90° (baixo)
  if (ang <= Math.PI / 2 && ang >= -Math.PI) return Math.abs(Math.hypot(px - cx, py - cy) - RAIO_GANCHO);
  const pontaEsq = [cx - RAIO_GANCHO, cy];
  const pontaBaixo = [cx, cy + RAIO_GANCHO];
  return Math.min(Math.hypot(px - pontaEsq[0], py - pontaEsq[1]), Math.hypot(px - pontaBaixo[0], py - pontaBaixo[1]));
}

function noCabide(x, y) {
  const d = Math.min(
    distSegmento(x, y, PESCOCO, ESQ),
    distSegmento(x, y, PESCOCO, DIR),
    distSegmento(x, y, ESQ, DIR),
    distSegmento(x, y, TOPO_HASTE, PESCOCO),
    distArco(x, y),
  );
  return d <= ESPESSURA / 2;
}

function noQuadradoArredondado(x, y, r) {
  const qx = Math.abs(x - 0.5) - (0.5 - r);
  const qy = Math.abs(y - 0.5) - (0.5 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) <= r;
}

/** maskable: fundo inteiro e desenho reduzido para a zona segura (80%). */
function rasterizar(tamanho, maskable) {
  const AA = 4;
  const escala = maskable ? 0.72 : 1;
  const px = Buffer.alloc(tamanho * tamanho * 4);
  for (let j = 0; j < tamanho; j++) {
    for (let i = 0; i < tamanho; i++) {
      let fundo = 0, cabide = 0;
      for (let sj = 0; sj < AA; sj++) {
        for (let si = 0; si < AA; si++) {
          const x = (i + (si + 0.5) / AA) / tamanho;
          const y = (j + (sj + 0.5) / AA) / tamanho;
          const dentro = maskable || noQuadradoArredondado(x, y, 0.22);
          if (!dentro) continue;
          fundo++;
          if (noCabide((x - 0.5) / escala + 0.5, (y - 0.5) / escala + 0.5)) cabide++;
        }
      }
      const n = AA * AA;
      const o = (j * tamanho + i) * 4;
      const a = fundo / n;
      const t = fundo ? cabide / fundo : 0;
      for (let c = 0; c < 3; c++) px[o + c] = Math.round(FUNDO[c] * (1 - t) + CABIDE[c] * t);
      px[o + 3] = Math.round(a * 255);
    }
  }
  return px;
}

const TABELA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = TABELA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function bloco(tipo, dados) {
  const t = Buffer.from(tipo, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(dados.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, dados])));
  return Buffer.concat([len, t, dados, crc]);
}
function png(tamanho, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(tamanho, 0);
  ihdr.writeUInt32BE(tamanho, 4);
  ihdr[8] = 8; // bits
  ihdr[9] = 6; // RGBA
  const linhas = Buffer.alloc((tamanho * 4 + 1) * tamanho);
  for (let y = 0; y < tamanho; y++) {
    linhas[y * (tamanho * 4 + 1)] = 0;
    rgba.copy(linhas, y * (tamanho * 4 + 1) + 1, y * tamanho * 4, (y + 1) * tamanho * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', ihdr),
    bloco('IDAT', deflateSync(linhas, { level: 9 })),
    bloco('IEND', Buffer.alloc(0)),
  ]);
}

function gravar(caminho, conteudo) {
  const destino = join(raiz, 'public', caminho);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, conteudo);
  console.log('gerado', caminho);
}

gravar('icons/icon-192.png', png(192, rasterizar(192, false)));
gravar('icons/icon-512.png', png(512, rasterizar(512, false)));
gravar('icons/maskable-192.png', png(192, rasterizar(192, true)));
gravar('icons/maskable-512.png', png(512, rasterizar(512, true)));
gravar('apple-touch-icon.png', png(180, rasterizar(180, true)));

const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
const f = (n) => (n * 100).toFixed(1);
gravar(
  'favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="${hex(FUNDO)}"/>
  <g fill="none" stroke="${hex(CABIDE)}" stroke-width="${f(ESPESSURA)}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M${f(ESQ[0])} ${f(ESQ[1])} L${f(PESCOCO[0])} ${f(PESCOCO[1])} L${f(DIR[0])} ${f(DIR[1])} Z"/>
    <path d="M${f(PESCOCO[0])} ${f(PESCOCO[1])} L${f(TOPO_HASTE[0])} ${f(TOPO_HASTE[1])} A${f(RAIO_GANCHO)} ${f(RAIO_GANCHO)} 0 1 0 ${f(CENTRO_GANCHO[0] - RAIO_GANCHO)} ${f(CENTRO_GANCHO[1])}"/>
  </g>
</svg>
`,
);
