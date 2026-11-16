/**
 * BosquePatitas · Entorno natural
 * ---------------------------------------------------------------------------
 * Cielo, luz, césped, baldosas y árboles del bosque.
 *
 * Todo lo que hay aquí se genera en el navegador: no se descarga ninguna
 * imagen. Las texturas fotográficas opcionales (assets/textures/) se cargan
 * después del primer render y sustituyen a las procedurales sin bloquear.
 *
 * Compatible con Three.js r128 (script global, sin módulos).
 */
(function (global) {
    'use strict';

    const THREE = global.THREE;
    if (!THREE) return;

    // =====================================================================
    // UTILIDADES
    // =====================================================================

    // Generador pseudoaleatorio con semilla: el bosque sale igual en cada visita.
    function makeRng(seed) {
        let a = seed >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function smoothstep(a, b, x) {
        const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
        return t * t * (3 - 2 * t);
    }

    function clamp01(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }

    // Ruido de valor periódico (enlosable sin costuras) sobre un campo w×h, valores 0..1.
    function fbmField(w, h, px, py, octaves, rng, gain) {
        const out = new Float32Array(w * h);
        let amp = 1, total = 0;
        const x0 = new Int32Array(w), x1 = new Int32Array(w), tx = new Float32Array(w);
        for (let o = 0; o < octaves; o++) {
            const gx = px << o, gy = py << o;
            if (gx > w || gy > h) break;
            const grid = new Float32Array(gx * gy);
            for (let i = 0; i < grid.length; i++) grid[i] = rng();
            for (let x = 0; x < w; x++) {
                const f = x * gx / w, i = Math.floor(f), t = f - i;
                x0[x] = i % gx; x1[x] = (i + 1) % gx; tx[x] = t * t * (3 - 2 * t);
            }
            for (let y = 0; y < h; y++) {
                const f = y * gy / h, j = Math.floor(f);
                let t = f - j; t = t * t * (3 - 2 * t);
                const r0 = (j % gy) * gx, r1 = ((j + 1) % gy) * gx, row = y * w;
                for (let x = 0; x < w; x++) {
                    const a = grid[r0 + x0[x]], b = grid[r0 + x1[x]];
                    const c = grid[r1 + x0[x]], d = grid[r1 + x1[x]];
                    const top = a + (b - a) * tx[x], bot = c + (d - c) * tx[x];
                    out[row + x] += (top + (bot - top) * t) * amp;
                }
            }
            total += amp; amp *= gain;
        }
        const inv = 1 / total;
        for (let i = 0; i < out.length; i++) out[i] *= inv;
        return out;
    }

    // Desenfoque de caja con envoltura (mantiene la textura enlosable).
    function blurWrap(src, w, h, r) {
        const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
        const n = 2 * r + 1;
        for (let y = 0; y < h; y++) {
            const row = y * w;
            let s = 0;
            for (let k = -r; k <= r; k++) s += src[row + ((k + w) % w)];
            for (let x = 0; x < w; x++) {
                tmp[row + x] = s / n;
                s += src[row + ((x + r + 1) % w)] - src[row + ((x - r + w) % w)];
            }
        }
        for (let x = 0; x < w; x++) {
            let s = 0;
            for (let k = -r; k <= r; k++) s += tmp[((k + h) % h) * w + x];
            for (let y = 0; y < h; y++) {
                out[y * w + x] = s / n;
                s += tmp[((y + r + 1) % h) * w + x] - tmp[((y - r + h) % h) * w + x];
            }
        }
        return out;
    }

    // Mapa de normales (convención OpenGL) a partir de un mapa de alturas enlosable.
    function normalFromHeight(hgt, w, h, strength) {
        const out = new Uint8Array(w * h * 4);
        for (let y = 0; y < h; y++) {
            const yu = ((y + 1) % h) * w, yd = ((y + h - 1) % h) * w, row = y * w;
            for (let x = 0; x < w; x++) {
                const xr = x + 1 === w ? 0 : x + 1, xl = x === 0 ? w - 1 : x - 1;
                const dx = (hgt[row + xr] - hgt[row + xl]) * strength;
                const dy = (hgt[yu + x] - hgt[yd + x]) * strength;
                const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
                const o = (row + x) * 4;
                out[o] = (-dx * inv * 0.5 + 0.5) * 255;
                out[o + 1] = (-dy * inv * 0.5 + 0.5) * 255;
                out[o + 2] = (inv * 0.5 + 0.5) * 255;
                out[o + 3] = 255;
            }
        }
        return out;
    }

    function dataTexture(data, w, h, isColor, aniso, clamp) {
        const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
        t.wrapS = t.wrapT = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
        t.magFilter = THREE.LinearFilter;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.generateMipmaps = true;
        t.anisotropy = aniso || 1;
        if (isColor) t.encoding = THREE.sRGBEncoding;
        t.needsUpdate = true;
        return t;
    }

    function makeCanvas(w, h) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        return c;
    }

    // Convierte las UV 0..1 de una geometría a metros, para que todas las
    // superficies compartan textura con la misma escala real.
    function uvToMetres(geometry, su, sv) {
        const uv = geometry.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
        uv.needsUpdate = true;
        return geometry;
    }

    function cylinderUVToMetres(geometry, radius, height) {
        const uv = geometry.attributes.uv, nor = geometry.attributes.normal;
        const circ = Math.round(2 * Math.PI * radius);
        for (let i = 0; i < uv.count; i++) {
            if (Math.abs(nor.getY(i)) > 0.9) uv.setXY(i, uv.getX(i) * 2 * radius, uv.getY(i) * 2 * radius);
            else uv.setXY(i, uv.getX(i) * circ, uv.getY(i) * height);
        }
        uv.needsUpdate = true;
        return geometry;
    }

    // =====================================================================
    // TEXTURAS PROCEDURALES
    // =====================================================================

    // ---- Césped: color + normales -------------------------------------
    function buildGrassTextures(size, tileMetres, rng, aniso) {
        const k = (size / tileMetres) / 170.67; // escala de trazo según píxeles por metro
        const canvas = makeCanvas(size, size);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Base: manchas de tono y zonas algo más secas
        // (el ruido se calcula a media resolución: es de baja frecuencia y cuesta 4 veces menos)
        const N = size >> 1;
        const n1 = fbmField(N, N, 3, 3, 5, rng, 0.55);
        const n2 = fbmField(N, N, 5, 5, 4, rng, 0.6);
        const small = makeCanvas(N, N), sctx = small.getContext('2d');
        const img = sctx.createImageData(N, N);
        const d = img.data;
        for (let i = 0, p = 0; i < n1.length; i++, p += 4) {
            const a = n1[i];
            const dry = smoothstep(0.56, 0.8, n2[i]) * 0.4;
            let r = 30 + a * 28, g = 56 + a * 38, b = 22 + a * 16;
            r += (104 - r) * dry; g += (112 - g) * dry; b += (48 - b) * dry;
            d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = 255;
        }
        sctx.putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(small, 0, 0, size, size);

        // Briznas: trazos curvos agrupados por color (de oscuro a claro, las claras quedan encima)
        const palette = ['#25481f', '#2c5523', '#356428', '#3e722d', '#498033', '#568c3a', '#649541', '#749d4b', '#869c55'];
        const weights = [0.10, 0.14, 0.17, 0.17, 0.16, 0.12, 0.08, 0.04, 0.02];
        const total = Math.round(size * size / (34 * k * k));
        ctx.lineCap = 'round';
        for (let c = 0; c < palette.length; c++) {
            const path = new Path2D();
            const n = Math.round(total * weights[c]);
            for (let i = 0; i < n; i++) {
                const x = rng() * size, y = rng() * size;
                const len = (8 + rng() * 17) * k;
                const ang = rng() * Math.PI * 2;
                const dx = Math.cos(ang) * len, dy = Math.sin(ang) * len;
                const bend = (rng() - 0.5) * len * 0.6;
                const cx = x + dx * 0.5 - Math.sin(ang) * bend, cy = y + dy * 0.5 + Math.cos(ang) * bend;
                const m = 28 * k;
                const ox = x < m ? size : (x > size - m ? -size : 0);
                const oy = y < m ? size : (y > size - m ? -size : 0);
                path.moveTo(x, y); path.quadraticCurveTo(cx, cy, x + dx, y + dy);
                if (ox) { path.moveTo(x + ox, y); path.quadraticCurveTo(cx + ox, cy, x + dx + ox, y + dy); }
                if (oy) { path.moveTo(x, y + oy); path.quadraticCurveTo(cx, cy + oy, x + dx, y + dy + oy); }
                if (ox && oy) { path.moveTo(x + ox, y + oy); path.quadraticCurveTo(cx + ox, cy + oy, x + dx + ox, y + dy + oy); }
            }
            ctx.strokeStyle = palette[c];
            ctx.lineWidth = Math.max(1, (1.25 + c * 0.11) * k);
            ctx.stroke(path);
        }

        const px = ctx.getImageData(0, 0, size, size).data;
        const color = new Uint8Array(px.buffer.slice(0));
        const hgt = new Float32Array(size * size);
        for (let i = 0, p = 0; i < hgt.length; i++, p += 4) hgt[i] = (px[p] * 0.3 + px[p + 1] * 0.6 + px[p + 2] * 0.1) / 255;

        return {
            map: dataTexture(color, size, size, true, aniso),
            normalMap: dataTexture(normalFromHeight(hgt, size, size, 2.2), size, size, false, aniso),
            roughnessMap: null
        };
    }

    // ---- Adoquinado: color + normales + rugosidad ---------------------
    function buildPavingTextures(size, tileMetres, rng, aniso) {
        const k = size / 1024;
        const ppm = size / tileMetres;
        const rows = 16, rowH = size / rows;
        const alb = makeCanvas(size, size), msk = makeCanvas(size, size);
        const a = alb.getContext('2d', { willReadFrequently: true });
        const m = msk.getContext('2d', { willReadFrequently: true });
        a.fillStyle = '#2f2b25'; a.fillRect(0, 0, size, size);
        m.fillStyle = '#000'; m.fillRect(0, 0, size, size);

        const stoneColors = [[128, 125, 118], [114, 112, 106], [137, 130, 119], [105, 105, 103], [124, 116, 103], [118, 121, 123]];
        const joint = Math.max(1.5, 0.016 * ppm);

        function stonePath(ctx, x, y, w, h, rad, jit) {
            const x0 = x + jit[0], y0 = y + jit[1], x1 = x + w + jit[2], y1 = y + jit[3];
            const x2 = x + w + jit[4], y2 = y + h + jit[5], x3 = x + jit[6], y3 = y + h + jit[7];
            ctx.beginPath();
            ctx.moveTo((x0 + x1) / 2, (y0 + y1) / 2);
            ctx.arcTo(x1, y1, x2, y2, rad);
            ctx.arcTo(x2, y2, x3, y3, rad);
            ctx.arcTo(x3, y3, x0, y0, rad);
            ctx.arcTo(x0, y0, x1, y1, rad);
            ctx.closePath();
        }

        for (let r = 0; r < rows; r++) {
            const start = rng() * 0.4 * ppm;
            let x = start;
            while (x < start + size - 1) {
                let w = (0.22 + rng() * 0.24) * ppm;
                const remaining = start + size - x;
                if (remaining - w < 0.2 * ppm) w = remaining;
                const base = stoneColors[Math.floor(rng() * stoneColors.length)];
                const br = 0.86 + rng() * 0.26;
                const fill = 'rgb(' + Math.round(base[0] * br) + ',' + Math.round(base[1] * br) + ',' + Math.round(base[2] * br) + ')';
                const lvl = Math.round(205 + rng() * 50);
                const rad = (3 + rng() * 5) * k;
                const jit = [];
                for (let j = 0; j < 8; j++) jit.push((rng() - 0.5) * 2.6 * k);
                const sx = x + joint / 2, sy = r * rowH + joint / 2, sw = w - joint, sh = rowH - joint;
                for (let rep = 0; rep < 2; rep++) {
                    const ox = rep === 0 ? 0 : -size;
                    if (rep === 1 && x + w <= size) break;
                    stonePath(a, sx + ox, sy, sw, sh, rad, jit); a.fillStyle = fill; a.fill();
                    stonePath(m, sx + ox, sy, sw, sh, rad, jit); m.fillStyle = 'rgb(' + lvl + ',' + lvl + ',' + lvl + ')'; m.fill();
                }
                x += w;
            }
        }

        const ap = a.getImageData(0, 0, size, size).data;
        const mp = m.getImageData(0, 0, size, size).data;
        let mask = new Float32Array(size * size);
        for (let i = 0, p = 0; i < mask.length; i++, p += 4) mask[i] = mp[p] / 255;
        const br = Math.max(1, Math.round(2.4 * k));
        mask = blurWrap(blurWrap(mask, size, size, br), size, size, br);

        const N = size >> 1;
        const fine = fbmField(N, N, 28, 28, 4, rng, 0.62);
        const tone = fbmField(N, N, 4, 4, 3, rng, 0.5);
        const moss = fbmField(N, N, 7, 7, 4, rng, 0.55);

        const color = new Uint8Array(size * size * 4);
        const rough = new Uint8Array(N * N * 4);
        const hgt = new Float32Array(size * size);
        for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
            const px = i % size, py = (i / size) | 0;
            const h2 = (py >> 1) * N + (px >> 1);
            const e = smoothstep(0.22, 0.78, mask[i]);          // 0 = junta, 1 = cara de la piedra
            const f = fine[h2];
            let hh = e * (0.75 + 0.25 * mask[i]) + (f - 0.5) * 0.12 * e;
            if (f > 0.8) hh -= (f - 0.8) * 0.9 * e;             // picaduras
            hgt[i] = hh;

            const shade = (0.8 + 0.38 * f) * (0.88 + 0.24 * tone[h2]) * (0.5 + 0.5 * e);
            let r = ap[p] * shade, g = ap[p + 1] * shade, b = ap[p + 2] * shade;
            const mossy = (1 - e) * smoothstep(0.42, 0.66, moss[h2]) * 0.9;      // musgo en las juntas
            r += (58 - r) * mossy; g += (80 - g) * mossy; b += (38 - b) * mossy;
            const lichen = e * smoothstep(0.7, 0.88, moss[h2]) * 0.28;           // liquen sobre la piedra
            r += (128 - r) * lichen; g += (134 - g) * lichen; b += (104 - b) * lichen;
            color[p] = r; color[p + 1] = g; color[p + 2] = b; color[p + 3] = 255;

            if (!(px & 1) && !(py & 1)) {
                const rg = clamp01(0.96 - 0.2 * e + (f - 0.5) * 0.16) * 255, o = h2 * 4;
                rough[o] = rg; rough[o + 1] = rg; rough[o + 2] = rg; rough[o + 3] = 255;
            }
        }

        return {
            map: dataTexture(color, size, size, true, aniso),
            normalMap: dataTexture(normalFromHeight(hgt, size, size, 5.5 * k + 1.5), size, size, false, aniso),
            roughnessMap: dataTexture(rough, N, N, false, aniso)
        };
    }

    // ---- Corteza: color + normales -------------------------------------
    function buildBarkTextures(w, h, rng, aniso) {
        const n = fbmField(w, h, 10, 2, 4, rng, 0.55);
        const det = fbmField(w, h, 32, 16, 3, rng, 0.6);
        const lich = fbmField(w, h, 3, 3, 3, rng, 0.5);
        const color = new Uint8Array(w * h * 4);
        const hgt = new Float32Array(w * h);
        for (let i = 0, p = 0; i < hgt.length; i++, p += 4) {
            const ridge = 1 - Math.abs(2 * n[i] - 1);
            const hh = Math.pow(ridge, 1.6) * 0.85 + det[i] * 0.15;
            hgt[i] = hh;
            const t = smoothstep(0.25, 0.95, hh);
            let r = 44 + t * 78, g = 33 + t * 66, b = 25 + t * 54;
            const l = smoothstep(0.6, 0.85, lich[i]) * 0.35 * t;
            r += (120 - r) * l; g += (128 - g) * l; b += (100 - b) * l;
            const v = 0.9 + det[i] * 0.2;
            color[p] = r * v; color[p + 1] = g * v; color[p + 2] = b * v; color[p + 3] = 255;
        }
        return {
            map: dataTexture(color, w, h, true, aniso),
            normalMap: dataTexture(normalFromHeight(hgt, w, h, 5.0), w, h, false, aniso),
            roughnessMap: null
        };
    }

    // ---- Variación a gran escala (rompe la repetición del suelo) -------
    function buildMacroTexture(rng) {
        const s = 128;
        const f = fbmField(s, s, 4, 4, 4, rng, 0.55);
        const data = new Uint8Array(s * s * 4);
        for (let i = 0, p = 0; i < f.length; i++, p += 4) {
            const v = clamp01((f[i] - 0.5) * 2.2 + 0.5) * 255;
            data[p] = v; data[p + 1] = v; data[p + 2] = v; data[p + 3] = 255;
        }
        const t = dataTexture(data, s, s, false, 1);
        return t;
    }

    // ---- Hojas: texturas con transparencia -----------------------------
    // Pasa un canvas a DataTexture rellenando el color de las zonas
    // transparentes para que no aparezcan halos oscuros en los bordes.
    function alphaTextureFromCanvas(canvas, aniso) {
        const w = canvas.width, h = canvas.height;
        const src = canvas.getContext('2d').getImageData(0, 0, w, h).data;
        const out = new Uint8Array(w * h * 4);
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < src.length; i += 4) {
            if (src[i + 3] > 200) { r += src[i]; g += src[i + 1]; b += src[i + 2]; n++; }
        }
        n = n || 1; r /= n; g /= n; b /= n;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const s = ((h - 1 - y) * w + x) * 4, o = (y * w + x) * 4;
                const al = src[s + 3];
                if (al < 24) { out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = 0; }
                else { out[o] = src[s]; out[o + 1] = src[s + 1]; out[o + 2] = src[s + 2]; out[o + 3] = Math.min(255, al * 1.5); }
            }
        }
        return dataTexture(out, w, h, true, aniso, true);
    }

    function drawLeaf(ctx, x, y, len, wid, ang, fill, rib) {
        ctx.save();
        ctx.translate(x, y); ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(len * 0.25, -wid, len * 0.75, -wid * 0.75, len, 0);
        ctx.bezierCurveTo(len * 0.75, wid * 0.75, len * 0.25, wid, 0, 0);
        ctx.fillStyle = fill; ctx.fill();
        if (rib) {
            ctx.strokeStyle = rib; ctx.lineWidth = Math.max(0.6, len * 0.035);
            ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(len * 0.9, 0); ctx.stroke();
        }
        ctx.restore();
    }

    function buildBroadleafTexture(size, rng, aniso) {
        const c = makeCanvas(size, size), ctx = c.getContext('2d', { willReadFrequently: true });
        const k = size / 256, cx = size / 2, cy = size / 2;
        const layers = [
            ['#234a1c', '#2a5621', '#2f5f25'],
            ['#37702a', '#417d30', '#4a8a35'],
            ['#579a3b', '#67a844', '#7bb650']
        ];
        const twigs = [];
        for (let i = 0; i < 7; i++) {
            const ang = i / 7 * Math.PI * 2 + rng() * 0.6;
            twigs.push({ ang, len: (70 + rng() * 42) * k });
        }
        ctx.strokeStyle = '#4a3826'; ctx.lineWidth = 2 * k; ctx.lineCap = 'round';
        twigs.forEach(t => {
            ctx.beginPath(); ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(t.ang) * t.len, cy + Math.sin(t.ang) * t.len); ctx.stroke();
        });
        layers.forEach((cols, li) => {
            twigs.forEach(t => {
                const step = 13 * k;
                for (let s = 14 * k + li * 4 * k; s < t.len; s += step) {
                    for (let side = -1; side <= 1; side += 2) {
                        if (rng() < 0.15) continue;
                        const px = cx + Math.cos(t.ang) * s + (rng() - 0.5) * 8 * k;
                        const py = cy + Math.sin(t.ang) * s + (rng() - 0.5) * 8 * k;
                        const la = t.ang + side * (0.6 + rng() * 0.6);
                        const len = (24 + rng() * 14) * k;
                        drawLeaf(ctx, px, py, len, len * (0.3 + rng() * 0.1), la, cols[Math.floor(rng() * cols.length)], li > 0 ? 'rgba(190,220,140,0.35)' : null);
                    }
                }
            });
            // Relleno suelto para un contorno irregular
            for (let i = 0; i < 18; i++) {
                const ang = rng() * Math.PI * 2, rad = Math.sqrt(rng()) * 98 * k;
                const len = (22 + rng() * 14) * k;
                drawLeaf(ctx, cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, len, len * 0.34, rng() * Math.PI * 2, cols[Math.floor(rng() * cols.length)], li > 0 ? 'rgba(190,220,140,0.3)' : null);
            }
        });
        return alphaTextureFromCanvas(c, aniso);
    }

    function buildPineTexture(size, rng, aniso) {
        const c = makeCanvas(size, size), ctx = c.getContext('2d', { willReadFrequently: true });
        const k = size / 256, cx = size / 2;
        const cols = ['#1d4529', '#255431', '#2f653b', '#3b7645', '#4b8852'];
        const paths = cols.map(() => new Path2D());
        const twig = new Path2D();

        function needles(x0, y0, x1, y1, nLen) {
            const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy);
            const ang = Math.atan2(dy, dx);
            twig.moveTo(x0, y0); twig.lineTo(x1, y1);
            for (let s = 0; s <= L; s += 2.6 * k) {
                const px = x0 + dx * s / L, py = y0 + dy * s / L;
                for (let side = -1; side <= 1; side += 2) {
                    const a = ang + side * (0.55 + rng() * 0.35);
                    const l = nLen * (0.75 + rng() * 0.5);
                    const p = paths[Math.floor(rng() * paths.length)];
                    p.moveTo(px, py); p.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l);
                }
            }
        }

        const top = 12 * k, bottom = size - 4 * k;
        needles(cx, bottom, cx, top, 13 * k);
        let side = 1;
        for (let y = bottom - 16 * k; y > top + 16 * k; y -= 17 * k) {
            const t = (bottom - y) / (bottom - top);
            const len = (104 * (1 - t) + 20) * k * (0.85 + rng() * 0.25);
            const a = -Math.PI / 2 + side * (0.85 + rng() * 0.25);
            needles(cx, y, cx + Math.cos(a) * len, y + Math.sin(a) * len, (12 + 3 * (1 - t)) * k);
            if (rng() < 0.75) {
                const a2 = -Math.PI / 2 - side * (0.85 + rng() * 0.25);
                const len2 = len * (0.8 + rng() * 0.25);
                needles(cx, y - 7 * k, cx + Math.cos(a2) * len2, y - 7 * k + Math.sin(a2) * len2, (12 + 3 * (1 - t)) * k);
            }
            side = -side;
        }
        ctx.lineCap = 'round';
        paths.forEach((p, i) => { ctx.strokeStyle = cols[i]; ctx.lineWidth = 1.7 * k; ctx.stroke(p); });
        ctx.strokeStyle = '#3f2e20'; ctx.lineWidth = 2.2 * k; ctx.stroke(twig);
        return alphaTextureFromCanvas(c, aniso);
    }

    function buildWillowTexture(size, rng, aniso) {
        const c = makeCanvas(size, size), ctx = c.getContext('2d', { willReadFrequently: true });
        const k = size / 256;
        const cols = ['#3d6a26', '#4a7a2c', '#588a33', '#68983b', '#7aa645'];
        const strands = 9;
        for (let s = 0; s < strands; s++) {
            const x0 = (16 + s * 28 + (rng() - 0.5) * 14) * k;
            const amp = (4 + rng() * 7) * k, ph = rng() * 6.28, fr = 0.02 + rng() * 0.012;
            const end = size * (0.8 + rng() * 0.2);
            ctx.strokeStyle = '#6b7a35'; ctx.lineWidth = 1.2 * k;
            ctx.beginPath();
            for (let y = 0; y <= end; y += 4 * k) {
                const x = x0 + Math.sin(y * fr / k + ph) * amp;
                if (y === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
            let sd = 1;
            for (let y = 4 * k; y < end; y += 6.5 * k) {
                const x = x0 + Math.sin(y * fr / k + ph) * amp;
                const len = (19 + rng() * 9) * k;
                drawLeaf(ctx, x, y, len, len * 0.17, Math.PI / 2 + sd * (0.3 + rng() * 0.4), cols[Math.floor(rng() * cols.length)], null);
                sd = -sd;
            }
        }
        return alphaTextureFromCanvas(c, aniso);
    }

    // =====================================================================
    // CIELO
    // =====================================================================
    const SKY = {
        zenith: new THREE.Color(0.17, 0.40, 0.78),
        mid: new THREE.Color(0.40, 0.64, 0.92),
        horizon: new THREE.Color(0.80, 0.89, 0.96),
        below: new THREE.Color(0.88, 0.93, 0.97),
        sun: new THREE.Color(1.0, 0.93, 0.78)
    };

    function createSkyMaterial(sunDir, octaves) {
        return new THREE.ShaderMaterial({
            name: 'BPSky',
            side: THREE.BackSide,
            depthWrite: false,
            fog: false,
            toneMapped: false,
            defines: { OCT: octaves },
            uniforms: {
                uZenith: { value: SKY.zenith }, uMid: { value: SKY.mid }, uHorizon: { value: SKY.horizon },
                uBelow: { value: SKY.below }, uSunColor: { value: SKY.sun },
                uSunDir: { value: sunDir.clone() }, uTime: { value: 0 }
            },
            vertexShader: [
                'varying vec3 vDir;',
                'void main() {',
                '    vDir = position;',
                '    vec4 p = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
                '    gl_Position = p.xyww;',
                '}'
            ].join('\n'),
            fragmentShader: [
                'uniform vec3 uZenith; uniform vec3 uMid; uniform vec3 uHorizon; uniform vec3 uBelow; uniform vec3 uSunColor;',
                'uniform vec3 uSunDir; uniform float uTime;',
                'varying vec3 vDir;',
                'float bpHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }',
                'float bpNoise( vec2 p ) {',
                '    vec2 i = floor( p ); vec2 f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );',
                '    return mix( mix( bpHash( i ), bpHash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( bpHash( i + vec2( 0.0, 1.0 ) ), bpHash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y );',
                '}',
                'float bpFbm( vec2 p ) {',
                '    float v = 0.0; float a = 0.5;',
                '    for ( int i = 0; i < OCT; i ++ ) { v += a * bpNoise( p ); p = p * 2.03 + vec2( 17.0, 9.0 ); a *= 0.5; }',
                '    return v;',
                '}',
                'void main() {',
                '    vec3 d = normalize( vDir );',
                '    float h = d.y;',
                '    float t = pow( clamp( h, 0.0, 1.0 ), 0.45 );',
                '    vec3 col = mix( uHorizon, uMid, smoothstep( 0.0, 0.5, t ) );',
                '    col = mix( col, uZenith, smoothstep( 0.4, 1.0, t ) );',
                '    float sd = max( dot( d, uSunDir ), 0.0 );',
                '    col += uSunColor * ( 0.16 * pow( sd, 6.0 ) + 0.38 * pow( sd, 48.0 ) );',
                '    if ( h > 0.01 ) {',
                '        vec2 uv = d.xz / ( h + 0.22 ) * 1.4 + vec2( uTime * 0.004, uTime * 0.0015 );',
                '        float c = bpFbm( uv * vec2( 1.0, 2.1 ) ) * 0.72 + bpFbm( uv * 3.3 + 5.0 ) * 0.28;',
                '        float cov = smoothstep( 0.5, 0.78, c ) * smoothstep( 0.01, 0.2, h );',
                '        col = mix( col, vec3( 0.98, 0.985, 1.0 ), cov * 0.7 );',
                '    }',
                '    col = mix( col, vec3( 1.0, 0.985, 0.92 ), smoothstep( 0.9990, 0.9996, sd ) );',
                '    col = mix( col, uBelow, smoothstep( 0.0, -0.16, h ) );',
                '    #ifdef BP_ENV',
                '        gl_FragColor = linearToOutputTexel( vec4( pow( col, vec3( 2.2 ) ), 1.0 ) );',
                '    #else',
                '        gl_FragColor = vec4( col, 1.0 );',
                '    #endif',
                '}'
            ].join('\n')
        });
    }

    // Mapa de entorno a partir del propio cielo: da reflejos reales a metales y mármol.
    function buildEnvironmentMap(renderer, skyMaterial) {
        const pmrem = new THREE.PMREMGenerator(renderer);
        const tmpScene = new THREE.Scene();
        const mat = skyMaterial.clone();
        mat.defines.BP_ENV = 1;
        mat.uniforms.uBelow.value = new THREE.Color(0.52, 0.60, 0.46);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), mat);
        tmpScene.add(dome);
        const target = pmrem.fromScene(tmpScene, 0.03, 0.1, 200);
        pmrem.dispose();
        dome.geometry.dispose();
        mat.dispose();
        return target.texture;
    }

    // =====================================================================
    // MATERIALES
    // =====================================================================
    const timeUniform = { value: 0 };

    // Suelo: mezcla la textura a dos escalas y la tiñe con una variación
    // amplia para que no se vea el patrón repetido.
    function makeGroundMaterial(tex, macroTex, opts) {
        const mat = new THREE.MeshStandardMaterial({
            map: tex.map,
            normalMap: tex.normalMap,
            roughnessMap: tex.roughnessMap,
            roughness: opts.roughness,
            metalness: 0
        });
        mat.normalScale.set(opts.normalScale, opts.normalScale);
        mat.envMapIntensity = opts.envMapIntensity;
        const uniforms = {
            uBpMacro: { value: macroTex },
            uBpMacroScale: { value: 1 / opts.macroMetres },
            uBpBlend: { value: opts.blend },
            uBpLo: { value: new THREE.Vector3(opts.lo[0], opts.lo[1], opts.lo[2]) },
            uBpHi: { value: new THREE.Vector3(opts.hi[0], opts.hi[1], opts.hi[2]) }
        };
        mat.onBeforeCompile = function (shader) {
            Object.assign(shader.uniforms, uniforms);
            shader.vertexShader = shader.vertexShader
                .replace('#include <uv_pars_vertex>', '#include <uv_pars_vertex>\nvarying vec2 vBpUv;')
                .replace('#include <uv_vertex>', '#include <uv_vertex>\nvBpUv = uv;');
            shader.fragmentShader = shader.fragmentShader
                .replace('#include <map_pars_fragment>', [
                    '#include <map_pars_fragment>',
                    'uniform sampler2D uBpMacro; uniform float uBpMacroScale; uniform float uBpBlend;',
                    'uniform vec3 uBpLo; uniform vec3 uBpHi; varying vec2 vBpUv;'
                ].join('\n'))
                .replace('#include <map_fragment>', [
                    '#ifdef USE_MAP',
                    '    vec4 texelColor = mapTexelToLinear( texture2D( map, vUv ) );',
                    '    float bpM = texture2D( uBpMacro, vBpUv * uBpMacroScale ).r;',
                    '    if ( uBpBlend > 0.0 ) {',
                    '        float bpM2 = texture2D( uBpMacro, vBpUv * uBpMacroScale * 3.3 + vec2( 0.37, 0.61 ) ).r;',
                    '        vec2 bpUv2 = vec2( vUv.x * 1.31 - vUv.y * 0.93, vUv.x * 0.93 + vUv.y * 1.31 ) + vec2( 0.27, 0.71 );',
                    '        vec4 bpB = mapTexelToLinear( texture2D( map, bpUv2 ) );',
                    '        texelColor = mix( texelColor, bpB, uBpBlend * smoothstep( 0.38, 0.62, bpM2 ) );',
                    '    }',
                    '    texelColor.rgb *= mix( uBpLo, uBpHi, bpM );',
                    '    diffuseColor *= texelColor;',
                    '#endif'
                ].join('\n'));
        };
        return mat;
    }

    // Balanceo por viento en el vértice (hojas y sus sombras).
    function addWind(material, strength) {
        material.onBeforeCompile = function (shader) {
            shader.uniforms.uBpTime = timeUniform;
            shader.vertexShader = shader.vertexShader
                .replace('#include <common>', '#include <common>\nattribute vec2 aWind;\nuniform float uBpTime;')
                .replace('#include <begin_vertex>', [
                    '#include <begin_vertex>',
                    'float bpW = sin( uBpTime * 1.5 + aWind.x + position.x * 0.35 + position.z * 0.27 ) + 0.5 * sin( uBpTime * 3.1 + aWind.x * 1.7 );',
                    'transformed.x += bpW * aWind.y * ' + strength.toFixed(4) + ';',
                    'transformed.z += bpW * aWind.y * ' + (strength * 0.6).toFixed(4) + ';'
                ].join('\n'));
        };
        return material;
    }

    // =====================================================================
    // GEOMETRÍA DE ÁRBOLES
    // =====================================================================
    function GeoBuilder() {
        this.pos = []; this.nor = []; this.uv = []; this.col = []; this.wind = []; this.idx = [];
        this.count = 0;
    }
    GeoBuilder.prototype.build = function (withWind) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
        g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
        if (withWind) g.setAttribute('aWind', new THREE.Float32BufferAttribute(this.wind, 2));
        g.setIndex(this.idx);
        g.computeBoundingSphere();
        g.computeBoundingBox();
        return g;
    };

    const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _t = new THREE.Vector3();
    const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();

    function pushVertex(B, M, p, n, u, v, r, g, b, wPhase, wWeight) {
        _v.copy(p).applyMatrix4(M);
        _n.copy(n).transformDirection(M);
        B.pos.push(_v.x, _v.y, _v.z);
        B.nor.push(_n.x, _n.y, _n.z);
        B.uv.push(u, v);
        B.col.push(r, g, b);
        B.wind.push(wPhase || 0, wWeight || 0);
        return B.count++;
    }

    // Tubo ahusado a lo largo de una curva cuadrática (troncos y ramas).
    function addTube(B, M, p0, p1, p2, r0, r1, segs, rings, flare, uRepeat, vScale, shadeBase) {
        const start = B.count;
        let dist = 0;
        const prev = new THREE.Vector3().copy(p0);
        const pt = new THREE.Vector3(), tan = new THREE.Vector3(), N = new THREE.Vector3(), Bn = new THREE.Vector3(), dir = new THREE.Vector3();
        for (let i = 0; i <= rings; i++) {
            const t = i / rings, it = 1 - t;
            pt.set(0, 0, 0).addScaledVector(p0, it * it).addScaledVector(p1, 2 * it * t).addScaledVector(p2, t * t);
            tan.set(0, 0, 0).addScaledVector(p0, -2 * it).addScaledVector(p1, 2 * it - 2 * t).addScaledVector(p2, 2 * t).normalize();
            dist += pt.distanceTo(prev); prev.copy(pt);
            _t.set(1, 0, 0);
            if (Math.abs(tan.x) > 0.9) _t.set(0, 0, 1);
            N.crossVectors(tan, _t).normalize();
            Bn.crossVectors(tan, N).normalize();
            const rad = r0 + (r1 - r0) * t + flare * Math.exp(-t * 9);
            const shade = shadeBase ? (0.62 + 0.38 * smoothstep(0, 0.25, t)) : 1;
            for (let j = 0; j <= segs; j++) {
                const a = j / segs * Math.PI * 2;
                const wob = 1 + 0.07 * Math.sin((j % segs) * 2.3 + i * 1.9) * (flare > 0 ? 1 : 0.5);
                dir.set(0, 0, 0).addScaledVector(N, Math.cos(a)).addScaledVector(Bn, Math.sin(a));
                _a.copy(pt).addScaledVector(dir, rad * wob);
                pushVertex(B, M, _a, dir, j / segs * uRepeat, dist * vScale, shade, shade, shade);
            }
        }
        const row = segs + 1;
        for (let i = 0; i < rings; i++) {
            for (let j = 0; j < segs; j++) {
                const a = start + i * row + j, b = a + 1, c = a + row, d = c + 1;
                B.idx.push(a, b, c, b, d, c);
            }
        }
    }

    // Plano de hojas visible por ambas caras con la misma normal "esférica":
    // la copa se ilumina como un volumen y no como planos sueltos.
    function addCard(B, M, centre, right, up, w, h, normal, col, phase, windBottom, windTop) {
        const hw = w / 2, hh = h / 2;
        _a.copy(centre).addScaledVector(right, -hw).addScaledVector(up, -hh);
        const i0 = pushVertex(B, M, _a, normal, 0, 0, col[0], col[1], col[2], phase, windBottom);
        _a.copy(centre).addScaledVector(right, hw).addScaledVector(up, -hh);
        pushVertex(B, M, _a, normal, 1, 0, col[0], col[1], col[2], phase, windBottom);
        _a.copy(centre).addScaledVector(right, hw).addScaledVector(up, hh);
        pushVertex(B, M, _a, normal, 1, 1, col[0], col[1], col[2], phase, windTop);
        _a.copy(centre).addScaledVector(right, -hw).addScaledVector(up, hh);
        pushVertex(B, M, _a, normal, 0, 1, col[0], col[1], col[2], phase, windTop);
        B.idx.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3, i0, i0 + 2, i0 + 1, i0, i0 + 3, i0 + 2);
    }

    // Masa interior oscura: evita que se vea el cielo a través de la copa.
    let _icoTemplate = null;
    function addBlob(B, M, centre, rx, ry, rz) {
        if (!_icoTemplate) _icoTemplate = new THREE.IcosahedronGeometry(1, 1).attributes.position;
        const src = _icoTemplate;
        for (let i = 0; i < src.count; i++) {
            _b.set(src.getX(i), src.getY(i), src.getZ(i));
            const j = 0.86 + 0.28 * (0.5 + 0.5 * Math.sin(_b.x * 7.1 + _b.y * 5.3 + _b.z * 9.7));
            _c.set(centre.x + _b.x * rx * j, centre.y + _b.y * ry * j, centre.z + _b.z * rz * j);
            const id = pushVertex(B, M, _c, _b, 0, 0, 1, 1, 1);
            B.idx.push(id);
        }
    }

    function randUnit(rng, out) {
        const u = rng() * 2 - 1, a = rng() * Math.PI * 2, s = Math.sqrt(1 - u * u);
        return out.set(s * Math.cos(a), u, s * Math.sin(a));
    }

    const Y = new THREE.Vector3(0, 1, 0);

    function buildOak(P, M, rng, q) {
        const H = 3.0 + rng() * 0.5;
        const leanA = rng() * Math.PI * 2, lean = 0.25 + rng() * 0.3;
        const top = new THREE.Vector3(Math.cos(leanA) * lean, H, Math.sin(leanA) * lean);
        addTube(P.trunk, M, new THREE.Vector3(0, -0.15, 0), new THREE.Vector3(top.x * 0.2, H * 0.55, top.z * 0.2), top, 0.33, 0.2, q.trunkSegs, 6, 0.24, 2, 1 / 0.95, true);

        const canopy = new THREE.Vector3(top.x, H + 1.0, top.z);
        const lobes = [
            { c: new THREE.Vector3(0, 0.0, 0), r: 1.75 },
            { c: new THREE.Vector3(1.15, -0.45, 0.6), r: 1.3 },
            { c: new THREE.Vector3(-1.05, -0.35, -0.6), r: 1.25 },
            { c: new THREE.Vector3(0.1, 0.95, 0.1), r: 1.3 },
            { c: new THREE.Vector3(-0.35, -0.5, 1.1), r: 1.1 },
            { c: new THREE.Vector3(0.4, -0.4, -1.15), r: 1.1 }
        ];
        const rot = rng() * Math.PI * 2;
        let area = 0;
        lobes.forEach(l => {
            l.c.applyAxisAngle(Y, rot);
            l.c.x += (rng() - 0.5) * 0.4; l.c.y += (rng() - 0.5) * 0.3; l.c.z += (rng() - 0.5) * 0.4;
            l.c.add(canopy);
            l.r *= 0.9 + rng() * 0.25;
            area += l.r * l.r;
        });

        // Ramas principales hacia los lóbulos laterales
        for (let i = 1; i < 5; i++) {
            const l = lobes[i === 3 ? 5 : i];
            const s = new THREE.Vector3().copy(top).multiplyScalar(0.8); s.y = H * (0.68 + rng() * 0.18);
            const e = new THREE.Vector3().copy(l.c); e.y -= l.r * 0.25;
            const m = new THREE.Vector3().lerpVectors(s, e, 0.5); m.y += 0.3;
            addTube(P.trunk, M, s, m, e, 0.13, 0.04, 5, 3, 0, 1, 1 / 0.95, false);
        }

        const tint = [0.86 + rng() * 0.28, 0.92 + rng() * 0.16, 0.78 + rng() * 0.26];
        const dir = new THREE.Vector3(), nrm = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
        const pos = new THREE.Vector3(), sph = new THREE.Vector3();
        lobes.forEach(l => {
            addBlob(P.core, M, l.c, l.r * 0.52, l.r * 0.46, l.r * 0.52);
            const n = Math.round(q.oakCards * l.r * l.r / area);
            for (let i = 0; i < n; i++) {
                randUnit(rng, dir);
                if (dir.y < -0.85) { dir.y *= -0.5; dir.normalize(); }
                const f = 0.66 + 0.42 * rng();
                pos.copy(l.c).addScaledVector(dir, l.r * f);
                randUnit(rng, nrm);
                right.crossVectors(nrm, Math.abs(nrm.y) > 0.9 ? _t.set(1, 0, 0) : Y).normalize();
                up.crossVectors(right, nrm).normalize();
                sph.copy(pos).sub(canopy).normalize().multiplyScalar(0.45).addScaledVector(dir, 0.55);
                sph.y += 0.18; sph.normalize();
                const ao = 0.58 + 0.42 * clamp01((f - 0.66) / 0.42 * 0.55 + (dir.y * 0.5 + 0.5) * 0.55);
                const v = ao * (0.88 + rng() * 0.24);
                const size = 1.0 + rng() * 0.55;
                addCard(P.oak, M, pos, right, up, size, size, sph, [v * tint[0], v * tint[1], v * tint[2]], rng() * 6.28, 0.5, 0.5);
            }
        });
    }

    function buildPine(P, M, rng, q) {
        const H = 6.3 + rng() * 0.6;
        addTube(P.trunk, M, new THREE.Vector3(0, -0.15, 0), new THREE.Vector3(0, H * 0.5, 0), new THREE.Vector3(0, H - 0.3, 0), 0.22, 0.03, q.trunkSegs, 6, 0.14, 2, 1 / 0.95, true);
        addTube(P.core, M, new THREE.Vector3(0, 1.5, 0), new THREE.Vector3(0, 3.6, 0), new THREE.Vector3(0, H - 0.4, 0), 0.8, 0.03, 7, 4, 0, 1, 1, false);

        const tint = [0.85 + rng() * 0.25, 0.92 + rng() * 0.16, 0.85 + rng() * 0.25];
        const K = q.pineTiers;
        const out = new THREE.Vector3(), axis = new THREE.Vector3(), tang = new THREE.Vector3(), side = new THREE.Vector3();
        const centre = new THREE.Vector3(), sph = new THREE.Vector3();
        for (let k = 0; k < K; k++) {
            const t = k / (K - 1);
            const y = 1.35 + t * (H - 2.2);
            const R = 1.85 * (1 - t) * 0.94 + 0.3;
            const n = Math.max(3, Math.round(R * 4.0 + 2));
            for (let i = 0; i < n; i++) {
                const a = (i + rng() * 0.6) / n * Math.PI * 2 + k * 0.7;
                out.set(Math.cos(a), 0, Math.sin(a));
                const droop = 0.3 + rng() * 0.28;
                axis.copy(out).multiplyScalar(Math.cos(droop)); axis.y = -Math.sin(droop);
                tang.set(-Math.sin(a), 0, Math.cos(a));
                const L = R * (1.05 + rng() * 0.3) + 0.3;
                centre.set(0, y + (rng() - 0.5) * 0.2, 0).addScaledVector(out, 0.05).addScaledVector(axis, L * 0.5);
                sph.copy(out).multiplyScalar(0.72); sph.y = 0.7; sph.normalize();
                const v = (0.88 + 0.3 * t) * (0.86 + rng() * 0.28);
                const col = [v * tint[0], v * tint[1], v * tint[2]];
                const ph = rng() * 6.28;
                addCard(P.pine, M, centre, tang, axis, L * 0.82, L, sph, col, ph, 0.04, 0.5);
                if (i % 2 === 0) {
                    side.crossVectors(tang, axis).normalize();
                    addCard(P.pine, M, centre, side, axis, L * 0.6, L, sph, col, ph, 0.04, 0.5);
                }
            }
        }
        // Guía superior
        centre.set(0, H - 0.25, 0);
        sph.set(0, 1, 0);
        const cv = [1.02 * tint[0], 1.02 * tint[1], 1.02 * tint[2]];
        addCard(P.pine, M, centre, _t.set(1, 0, 0), Y, 1.0, 1.5, sph, cv, 0, 0.05, 0.6);
        addCard(P.pine, M, centre, _t.set(0, 0, 1), Y, 1.0, 1.5, sph, cv, 1.5, 0.05, 0.6);
    }

    function buildWillow(P, M, rng, q) {
        const H = 3.2 + rng() * 0.4;
        const leanA = rng() * Math.PI * 2, lean = 0.3 + rng() * 0.3;
        const top = new THREE.Vector3(Math.cos(leanA) * lean, H, Math.sin(leanA) * lean);
        addTube(P.trunk, M, new THREE.Vector3(0, -0.15, 0), new THREE.Vector3(-top.x * 0.3, H * 0.5, -top.z * 0.3), top, 0.36, 0.22, q.trunkSegs, 6, 0.26, 2, 1 / 0.95, true);

        const C = new THREE.Vector3(top.x, H + 1.0, top.z);
        const Rd = 2.1 + rng() * 0.3;
        for (let i = 0; i < 5; i++) {
            const a = i / 5 * Math.PI * 2 + rng();
            const s = new THREE.Vector3().copy(top); s.y = H * (0.75 + rng() * 0.2);
            const e = new THREE.Vector3(C.x + Math.cos(a) * Rd * 0.75, C.y + 0.25, C.z + Math.sin(a) * Rd * 0.75);
            const m = new THREE.Vector3().lerpVectors(s, e, 0.5); m.y += 0.7;
            addTube(P.trunk, M, s, m, e, 0.12, 0.035, 5, 4, 0, 1, 1 / 0.95, false);
        }
        addBlob(P.core, M, C, Rd * 0.7, Rd * 0.5, Rd * 0.7);

        const tint = [0.9 + rng() * 0.2, 0.94 + rng() * 0.12, 0.8 + rng() * 0.25];
        const dir = new THREE.Vector3(), pos = new THREE.Vector3(), right = new THREE.Vector3(), sph = new THREE.Vector3();
        // Cúpula
        for (let i = 0; i < q.willowTop; i++) {
            randUnit(rng, dir); dir.y = Math.abs(dir.y) * 0.9 + 0.1; dir.normalize();
            const f = 0.7 + rng() * 0.35;
            pos.set(C.x + dir.x * Rd * f, C.y + dir.y * Rd * f * 0.7, C.z + dir.z * Rd * f);
            const h = 1.5 + rng() * 0.7, w = 1.0 + rng() * 0.45;
            const ra = rng() * Math.PI;
            right.set(Math.cos(ra), 0, Math.sin(ra));
            sph.set(dir.x * 0.7, dir.y * 0.7 + 0.5, dir.z * 0.7).normalize();
            const v = (0.78 + 0.26 * dir.y) * (0.88 + rng() * 0.24);
            pos.y -= h * 0.3;
            addCard(P.willow, M, pos, right, Y, w, h, sph, [v * tint[0], v * tint[1], v * tint[2]], rng() * 6.28, 0.9, 0.12);
        }
        // Cortina de ramas colgantes
        for (let i = 0; i < q.willowCurtain; i++) {
            const a = (i + rng()) / q.willowCurtain * Math.PI * 2;
            const rr = Rd * (0.82 + rng() * 0.32);
            const topY = C.y + 0.35 - rng() * 0.7;
            let h = 2.3 + rng() * 1.0;
            if (topY - h < 0.8) h = topY - 0.8;
            const w = 1.1 + rng() * 0.45;
            pos.set(C.x + Math.cos(a) * rr, topY - h / 2, C.z + Math.sin(a) * rr);
            const ta = a + Math.PI / 2 + (rng() - 0.5) * 1.3;
            right.set(Math.cos(ta), 0, Math.sin(ta));
            sph.set(Math.cos(a) * 0.78, 0.62, Math.sin(a) * 0.78).normalize();
            const v = 0.72 + rng() * 0.3;
            addCard(P.willow, M, pos, right, Y, w, h, sph, [v * tint[0], v * tint[1], v * tint[2]], rng() * 6.28, 1.0, 0.12);
        }
    }

    // =====================================================================
    // ENTORNO
    // =====================================================================
    function create(opts) {
        const scene = opts.scene, renderer = opts.renderer, isMobile = !!opts.isMobile;
        const rng = makeRng(20240517);
        const q = isMobile
            ? { tex: 512, grass: [256, 2.4], bark: [128, 256], leaf: 256, aniso: 4, skyOct: 3, env: false, trunkSegs: 7, oakCards: 170, pineTiers: 7, willowTop: 46, willowCurtain: 34 }
            : { tex: 1024, grass: [512, 3.0], bark: [256, 512], leaf: 256, aniso: 8, skyOct: 4, env: true, trunkSegs: 9, oakCards: 300, pineTiers: 9, willowTop: 80, willowCurtain: 56 };
        const aniso = Math.min(q.aniso, renderer.capabilities.getMaxAnisotropy());

        // ---- Color y exposición ---------------------------------------
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.9;

        // ---- Luz --------------------------------------------------------
        const sunLight = new THREE.DirectionalLight(0xfff0d8, 1.45);
        sunLight.position.set(25, 35, -20);
        sunLight.castShadow = true;
        const res = isMobile ? 1024 : 2048;
        sunLight.shadow.mapSize.set(res, res);
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 90;
        const d = 35;
        sunLight.shadow.camera.left = -d; sunLight.shadow.camera.right = d;
        sunLight.shadow.camera.top = d; sunLight.shadow.camera.bottom = -d;
        sunLight.shadow.bias = -0.0004;
        sunLight.shadow.normalBias = 0.04;
        scene.add(sunLight);

        const hemiLight = new THREE.HemisphereLight(0xcfe2ff, 0x77845a, q.env ? 0.3 : 0.55);
        scene.add(hemiLight);
        const ambientLight = new THREE.AmbientLight(0xffffff, q.env ? 0.08 : 0.16);
        scene.add(ambientLight);

        // ---- Cielo y niebla ---------------------------------------------
        const sunDir = sunLight.position.clone().normalize();
        const skyMaterial = createSkyMaterial(sunDir, q.skyOct);
        const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), skyMaterial);
        sky.name = 'bpSky';
        sky.scale.setScalar(500);
        sky.frustumCulled = false;
        sky.renderOrder = 1000;
        sky.matrixAutoUpdate = true;
        scene.add(sky);
        scene.background = SKY.horizon.clone();
        scene.fog = new THREE.FogExp2(SKY.horizon.getHex(), 0.0045);
        if (q.env) {
            try { scene.environment = buildEnvironmentMap(renderer, skyMaterial); }
            catch (e) { console.warn('BPEnv: sin mapa de entorno', e); }
        }

        // ---- Texturas y materiales --------------------------------------
        const GRASS_TILE = q.grass[1], PAVING_TILE = 3.6;
        const t0 = performance.now();
        const macro = buildMacroTexture(rng);
        const grassTex = buildGrassTextures(q.grass[0], GRASS_TILE, rng, aniso);
        const t1 = performance.now();
        const pavingTex = buildPavingTextures(q.tex, PAVING_TILE, rng, aniso);
        const t2 = performance.now();
        const barkTex = buildBarkTextures(q.bark[0], q.bark[1], rng, aniso);
        grassTex.map.repeat.set(1 / GRASS_TILE, 1 / GRASS_TILE);
        pavingTex.map.repeat.set(1 / PAVING_TILE, 1 / PAVING_TILE);

        const grassMaterial = makeGroundMaterial(grassTex, macro, {
            roughness: 0.92, normalScale: 0.9, envMapIntensity: 0.35, macroMetres: 34, blend: 0.6,
            lo: [0.72, 0.84, 0.66], hi: [1.2, 1.1, 0.98]
        });
        const pavingMaterial = makeGroundMaterial(pavingTex, macro, {
            roughness: 1.0, normalScale: 1.0, envMapIntensity: 0.5, macroMetres: 19, blend: 0,
            lo: [0.84, 0.84, 0.82], hi: [1.1, 1.08, 1.04]
        });
        const barkMaterial = new THREE.MeshStandardMaterial({
            map: barkTex.map, normalMap: barkTex.normalMap, roughness: 0.95, metalness: 0, vertexColors: true
        });
        barkMaterial.normalScale.set(1.2, 1.2);
        barkMaterial.envMapIntensity = 0.3;

        const env = {
            timings: { textures: Math.round(performance.now() - t0), grass: Math.round(t1 - t0), paving: Math.round(t2 - t1) },
            sunLight, hemiLight, ambientLight, sky,
            grassMaterial, pavingMaterial, barkMaterial,
            uvToMetres, cylinderUVToMetres,
            quality: q
        };

        // ---- Bosque -------------------------------------------------------
        env.createForest = function (defs) {
            const tf = performance.now();
            const group = new THREE.Group();
            group.name = 'bpForest';
            const P = { trunk: new GeoBuilder(), core: new GeoBuilder(), oak: new GeoBuilder(), pine: new GeoBuilder(), willow: new GeoBuilder() };
            const M = new THREE.Matrix4(), quat = new THREE.Quaternion(), sc = new THREE.Vector3(), tr = new THREE.Vector3();
            defs.forEach(t => {
                const r = makeRng((Math.round(t.x * 31 + 977) * 7919) ^ (Math.round(t.z * 17 + 613) * 104729));
                const s = 0.92 + r() * 0.3;
                quat.setFromAxisAngle(Y, r() * Math.PI * 2);
                M.compose(tr.set(t.x, 0, t.z), quat, sc.set(s, s * (0.95 + r() * 0.12), s));
                if (t.type === 'pine') buildPine(P, M, r, q);
                else if (t.type === 'willow') buildWillow(P, M, r, q);
                else buildOak(P, M, r, q);
            });

            const trunks = new THREE.Mesh(P.trunk.build(false), barkMaterial);
            trunks.castShadow = true; trunks.receiveShadow = true;
            group.add(trunks);

            const coreMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(0x244a23).convertSRGBToLinear() });
            const cores = new THREE.Mesh(P.core.build(false), coreMat);
            cores.castShadow = true;
            group.add(cores);

            const species = [
                { key: 'oak', tex: buildBroadleafTexture(q.leaf, rng, aniso), wind: 0.05, alpha: 0.42 },
                { key: 'pine', tex: buildPineTexture(q.leaf, rng, aniso), wind: 0.035, alpha: 0.36 },
                { key: 'willow', tex: buildWillowTexture(q.leaf, rng, aniso), wind: 0.11, alpha: 0.36 }
            ];
            species.forEach(sp => {
                if (!P[sp.key].count) return;
                const mat = addWind(new THREE.MeshLambertMaterial({ map: sp.tex, alphaTest: sp.alpha, vertexColors: true }), sp.wind);
                const mesh = new THREE.Mesh(P[sp.key].build(true), mat);
                mesh.customDepthMaterial = addWind(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: sp.tex, alphaTest: sp.alpha }), sp.wind);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.name = 'bpLeaves_' + sp.key;
                group.add(mesh);
            });
            scene.add(group);
            env.timings.forest = Math.round(performance.now() - tf);
            return group;
        };

        // ---- Texturas fotográficas opcionales (carga diferida) --------
        let photoSets = null, photoStarted = false, frames = 0;
        env.setPhotoTextures = function (sets) { photoSets = sets && Object.keys(sets).length ? sets : null; };

        function loadPhotoSet(name, cfg) {
            const target = { grass: grassMaterial, paving: pavingMaterial, bark: barkMaterial }[name];
            if (!target || !cfg || !cfg.color) return;
            const loader = new THREE.TextureLoader();
            const load = url => new Promise(resolve => {
                if (!url) { resolve(null); return; }
                loader.load(url, resolve, undefined, () => resolve(null));
            });
            Promise.all([load(cfg.color), load(cfg.normal), load(cfg.rough)]).then(res => {
                const color = res[0], normal = res[1], rough = res[2];
                if (!color) return;
                const size = Math.max(0.2, parseFloat(cfg.size) || 2);
                const rx = name === 'bark' ? Math.max(1, Math.round(1.9 / size)) / 2 : 1 / size;
                const ry = name === 'bark' ? 0.95 / size : 1 / size;
                [color, normal, rough].forEach((t, i) => {
                    if (!t) return;
                    t.wrapS = t.wrapT = THREE.RepeatWrapping;
                    t.anisotropy = aniso;
                    t.repeat.set(rx, ry);
                    if (i === 0) t.encoding = THREE.sRGBEncoding;
                    t.needsUpdate = true;
                });
                const old = [target.map, target.normalMap, target.roughnessMap];
                target.map = color;
                target.normalMap = normal;
                target.roughnessMap = rough;
                if (!rough) target.roughness = name === 'paving' ? 0.85 : 0.92;
                target.needsUpdate = true;
                old.forEach(t => { if (t) t.dispose(); });
            });
        }

        function startPhotoLoading() {
            if (photoStarted || !photoSets) return;
            photoStarted = true;
            Object.keys(photoSets).forEach(name => loadPhotoSet(name, photoSets[name]));
        }

        // ---- Actualización por fotograma -------------------------------
        env.update = function (time, camera) {
            timeUniform.value = time;
            skyMaterial.uniforms.uTime.value = time;
            sky.position.copy(camera.position);
            if (!photoStarted && photoSets && ++frames === 3) {
                if (global.requestIdleCallback) global.requestIdleCallback(startPhotoLoading, { timeout: 2500 });
                else setTimeout(startPhotoLoading, 600);
            }
        };

        return env;
    }

    global.BPEnv = { create: create };
})(window);
