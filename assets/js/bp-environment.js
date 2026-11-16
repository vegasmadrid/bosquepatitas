/**
 * BosquePatitas · Entorno natural
 * ---------------------------------------------------------------------------
 * Cielo, luz, césped, baldosas y árboles del bosque.
 *
 * Todo lo que hay aquí se genera en el navegador: no se descarga ninguna
 * imagen. Las texturas fotográficas opcionales (assets/textures/) se piden al
 * crear el entorno; env.ready avisa cuando están puestas.
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
            const dry = smoothstep(0.62, 0.86, n2[i]) * 0.14;
            let r = 20 + a * 20, g = 52 + a * 40, b = 18 + a * 14;
            r += (104 - r) * dry; g += (112 - g) * dry; b += (48 - b) * dry;
            d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = 255;
        }
        sctx.putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(small, 0, 0, size, size);

        // Briznas: trazos curvos agrupados por color (de oscuro a claro, las claras quedan encima)
        const palette = ['#1c451b', '#22511e', '#285e22', '#2f6b26', '#37782a', '#40852f', '#4b9135', '#589d3c', '#67a845'];
        const weights = [0.10, 0.13, 0.16, 0.17, 0.16, 0.12, 0.08, 0.05, 0.03];
        const total = Math.round(size * size / (24 * k * k));
        ctx.lineCap = 'round';
        for (let c = 0; c < palette.length; c++) {
            const path = new Path2D();
            const n = Math.round(total * weights[c]);
            for (let i = 0; i < n; i++) {
                const x = rng() * size, y = rng() * size;
                const len = (10 + rng() * 20) * k;
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
            ctx.lineWidth = Math.max(1, (1.45 + c * 0.12) * k);
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
    const COBBLE_STYLE = {
        rows: 16, wMin: 0.22, wMax: 0.46, joint: 0.016, jointColor: '#2f2b25', moss: 0.9, lichen: 0.28, pits: 0.9,
        colors: [[128, 125, 118], [114, 112, 106], [137, 130, 119], [105, 105, 103], [124, 116, 103], [118, 121, 123]]
    };
    // Losas grandes de piedra clara para la plaza central
    const FLAGSTONE_STYLE = {
        rows: 8, wMin: 0.5, wMax: 0.95, joint: 0.013, jointColor: '#4d473c', moss: 0.5, lichen: 0.1, pits: 0.5,
        colors: [[196, 187, 168], [184, 177, 160], [203, 195, 178], [176, 170, 157], [190, 180, 160], [181, 180, 172]]
    };

    function buildPavingTextures(size, tileMetres, rng, aniso, style) {
        style = style || COBBLE_STYLE;
        const ppm = size / tileMetres;
        const k = ppm / 284;
        const rows = style.rows, rowH = size / rows;
        const alb = makeCanvas(size, size), msk = makeCanvas(size, size);
        const a = alb.getContext('2d', { willReadFrequently: true });
        const m = msk.getContext('2d', { willReadFrequently: true });
        a.fillStyle = style.jointColor; a.fillRect(0, 0, size, size);
        m.fillStyle = '#000'; m.fillRect(0, 0, size, size);

        const stoneColors = style.colors;
        const joint = Math.max(1.5, style.joint * ppm);

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
                let w = (style.wMin + rng() * (style.wMax - style.wMin)) * ppm;
                const remaining = start + size - x;
                if (remaining - w < style.wMin * 0.9 * ppm) w = remaining;
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
            if (f > 0.8) hh -= (f - 0.8) * style.pits * e;       // picaduras
            hgt[i] = hh;

            const shade = (0.8 + 0.38 * f) * (0.88 + 0.24 * tone[h2]) * (0.5 + 0.5 * e);
            let r = ap[p] * shade, g = ap[p + 1] * shade, b = ap[p + 2] * shade;
            const mossy = (1 - e) * smoothstep(0.42, 0.66, moss[h2]) * style.moss;   // musgo en las juntas
            r += (58 - r) * mossy; g += (80 - g) * mossy; b += (38 - b) * mossy;
            const lichen = e * smoothstep(0.7, 0.88, moss[h2]) * style.lichen;       // liquen sobre la piedra
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
        mat.userData.bpUniforms = uniforms;
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
                    '    float bpM = 0.62 * texture2D( uBpMacro, vBpUv * uBpMacroScale ).r + 0.38 * texture2D( uBpMacro, vBpUv * uBpMacroScale * 0.173 + vec2( 0.31, 0.57 ) ).r;',
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
    // MOBILIARIO: PIEDRA, MADERA Y HIERRO FORJADO
    // =====================================================================
    function buildStoneTexture(size, rng, aniso) {
        const a = fbmField(size, size, 4, 4, 5, rng, 0.55);
        const b = fbmField(size, size, 24, 24, 3, rng, 0.6);
        const color = new Uint8Array(size * size * 4);
        const hgt = new Float32Array(size * size);
        for (let i = 0, p = 0; i < a.length; i++, p += 4) {
            const v = 0.8 + 0.32 * a[i] + 0.16 * (b[i] - 0.5);
            const stain = smoothstep(0.42, 0.2, a[i]) * 0.18;        // manchas de humedad y verdín
            let r = 158 * v, g = 152 * v, bl = 139 * v;
            r += (92 - r) * stain; g += (104 - g) * stain; bl += (84 - bl) * stain;
            color[p] = r; color[p + 1] = g; color[p + 2] = bl; color[p + 3] = 255;
            hgt[i] = b[i] * 0.6 + a[i] * 0.4;
        }
        return {
            map: dataTexture(color, size, size, true, aniso),
            normalMap: dataTexture(normalFromHeight(hgt, size, size, 2.4), size, size, false, aniso)
        };
    }

    function buildWoodTexture(rng, aniso) {
        const w = 256, h = 64;
        const grain = fbmField(w, h, 2, 16, 3, rng, 0.6);
        const tone = fbmField(w, h, 2, 2, 2, rng, 0.5);
        const color = new Uint8Array(w * h * 4);
        for (let i = 0, p = 0; i < grain.length; i++, p += 4) {
            const g = grain[i] * 6;
            const ring = 1 - Math.abs(2 * (g - Math.floor(g)) - 1);
            const v = 0.7 + 0.22 * tone[i] + 0.2 * ring - (grain[i] > 0.72 ? 0.16 : 0);
            color[p] = 146 * v; color[p + 1] = 96 * v; color[p + 2] = 54 * v; color[p + 3] = 255;
        }
        return dataTexture(color, w, h, true, aniso);
    }

    // Tierra árida: arena compacta con manchas de tierra seca, ondas de viento y guijarros
    function buildSandTextures(size, rng, aniso) {
        const a = fbmField(size, size, 3, 3, 5, rng, 0.55);
        const b = fbmField(size, size, 28, 28, 3, rng, 0.6);
        const color = new Uint8Array(size * size * 4);
        const hgt = new Float32Array(size * size);
        const TAU = Math.PI * 2;
        for (let y = 0, i = 0, p = 0; y < size; y++) {
            for (let x = 0; x < size; x++, i++, p += 4) {
                const ripple = 0.5 + 0.5 * Math.sin((x * 11 + y * 4) / size * TAU + a[i] * 7);
                const dry = smoothstep(0.46, 0.3, a[i]) * 0.45;
                const v = 0.84 + 0.26 * a[i] + 0.1 * (b[i] - 0.5) + 0.05 * ripple;
                let r = 203 * v, g = 173 * v, bl = 128 * v;
                r += (160 * v - r) * dry; g += (124 * v - g) * dry; bl += (88 * v - bl) * dry;
                const pebble = smoothstep(0.86, 0.9, b[i]) * 0.7;
                r += (118 - r) * pebble; g += (104 - g) * pebble; bl += (90 - bl) * pebble;
                color[p] = r; color[p + 1] = g; color[p + 2] = bl; color[p + 3] = 255;
                hgt[i] = a[i] * 0.45 + ripple * 0.12 + b[i] * 0.25 + pebble * 0.3;
            }
        }
        return {
            map: dataTexture(color, size, size, true, aniso),
            normalMap: dataTexture(normalFromHeight(hgt, size, size, 3.2), size, size, false, aniso),
            roughnessMap: null
        };
    }

    function buildWaterNormal(rng, aniso) {
        const s = 256;
        const h = fbmField(s, s, 6, 6, 4, rng, 0.55);
        return dataTexture(normalFromHeight(h, s, s, 5.0), s, s, false, aniso);
    }

    // Hilos de agua: trazos verticales con transparencia, enlosables en vertical
    function buildStreakTexture(rng) {
        const w = 128, h = 128, c = makeCanvas(w, h), ctx = c.getContext('2d');
        ctx.lineCap = 'round';
        for (let i = 0; i < 46; i++) {
            const x = rng() * w, y = rng() * h, len = 30 + rng() * 80;
            ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 + rng() * 0.6).toFixed(2) + ')';
            ctx.lineWidth = 1 + rng() * 3.5;
            for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x, y + k * h); ctx.lineTo(x + (rng() - 0.5) * 2, y + len + k * h); ctx.stroke(); }
        }
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        return t;
    }

    function buildFoamTexture(rng) {
        const s = 128, c = makeCanvas(s, s), ctx = c.getContext('2d');
        for (let i = 0; i < 520; i++) {
            const an = rng() * Math.PI * 2, rad = (0.3 + rng() * 0.2) * s;
            ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + rng() * 0.6).toFixed(2) + ')';
            ctx.beginPath(); ctx.arc(s / 2 + Math.cos(an) * rad, s / 2 + Math.sin(an) * rad, 0.8 + rng() * 2.6, 0, Math.PI * 2); ctx.fill();
        }
        return new THREE.CanvasTexture(c);
    }

    // Fusiona geometrías sueltas en una sola malla (una llamada de dibujo).
    function StaticBuilder() { this.pos = []; this.nor = []; this.uv = []; }
    const _sv = new THREE.Vector3(), _sn = new THREE.Vector3(), _nm = new THREE.Matrix3();
    StaticBuilder.prototype.add = function (geometry, matrix) {
        const g = geometry.index ? geometry.toNonIndexed() : geometry;
        const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
        _nm.getNormalMatrix(matrix);
        const flip = matrix.determinant() < 0;
        for (let t = 0; t < p.count; t += 3) {
            for (let c = 0; c < 3; c++) {
                const i = t + (flip ? 2 - c : c);
                _sv.fromBufferAttribute(p, i).applyMatrix4(matrix);
                _sn.fromBufferAttribute(n, i).applyMatrix3(_nm).normalize();
                this.pos.push(_sv.x, _sv.y, _sv.z);
                this.nor.push(_sn.x, _sn.y, _sn.z);
                this.uv.push(u ? u.getX(i) : 0, u ? u.getY(i) : 0);
            }
        }
        if (g !== geometry) g.dispose();
        geometry.dispose();
        return this;
    };
    // worldUv: si se indica, las UV se proyectan en metros según la cara (sin estirar la textura)
    StaticBuilder.prototype.build = function (worldUv) {
        if (worldUv) {
            for (let i = 0, j = 0; i < this.pos.length; i += 3, j += 2) {
                const ax = Math.abs(this.nor[i]), ay = Math.abs(this.nor[i + 1]), az = Math.abs(this.nor[i + 2]);
                const x = this.pos[i], y = this.pos[i + 1], z = this.pos[i + 2];
                if (ay >= ax && ay >= az) { this.uv[j] = x * worldUv; this.uv[j + 1] = z * worldUv; }
                else if (ax >= az) { this.uv[j] = z * worldUv; this.uv[j + 1] = y * worldUv; }
                else { this.uv[j] = x * worldUv; this.uv[j + 1] = y * worldUv; }
            }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
        g.computeBoundingSphere();
        g.computeBoundingBox();
        return g;
    };

    const _mq = new THREE.Quaternion(), _me = new THREE.Euler(), _mp = new THREE.Vector3(), _ms = new THREE.Vector3();
    // Matriz parent · T(x,y,z) · R(rx,ry,rz) · S(sx,sy,sz)
    function xf(parent, x, y, z, rx, ry, rz, sx, sy, sz) {
        _mq.setFromEuler(_me.set(rx || 0, ry || 0, rz || 0));
        const m = new THREE.Matrix4().compose(_mp.set(x, y, z), _mq, _ms.set(sx === undefined ? 1 : sx, sy === undefined ? 1 : sy, sz === undefined ? 1 : sz));
        return parent ? m.premultiply(parent) : m;
    }

    // Barra recta entre dos puntos
    function addBar(B, parent, ax, ay, az, bx, by, bz, thick) {
        const dir = new THREE.Vector3(bx - ax, by - ay, bz - az), len = dir.length();
        dir.normalize();
        _mq.setFromUnitVectors(Y, dir);
        const m = new THREE.Matrix4().compose(_mp.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2), _mq, _ms.set(1, 1, 1));
        B.add(new THREE.BoxGeometry(thick, len, thick), parent ? m.premultiply(parent) : m);
    }

    // Perfil torneado alrededor del eje vertical, con las caras hacia fuera
    // check: índice de un punto del perfil cuya cara mira hacia fuera (por defecto, el central)
    function latheGeometry(profile, segments, check) {
        let pts = profile.map(p => new THREE.Vector2(p[0], p[1]));
        let g = new THREE.LatheGeometry(pts, segments);
        const mid = check === undefined ? Math.floor(pts.length / 2) : check;
        const px = g.attributes.position.getX(mid), nx = g.attributes.normal.getX(mid);
        const pz = g.attributes.position.getZ(mid), nz = g.attributes.normal.getZ(mid);
        if (px * nx + pz * nz < 0) {
            g.dispose();
            g = new THREE.LatheGeometry(pts.reverse(), segments);
        }
        return g;
    }

    // Pletina curva de fundición (perfil 2D en el plano fondo-altura, con grosor)
    function ribbonGeometry(points, width, depth) {
        const curve = new THREE.SplineCurve(points.map(p => new THREE.Vector2(p[0], p[1])));
        const P = curve.getPoints(Math.max(1, (points.length - 1) * 5));
        const left = [], right = [];
        for (let i = 0; i < P.length; i++) {
            const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
            let tx = b.x - a.x, ty = b.y - a.y;
            const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
            left.push(new THREE.Vector2(P[i].x - ty * width / 2, P[i].y + tx * width / 2));
            right.push(new THREE.Vector2(P[i].x + ty * width / 2, P[i].y - tx * width / 2));
        }
        const g = new THREE.ExtrudeGeometry(new THREE.Shape(left.concat(right.reverse())), { depth: depth, bevelEnabled: false, curveSegments: 1 });
        g.translate(0, 0, -depth / 2);
        return g;
    }

    function noRaycast(obj) {
        obj.traverse(o => { if (o.isMesh) o.raycast = function () {}; });
        return obj;
    }

    // ---- Farola victoriana -------------------------------------------
    function buildLampGeometries(seg) {
        const iron = new StaticBuilder(), glass = new StaticBuilder(), gold = new StaticBuilder();
        const S2 = Math.SQRT2, Q = Math.PI / 4;
        // Columna torneada: zócalo, basa con molduras, fuste ahusado y capitel
        iron.add(latheGeometry([
            [0.001, 0], [0.30, 0], [0.30, 0.07], [0.25, 0.10], [0.25, 0.22], [0.21, 0.26], [0.17, 0.52],
            [0.20, 0.56], [0.20, 0.61], [0.12, 0.67], [0.095, 0.92], [0.12, 0.96], [0.12, 1.01], [0.08, 1.05],
            [0.058, 2.72], [0.085, 2.75], [0.085, 2.81], [0.058, 2.85], [0.052, 3.00], [0.105, 3.07], [0.105, 3.10], [0.001, 3.12]
        ], seg), xf(null, 0, 0, 0));
        // Brazos de escalera con bolas
        iron.add(new THREE.CylinderGeometry(0.016, 0.016, 0.58, 6), xf(null, 0, 2.78, 0, 0, 0, Math.PI / 2));
        iron.add(new THREE.SphereGeometry(0.032, 8, 6), xf(null, -0.29, 2.78, 0));
        iron.add(new THREE.SphereGeometry(0.032, 8, 6), xf(null, 0.29, 2.78, 0));
        // Farol: base, cristal en tronco de pirámide, montantes, cornisa, tejadillo y chimenea
        const y0 = 3.15, y1 = 3.61, h0 = 0.10, h1 = 0.19;
        iron.add(new THREE.CylinderGeometry(h0 * S2 * 1.06, h0 * S2 * 0.7, 0.05, 4), xf(null, 0, y0 - 0.025, 0, 0, Q, 0));
        glass.add(new THREE.CylinderGeometry(h1 * S2 * 0.97, h0 * S2 * 0.97, y1 - y0, 4, 1, true), xf(null, 0, (y0 + y1) / 2, 0, 0, Q, 0));
        for (let sx = -1; sx <= 1; sx += 2) {
            for (let sz = -1; sz <= 1; sz += 2) addBar(iron, null, sx * h0, y0, sz * h0, sx * h1, y1, sz * h1, 0.022);
            addBar(iron, null, -h1 - 0.012, y1, sx * h1, h1 + 0.012, y1, sx * h1, 0.03);
            addBar(iron, null, sx * h1, y1, -h1 - 0.012, sx * h1, y1, h1 + 0.012, 0.03);
        }
        iron.add(new THREE.CylinderGeometry(0.06 * S2, 0.245 * S2, 0.2, 4), xf(null, 0, y1 + 0.115, 0, 0, Q, 0));
        iron.add(new THREE.CylinderGeometry(0.055, 0.06, 0.09, 8), xf(null, 0, y1 + 0.26, 0));
        iron.add(new THREE.ConeGeometry(0.1, 0.07, 8), xf(null, 0, y1 + 0.34, 0));
        gold.add(new THREE.SphereGeometry(0.03, 8, 6), xf(null, 0, y1 + 0.4, 0));
        gold.add(new THREE.ConeGeometry(0.015, 0.11, 6), xf(null, 0, y1 + 0.475, 0));
        return { iron: iron.build(), glass: glass.build(), gold: gold.build() };
    }

    // ---- Banco de parque: laterales de fundición y listones de madera --
    function buildBenchGeometries() {
        const iron = new StaticBuilder(), wood = new StaticBuilder();
        const SIDE = 0.74, T = 0.04, R = -Math.PI / 2;
        for (let s = -1; s <= 1; s += 2) {
            const P = xf(null, s * SIDE, 0, 0, 0, R, 0);   // perfil (fondo, altura) -> plano lateral del banco
            iron.add(ribbonGeometry([[-0.30, 0.0], [-0.27, 0.18], [-0.225, 0.40], [-0.25, 0.56], [-0.31, 0.78], [-0.365, 0.95]], 0.042, T), P);
            iron.add(ribbonGeometry([[0.31, 0.0], [0.255, 0.14], [0.235, 0.30], [0.26, 0.43], [0.285, 0.52], [0.27, 0.61]], 0.042, T), P);
            iron.add(ribbonGeometry([[0.30, 0.60], [0.22, 0.645], [0.0, 0.655], [-0.27, 0.665]], 0.045, T * 1.3), P);
            iron.add(ribbonGeometry([[0.265, 0.425], [0.05, 0.405], [-0.225, 0.395]], 0.04, T), P);
            iron.add(ribbonGeometry([[0.245, 0.2], [-0.265, 0.2]], 0.034, T), P);
            iron.add(new THREE.TorusGeometry(0.083, 0.014, 5, 14), xf(P, -0.01, 0.30, 0));
            iron.add(new THREE.TorusGeometry(0.04, 0.016, 5, 10), xf(P, 0.315, 0.565, 0));
            iron.add(new THREE.TorusGeometry(0.034, 0.015, 5, 10), xf(P, -0.395, 0.965, 0));
            iron.add(new THREE.BoxGeometry(0.09, 0.025, T * 1.6), xf(P, 0.315, 0.0125, 0));
            iron.add(new THREE.BoxGeometry(0.09, 0.025, T * 1.6), xf(P, -0.305, 0.0125, 0));
        }
        iron.add(new THREE.CylinderGeometry(0.012, 0.012, SIDE * 2, 6), xf(null, 0, 0.2, 0, 0, 0, Math.PI / 2));
        // Asiento: listones con ligera caída hacia atrás y borde delantero redondeado
        const L = 1.6;
        wood.add(new THREE.BoxGeometry(L, 0.024, 0.062), xf(null, 0, 0.452, 0.268, 0.4, 0, 0));
        for (let i = 0; i < 6; i++) {
            const z = 0.2 - i * 0.078;
            wood.add(new THREE.BoxGeometry(L, 0.024, 0.064), xf(null, 0, 0.452 + 0.08 * z, z, -0.08, 0, 0));
        }
        // Respaldo inclinado, con el listón superior más ancho
        const lean = -0.27;
        [0.555, 0.645, 0.735, 0.825].forEach(y => {
            wood.add(new THREE.BoxGeometry(L, 0.07, 0.022), xf(null, 0, y, -0.19 - (y - 0.44) * 0.2755, lean, 0, 0));
        });
        wood.add(new THREE.BoxGeometry(L, 0.09, 0.028), xf(null, 0, 0.918, -0.19 - (0.918 - 0.44) * 0.2755, lean, 0, 0));
        return { iron: iron.build(), wood: wood.build() };
    }

    // ---- Verja victoriana ------------------------------------------------
    // Pilar de sillería con zócalo, cornisa, remate piramidal y bola
    function addPier(B, parent, x, z, s) {
        const P = xf(parent, x, 0, z, 0, 0, 0, s, s * (s > 1 ? 1.04 : 1), s);
        B.add(new THREE.BoxGeometry(0.68, 0.28, 0.68), xf(P, 0, 0.14, 0));
        B.add(new THREE.BoxGeometry(0.58, 0.07, 0.58), xf(P, 0, 0.315, 0));
        B.add(new THREE.BoxGeometry(0.5, 2.08, 0.5), xf(P, 0, 1.39, 0));
        B.add(new THREE.BoxGeometry(0.56, 0.07, 0.56), xf(P, 0, 2.465, 0));
        B.add(new THREE.BoxGeometry(0.68, 0.1, 0.68), xf(P, 0, 2.55, 0));
        B.add(new THREE.CylinderGeometry(0.11, 0.47, 0.26, 4), xf(P, 0, 2.73, 0, 0, Math.PI / 4, 0));
        B.add(new THREE.CylinderGeometry(0.06, 0.075, 0.07, 8), xf(P, 0, 2.895, 0));
        B.add(new THREE.SphereGeometry(0.125, 10, 8), xf(P, 0, 3.04, 0));
    }

    function buildFenceSide(o, q) {
        const limit = o.limit, halfGate = o.gateWidth / 2, step = o.step;
        const iron = new StaticBuilder(), stone = new StaticBuilder(), gold = new StaticBuilder();
        const bars = [], dogs = [], rings = [];
        const SP = 0.18, Q = Math.PI / 4;

        // Tramo de reja entre x = a y x = b, en el marco local "frame" (eje X a lo largo de la reja)
        function ironPanel(frame, a, b, base) {
            const len = b - a, mid = (a + b) / 2;
            [[0.44, 0.04, 0.026], [0.98, 0.03, 0.02], [1.52, 0.03, 0.02], [1.72, 0.045, 0.03]].forEach(r => {
                iron.add(new THREE.BoxGeometry(len, r[1], r[2]), xf(frame, mid, r[0] + base, 0));
            });
            const n = Math.max(1, Math.round(len / SP)), sp = len / n;
            for (let i = 0; i < n; i++) {
                bars.push(xf(frame, a + sp * (i + 0.5), base, 0, 0, 0, 0, 1, i % 2 ? 0.965 : 1, 1));
                if (i > 0) {
                    dogs.push(xf(frame, a + sp * i, base, 0));
                    if (q.fenceRings && (q.fenceRings === 1 || i % 2)) rings.push(xf(frame, a + sp * i, 1.62 + base, 0));
                }
            }
        }

        // Paño completo: murete de piedra con albardilla y reja encima
        function panel(x0, x1, inset0, inset1) {
            const a = x0 + inset0, b = x1 - inset1, len = b - a, mid = (a + b) / 2;
            const F = xf(null, 0, 0, limit);
            stone.add(new THREE.BoxGeometry(len + 0.04, 0.3, 0.3), xf(F, mid, 0.15, 0));
            stone.add(new THREE.BoxGeometry(len + 0.04, 0.05, 0.38), xf(F, mid, 0.325, 0));
            ironPanel(F, a, b, 0);
        }

        const xs = [];
        for (let x = halfGate; x < limit - 0.5; x += step) xs.push(x);
        xs.push(limit);
        for (let i = 0; i < xs.length; i++) {
            const gate = i === 0, corner = i === xs.length - 1;
            addPier(stone, null, xs[i], limit, gate ? 1.2 : 1);
            if (!corner) addPier(stone, null, -xs[i], limit, gate ? 1.2 : 1);   // la esquina opuesta la pone el lado vecino
            if (i > 0) {
                const i0 = i === 1 ? 0.31 : 0.26;
                panel(xs[i - 1], xs[i], i0, 0.26);
                panel(-xs[i], -xs[i - 1], 0.26, i0);
            }
        }

        // Puerta: arco doble con aros, dintel y remate dorado
        const G = xf(null, 0, 0, limit);
        const AY = 3.25;
        iron.add(new THREE.TorusGeometry(halfGate, 0.04, 6, 28, Math.PI), xf(G, 0, AY, 0));
        iron.add(new THREE.TorusGeometry(halfGate - 0.3, 0.03, 6, 24, Math.PI), xf(G, 0, AY, 0));
        iron.add(new THREE.BoxGeometry(halfGate * 2, 0.05, 0.04), xf(G, 0, AY, 0));
        for (let i = 1; i < 12; i++) {
            const an = i / 12 * Math.PI, rr = halfGate - 0.15;
            iron.add(new THREE.TorusGeometry(0.105, 0.012, 4, 10), xf(G, Math.cos(an) * rr, AY + Math.sin(an) * rr, 0));
        }
        addBar(iron, G, 0, AY, 0, 0, AY + halfGate - 0.3, 0, 0.03);
        iron.add(new THREE.TorusGeometry(0.32, 0.016, 4, 14), xf(G, 0, AY + 0.62, 0));
        gold.add(new THREE.OctahedronGeometry(0.13), xf(G, 0, AY + halfGate + 0.24, 0, 0, 0, 0, 0.75, 1.9, 0.75));
        gold.add(new THREE.SphereGeometry(0.075, 8, 6), xf(G, 0, AY + halfGate + 0.04, 0));
        // Hojas abiertas hacia dentro
        for (let s = -1; s <= 1; s += 2) {
            const W = halfGate - 0.36;
            const Lf = xf(G, s * (halfGate - 0.32), 0, 0, 0, s > 0 ? Math.PI - Math.PI / 3.5 : Math.PI / 3.5, 0);
            addBar(iron, Lf, 0.03, 0.08, 0, 0.03, 2.02, 0, 0.045);
            addBar(iron, Lf, W, 0.08, 0, W, 2.02, 0, 0.045);
            ironPanel(Lf, 0.05, W - 0.02, -0.2);
            gold.add(new THREE.SphereGeometry(0.045, 8, 6), xf(Lf, 0.03, 2.06, 0));
            gold.add(new THREE.SphereGeometry(0.045, 8, 6), xf(Lf, W, 2.06, 0));
        }

        // Piezas repetidas (se dibujan instanciadas): barrote con lanza, barrote corto y aro
        const bar = new StaticBuilder();
        bar.add(new THREE.CylinderGeometry(0.0145, 0.0145, 1.66, 4, 1, true), xf(null, 0, 1.155, 0, 0, Q, 0));
        if (!q.fenceSimple) bar.add(new THREE.OctahedronGeometry(0.03), xf(null, 0, 1.995, 0, 0, Q, 0, 1, 0.7, 1));
        bar.add(new THREE.CylinderGeometry(0.032, 0.012, 0.06, 4, 1, true), xf(null, 0, 2.04, 0, 0, Q, 0));
        bar.add(new THREE.ConeGeometry(0.032, 0.2, 4, 1, true), xf(null, 0, 2.17, 0, 0, Q, 0));
        const dog = new StaticBuilder();
        dog.add(new THREE.CylinderGeometry(0.011, 0.011, 0.66, 4, 1, true), xf(null, 0, 0.655, 0, 0, Q, 0));
        dog.add(new THREE.ConeGeometry(0.02, 0.1, 4, 1, true), xf(null, 0, 1.04, 0, 0, Q, 0));
        const ring = new THREE.TorusGeometry(0.07, 0.008, 3, 8);

        return {
            iron: iron.build(), stone: stone.build(0.8), gold: gold.build(),
            bar: bar.build(), dog: dog.build(), ring: ring,
            bars: bars, dogs: q.fenceSimple ? [] : dogs, rings: rings
        };
    }

    // =====================================================================
    // ENTORNO
    // =====================================================================
    function create(opts) {
        const scene = opts.scene, renderer = opts.renderer, isMobile = !!opts.isMobile;
        const photoSets = opts.photoTextures && Object.keys(opts.photoTextures).length ? opts.photoTextures : null;
        const hasPhoto = name => !!(photoSets && photoSets[name] && photoSets[name].color);
        const rng = makeRng(20240517);
        const q = isMobile
            ? { tex: 512, grass: [256, 2.4], bark: [128, 256], leaf: 256, aniso: 4, skyOct: 3, env: false, flag: 256, stone: 128, lampSegs: 8, fenceRings: 0, fenceSimple: true, trunkSegs: 7, oakCards: 170, pineTiers: 7, willowTop: 46, willowCurtain: 34 }
            : { tex: 1024, grass: [512, 3.0], bark: [256, 512], leaf: 256, aniso: 8, skyOct: 4, env: true, flag: 512, stone: 256, lampSegs: 12, fenceRings: 1, fenceSimple: false, trunkSegs: 9, oakCards: 300, pineTiers: 9, willowTop: 80, willowCurtain: 56 };
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
        sky.raycast = function () {};
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
        // Si hay textura fotográfica en camino, la procedural solo hace de marcador y se genera pequeña
        const grassTex = buildGrassTextures(hasPhoto('grass') ? 256 : q.grass[0], GRASS_TILE, rng, aniso);
        const t1 = performance.now();
        const pavingTex = buildPavingTextures(hasPhoto('paving') ? 256 : q.tex, PAVING_TILE, rng, aniso);
        const t2 = performance.now();
        const barkTex = hasPhoto('bark') ? buildBarkTextures(64, 128, rng, aniso) : buildBarkTextures(q.bark[0], q.bark[1], rng, aniso);
        const FLAG_TILE = 3.0;
        const flagTex = buildPavingTextures(q.flag, FLAG_TILE, rng, aniso, FLAGSTONE_STYLE);
        flagTex.map.repeat.set(1 / FLAG_TILE, 1 / FLAG_TILE);
        const stoneTex = buildStoneTexture(q.stone, rng, aniso);
        const SAND_TILE = 7.0;
        const sandTex = buildSandTextures(isMobile ? 256 : 512, rng, aniso);
        sandTex.map.repeat.set(1 / SAND_TILE, 1 / SAND_TILE);
        const woodTex = buildWoodTexture(rng, aniso);
        grassTex.map.repeat.set(1 / GRASS_TILE, 1 / GRASS_TILE);
        pavingTex.map.repeat.set(1 / PAVING_TILE, 1 / PAVING_TILE);

        const grassMaterial = makeGroundMaterial(grassTex, macro, {
            roughness: 0.92, normalScale: 0.9, envMapIntensity: 0.35, macroMetres: 34, blend: 0.6,
            lo: [0.7, 0.82, 0.68], hi: [1.0, 1.06, 0.9]
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

        const flagMaterial = makeGroundMaterial(flagTex, macro, {
            roughness: 1.0, normalScale: 0.9, envMapIntensity: 0.45, macroMetres: 11, blend: 0,
            lo: [0.9, 0.9, 0.88], hi: [1.06, 1.05, 1.02]
        });
        const stoneMaterial = new THREE.MeshStandardMaterial({ map: stoneTex.map, normalMap: stoneTex.normalMap, roughness: 0.92, metalness: 0 });
        stoneMaterial.envMapIntensity = 0.4;
        const sandMaterial = makeGroundMaterial(sandTex, macro, {
            roughness: 0.96, normalScale: 0.8, envMapIntensity: 0.3, macroMetres: 70, blend: 0.5,
            lo: [0.78, 0.74, 0.68], hi: [1.1, 1.06, 1.0]
        });
        const rockMaterial = new THREE.MeshStandardMaterial({
            map: stoneTex.map, normalMap: stoneTex.normalMap, color: new THREE.Color(0xdcbc92).convertSRGBToLinear(), roughness: 0.95, metalness: 0
        });
        rockMaterial.envMapIntensity = 0.3;
        const woodMaterial = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.62, metalness: 0 });
        woodMaterial.envMapIntensity = 0.5;
        // Hierro pintado de negro: poco metálico, con el brillo satinado de la pintura
        const ironMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(0x202427).convertSRGBToLinear(), roughness: 0.5, metalness: 0.15 });
        ironMaterial.envMapIntensity = 0.55;
        const goldMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(0xd2aa3a).convertSRGBToLinear(), roughness: 0.32, metalness: 0.75 });
        const lampGlassMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0xfff0cf).convertSRGBToLinear(), emissive: new THREE.Color(0xffc56e).convertSRGBToLinear(),
            emissiveIntensity: 0.7, roughness: 0.25, metalness: 0
        });

        const env = {
            timings: { textures: Math.round(performance.now() - t0), grass: Math.round(t1 - t0), paving: Math.round(t2 - t1) },
            sunLight, hemiLight, ambientLight, sky,
            grassMaterial, pavingMaterial, barkMaterial, flagMaterial, stoneMaterial,
            uvToMetres, cylinderUVToMetres,
            quality: q
        };

        // ---- Bosque -------------------------------------------------------
        let forestMats = null;
        function getForestMaterials() {
            if (forestMats) return forestMats;
            forestMats = { core: new THREE.MeshLambertMaterial({ color: new THREE.Color(0x244a23).convertSRGBToLinear() }), species: [] };
            [
                { key: 'oak', tex: buildBroadleafTexture(q.leaf, rng, aniso), wind: 0.05, alpha: 0.42 },
                { key: 'pine', tex: buildPineTexture(q.leaf, rng, aniso), wind: 0.035, alpha: 0.36 },
                { key: 'willow', tex: buildWillowTexture(q.leaf, rng, aniso), wind: 0.11, alpha: 0.36 }
            ].forEach(sp => {
                forestMats.species.push({
                    key: sp.key,
                    material: addWind(new THREE.MeshLambertMaterial({ map: sp.tex, alphaTest: sp.alpha, vertexColors: true }), sp.wind),
                    depth: addWind(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: sp.tex, alphaTest: sp.alpha }), sp.wind)
                });
            });
            return forestMats;
        }

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

            const mats = getForestMaterials();
            const trunks = new THREE.Mesh(P.trunk.build(false), barkMaterial);
            trunks.castShadow = true; trunks.receiveShadow = true;
            group.add(trunks);
            const cores = new THREE.Mesh(P.core.build(false), mats.core);
            cores.castShadow = true;
            group.add(cores);
            mats.species.forEach(sp => {
                if (!P[sp.key].count) return;
                const mesh = new THREE.Mesh(P[sp.key].build(true), sp.material);
                mesh.customDepthMaterial = sp.depth;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.name = 'bpLeaves_' + sp.key;
                group.add(mesh);
            });
            noRaycast(group);
            scene.add(group);
            env.timings.forest = Math.round(performance.now() - tf);
            return group;
        };

        // ---- Exterior: llanura árida, rocas, matorral seco y montañas ----
        // El recinto queda como un oasis verde. o.inner = media anchura del césped.
        env.createSurroundings = function (o) {
            const tf = performance.now();
            const r = makeRng(771133);
            const group = new THREE.Group();
            group.name = 'bpSurroundings';

            // Llanura hasta el horizonte (la niebla la funde con el cielo)
            const SIZE = 1400;
            const terrain = new THREE.Mesh(uvToMetres(new THREE.PlaneGeometry(SIZE, SIZE), SIZE, SIZE), sandMaterial);
            terrain.rotation.x = -Math.PI / 2;
            terrain.position.y = -0.03;
            terrain.receiveShadow = true;
            group.add(terrain);

            function scatter(count, near, far, minGap) {
                const out = [];
                let guard = 0;
                while (out.length < count && guard++ < 8000) {
                    const x = (r() * 2 - 1) * far, z = (r() * 2 - 1) * far;
                    const d = Math.max(Math.abs(x), Math.abs(z));
                    if (d < near || Math.abs(x) < 3.2 || Math.abs(z) < 3.2) continue;
                    if (r() > Math.exp(-(d - near) / 55)) continue;
                    let ok = true;
                    for (let i = 0; i < out.length && ok; i++) {
                        const dx = out[i].x - x, dz = out[i].z - z;
                        if (dx * dx + dz * dz < minGap * minGap) ok = false;
                    }
                    if (ok) out.push({ x, z });
                }
                return out;
            }
            const blobs = [];

            // Rocas
            const rocks = new StaticBuilder();
            scatter(isMobile ? 36 : 70, o.inner + 2.5, 150, 3).forEach(p => {
                const n = 1 + Math.floor(r() * 2.4);
                for (let k = 0; k < n; k++) {
                    const s = (0.35 + r() * r() * 2.1) * (k ? 0.55 : 1);
                    const g = new THREE.IcosahedronGeometry(1, 1);
                    const pos = g.attributes.position, seed = r() * 50;
                    for (let i = 0; i < pos.count; i++) {
                        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
                        const j = 0.8 + 0.4 * (0.5 + 0.5 * Math.sin(x * 5.1 + seed) * Math.sin(y * 4.3 + seed * 1.7) * Math.sin(z * 6.2 + seed * 0.6));
                        pos.setXYZ(i, x * j, y * j, z * j);
                    }
                    g.computeVertexNormals();
                    const ox = k ? (r() - 0.5) * 2.4 : 0, oz = k ? (r() - 0.5) * 2.4 : 0;
                    rocks.add(g, xf(null, p.x + ox, s * 0.18, p.z + oz, r() * 0.5, r() * 6.28, r() * 0.5, s, s * (0.5 + r() * 0.3), s * (0.7 + r() * 0.4)));
                    blobs.push({ x: p.x + ox, z: p.z + oz, len: s * 1.5, wid: s * 1.1 });
                }
            });
            const rockMesh = new THREE.Mesh(rocks.build(0.5), rockMaterial);
            rockMesh.receiveShadow = true;
            group.add(rockMesh);

            // Matorral seco
            const B = new GeoBuilder(), M = new THREE.Matrix4();
            const c = new THREE.Vector3(), nrm = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), sph = new THREE.Vector3();
            scatter(isMobile ? 30 : 64, o.inner + 2, 120, 2.2).forEach(p => {
                const s = 0.7 + r() * 0.9;
                M.makeTranslation(p.x, 0, p.z);
                for (let k = 0; k < 7; k++) {
                    c.set((r() - 0.5) * 0.9 * s, (0.3 + r() * 0.35) * s, (r() - 0.5) * 0.9 * s);
                    randUnit(r, nrm);
                    right.crossVectors(nrm, Math.abs(nrm.y) > 0.9 ? _t.set(1, 0, 0) : Y).normalize();
                    up.crossVectors(right, nrm).normalize();
                    sph.set(c.x, 0.9, c.z).normalize();
                    const v = 0.6 + r() * 0.3, size = (0.8 + r() * 0.5) * s;
                    addCard(B, M, c, right, up, size, size, sph, [2.3 * v, 0.95 * v, 0.5 * v], r() * 6.28, 0.25, 0.6);
                }
                blobs.push({ x: p.x, z: p.z, len: s * 1.0, wid: s * 0.8 });
            });
            const mats = getForestMaterials();
            const scrub = new THREE.Mesh(B.build(true), mats.species[0].material);
            scrub.name = 'bpScrub';
            group.add(scrub);

            // Sombras de contacto (el exterior queda fuera del mapa de sombras del sol)
            const sc = makeCanvas(64, 64), sx = sc.getContext('2d');
            const grad = sx.createRadialGradient(32, 32, 2, 32, 32, 31);
            grad.addColorStop(0, 'rgba(0,0,0,1)'); grad.addColorStop(0.55, 'rgba(0,0,0,0.75)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
            sx.fillStyle = grad; sx.fillRect(0, 0, 64, 64);
            const pos = [], uv = [], idx = [];
            const dir = new THREE.Vector2(-sunLight.position.x, -sunLight.position.z).normalize();
            blobs.forEach((t, i) => {
                const cx = t.x + dir.x * t.len * 0.45, cz = t.z + dir.y * t.len * 0.45;
                [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(k => {
                    pos.push(cx + dir.x * k[0] * t.len - dir.y * k[1] * t.wid, 0.03, cz + dir.y * k[0] * t.len + dir.x * k[1] * t.wid);
                    uv.push(k[0] * 0.5 + 0.5, k[1] * 0.5 + 0.5);
                });
                idx.push(i * 4, i * 4 + 2, i * 4 + 1, i * 4, i * 4 + 3, i * 4 + 2);
            });
            const sg = new THREE.BufferGeometry();
            sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            sg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
            sg.setIndex(idx);
            group.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({
                map: new THREE.CanvasTexture(sc), color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false,
                polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
            })));

            // Montañas: anillos de relieve con la bruma ya pintada en el color (no usan la
            // niebla de la escena, que a esa distancia las borraría del todo).
            const sunDir3 = sunLight.position.clone().normalize();
            const haze = SKY.horizon.clone().convertSRGBToLinear();
            function range(rMin, rMax, baseH, varH, hazeLow, hazeHigh, rock, segs) {
                const prof = [0, 0.22, 0.5, 0.8, 1, 0.72, 0.42, 0.18, 0], ROWS = prof.length;
                const n1 = fbmField(segs, 8, 5, 1, 4, r, 0.55);       // perfil de la cresta
                const n2 = fbmField(segs, 16, 22, 2, 3, r, 0.65);     // relieve de las laderas
                const P = [], I = [];
                for (let a = 0; a <= segs; a++) {
                    const ai = a % segs, an = a / segs * Math.PI * 2;
                    const ridge = 1 - Math.abs(2 * n1[ai] - 1);
                    const h = baseH + varH * Math.pow(ridge, 1.4);
                    for (let k = 0; k < ROWS; k++) {
                        const nz = n2[k * segs + ai];
                        const y = h * prof[k] * (0.5 + 0.95 * (1 - Math.abs(2 * nz - 1)));
                        const rad = (rMin + (rMax - rMin) * k / (ROWS - 1)) * (0.97 + 0.06 * n2[(k + 5) * segs + ai]);
                        P.push(Math.sin(an) * rad, y - 1, Math.cos(an) * rad);
                    }
                }
                for (let a = 0; a < segs; a++) for (let k = 0; k < ROWS - 1; k++) {
                    const p0 = a * ROWS + k, p1 = p0 + ROWS;
                    I.push(p0, p1, p0 + 1, p1, p1 + 1, p0 + 1);
                }
                const gi = new THREE.BufferGeometry();
                gi.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
                gi.setIndex(I);
                const g = gi.toNonIndexed();      // caras planas: aristas y vaguadas marcadas, como roca
                g.computeVertexNormals();
                const N = g.attributes.normal, Pn = g.attributes.position, C = new Float32Array(N.count * 3), col = new THREE.Color();
                for (let i = 0; i < N.count; i++) {
                    const Hi = Math.max(0, (Pn.getY(i) + 1) / (baseH + varH));
                    let nl = N.getX(i) * sunDir3.x + N.getY(i) * sunDir3.y + N.getZ(i) * sunDir3.z;
                    if (N.getY(i) < 0) nl = -nl;                       // la malla se ve por ambas caras
                    const lit = 0.34 + 0.86 * Math.max(0, nl);
                    col.copy(rock).multiplyScalar(lit * (0.88 + 0.3 * Hi));
                    col.lerp(haze, hazeHigh + (hazeLow - hazeHigh) * (1 - Math.min(1, Hi * 1.6)));
                    C[i * 3] = col.r; C[i * 3 + 1] = col.g; C[i * 3 + 2] = col.b;
                }
                g.setAttribute('color', new THREE.BufferAttribute(C, 3));
                const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, toneMapped: false, side: THREE.DoubleSide }));
                m.frustumCulled = false;
                group.add(m);
            }
            const segs = isMobile ? 120 : 220;
            range(330, 560, 50, 125, 0.8, 0.26, new THREE.Color(0xb48e6c).convertSRGBToLinear(), segs);
            range(215, 340, 7, 26, 0.74, 0.3, new THREE.Color(0xc9a67a).convertSRGBToLinear(), segs);

            noRaycast(group);
            scene.add(group);
            env.timings.surroundings = Math.round(performance.now() - tf);
            return group;
        };

        // ---- Fuente central -------------------------------------------------
        const animated = [];
        env.createFountain = function () {
            const group = new THREE.Group();
            group.name = 'bpFountain';
            const seg = isMobile ? 24 : 40;

            // Piedra: vaso con brocal moldurado y columna con dos tazas y remate
            const stone = new StaticBuilder();
            stone.add(latheGeometry([
                [2.74, 0], [2.74, 0.1], [2.6, 0.15], [2.6, 0.44], [2.7, 0.5], [2.7, 0.6], [2.34, 0.6], [2.34, 0.54], [2.26, 0.5], [2.26, 0.02]
            ], seg, 0), xf(null, 0, 0, 0));
            stone.add(latheGeometry([
                [0.62, 0.02], [0.62, 0.52], [0.52, 0.58], [0.42, 0.64], [0.3, 0.78], [0.24, 0.98], [0.3, 1.12], [0.55, 1.22], [0.95, 1.32],
                [1.18, 1.44], [1.2, 1.5], [1.13, 1.5], [0.9, 1.4], [0.5, 1.32], [0.22, 1.34], [0.18, 1.52], [0.16, 1.92], [0.22, 2.04],
                [0.42, 2.12], [0.62, 2.22], [0.64, 2.28], [0.58, 2.28], [0.4, 2.19], [0.16, 2.16], [0.12, 2.32], [0.17, 2.44],
                [0.2, 2.57], [0.12, 2.74], [0.05, 2.87], [0.001, 2.97]
            ], seg, 0), xf(null, 0, 0, 0));
            const stoneMesh = part(stone.build(0.8), stoneMaterial);
            group.add(stoneMesh);

            // Agua: superficie con ondas en movimiento que refleja el cielo
            const waterNormal = buildWaterNormal(rng, aniso);
            waterNormal.repeat.set(3, 3);
            const water = new THREE.MeshStandardMaterial({
                color: new THREE.Color(0x3f8f97).convertSRGBToLinear(), roughness: 0.07, metalness: 0,
                normalMap: waterNormal, transparent: true, opacity: 0.88
            });
            water.normalScale.set(0.3, 0.3);
            water.envMapIntensity = 1.3;
            [[2.27, 0.47], [1.13, 1.47], [0.58, 2.25]].forEach(w => {
                const disc = new THREE.Mesh(new THREE.CircleGeometry(w[0], seg), water);
                disc.rotation.x = -Math.PI / 2;
                disc.position.y = w[1];
                disc.receiveShadow = true;
                group.add(disc);
            });

            // Caídas: láminas de hilos de agua que bajan de taza en taza
            const streak = buildStreakTexture(rng);
            const fallMat = new THREE.MeshBasicMaterial({ map: streak, color: 0xeaf7ff, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
            [[1.2, 1.36, 1.49, 0.47, 7], [0.64, 0.78, 2.27, 1.47, 4], [0.03, 0.34, 2.96, 2.25, 2]].forEach(f => {
                const geo = new THREE.CylinderGeometry(f[0], f[1], f[2] - f[3], seg, 1, true);
                const u = geo.attributes.uv;
                for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * f[4], u.getY(i) * (f[2] - f[3]) * 0.9);
                const m = new THREE.Mesh(geo, fallMat);
                m.position.y = (f[2] + f[3]) / 2;
                m.renderOrder = 2;
                group.add(m);
            });

            // Espuma donde cae el agua
            const foamMat = new THREE.MeshBasicMaterial({ map: buildFoamTexture(rng), transparent: true, opacity: 0.6, depthWrite: false });
            const foams = [[1.36, 0.475, 0.5], [0.78, 1.475, 0.3]].map(f => {
                const m = new THREE.Mesh(new THREE.PlaneGeometry(f[0] * 2 + f[2] * 2, f[0] * 2 + f[2] * 2), foamMat);
                m.rotation.x = -Math.PI / 2;
                m.position.y = f[1];
                m.renderOrder = 1;
                group.add(m);
                return m;
            });

            animated.push(function (time) {
                streak.offset.y = (time * 0.85) % 1;
                waterNormal.offset.set((time * 0.025) % 1, (time * 0.017) % 1);
                foams[0].rotation.z = time * 0.35;
                foams[1].rotation.z = -time * 0.5;
            });
            return noRaycast(group);
        };

        // ---- Mobiliario ----------------------------------------------------
        function part(geometry, material, cast) {
            const m = new THREE.Mesh(geometry, material);
            m.castShadow = cast !== false;
            m.receiveShadow = true;
            return m;
        }

        let lampGeo = null;
        env.createStreetLamp = function () {
            if (!lampGeo) lampGeo = buildLampGeometries(q.lampSegs);
            const group = new THREE.Group();
            group.add(part(lampGeo.iron, ironMaterial), part(lampGeo.glass, lampGlassMaterial, false), part(lampGeo.gold, goldMaterial, false));
            const light = new THREE.PointLight(0xffaa44, 1.1, 11, 1.8);
            light.position.set(0, 3.4, 0);
            group.add(light);
            return noRaycast(group);
        };

        let benchGeo = null;
        env.createBench = function () {
            if (!benchGeo) benchGeo = buildBenchGeometries();
            const group = new THREE.Group();
            group.add(part(benchGeo.iron, ironMaterial), part(benchGeo.wood, woodMaterial));
            return noRaycast(group);
        };

        // Verja perimetral: los cuatro lados son iguales y comparten geometría
        env.createFence = function (o) {
            const tf = performance.now();
            const side = buildFenceSide(o, q);
            const bound = new THREE.Sphere(new THREE.Vector3(0, 2, o.limit), o.limit + 4);
            [side.bar, side.dog, side.ring].forEach(g => { g.boundingSphere = bound; });
            const root = new THREE.Group();
            root.name = 'bpFence';
            function instanced(geometry, matrices, cast) {
                if (!matrices.length) return null;
                const m = new THREE.InstancedMesh(geometry, ironMaterial, matrices.length);
                matrices.forEach((mat, i) => m.setMatrixAt(i, mat));
                m.instanceMatrix.needsUpdate = true;
                m.castShadow = cast;
                return m;
            }
            for (let i = 0; i < 4; i++) {
                const g = new THREE.Group();
                g.rotation.y = i * Math.PI / 2;
                g.add(part(side.stone, stoneMaterial), part(side.iron, ironMaterial), part(side.gold, goldMaterial, false));
                [instanced(side.bar, side.bars, true), instanced(side.dog, side.dogs, false), instanced(side.ring, side.rings, false)]
                    .forEach(m => { if (m) g.add(m); });
                root.add(g);
            }
            env.timings.fence = Math.round(performance.now() - tf);
            return noRaycast(root);
        };

        // Suelo de la plaza: losas de piedra clara en hiladas paralelas a cada lado del
        // octógono (se encuentran a inglete en las diagonales), cenefa de adoquín y bordillo.
        env.createPlazaFloor = function (o) {
            const R = o.radius, top = o.top, sides = o.sides || 8, f = o.border || 0.86;
            const flag = { pos: [], uv: [] }, edge = { pos: [], uv: [] };
            const kerb = new StaticBuilder();
            const A = new THREE.Vector3(), B = new THREE.Vector3(), e = new THREE.Vector3(), n = new THREE.Vector3();
            function put(t, x, z) { t.pos.push(x, top, z); t.uv.push(x * e.x + z * e.z, x * n.x + z * n.z); }
            for (let i = 0; i < sides; i++) {
                const a0 = i / sides * Math.PI * 2, a1 = (i + 1) / sides * Math.PI * 2;
                A.set(Math.sin(a0) * R, top, Math.cos(a0) * R); B.set(Math.sin(a1) * R, top, Math.cos(a1) * R);
                e.subVectors(B, A).normalize();
                n.addVectors(A, B).normalize();
                put(flag, 0, 0); put(flag, A.x * f, A.z * f); put(flag, B.x * f, B.z * f);
                put(edge, A.x * f, A.z * f); put(edge, A.x, A.z); put(edge, B.x, B.z);
                put(edge, A.x * f, A.z * f); put(edge, B.x, B.z); put(edge, B.x * f, B.z * f);
                // Bordillo
                const len = A.distanceTo(B), ang = Math.atan2(n.x, n.z);
                kerb.add(new THREE.BoxGeometry(len + 0.02, top + 0.02, 0.14), xf(null, (A.x + B.x) / 2 + n.x * 0.05, top / 2 - 0.012, (A.z + B.z) / 2 + n.z * 0.05, 0, ang, 0));
            }
            function flat(t, material) {
                const g = new THREE.BufferGeometry();
                g.setAttribute('position', new THREE.Float32BufferAttribute(t.pos, 3));
                g.setAttribute('uv', new THREE.Float32BufferAttribute(t.uv, 2));
                const nor = new Float32Array(t.pos.length);
                for (let i = 1; i < nor.length; i += 3) nor[i] = 1;
                g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
                g.computeBoundingSphere();
                const m = new THREE.Mesh(g, material);
                m.receiveShadow = true;
                return m;
            }
            const group = new THREE.Group();
            group.name = 'bpPlazaFloor';
            group.add(flat(flag, flagMaterial), flat(edge, pavingMaterial), part(kerb.build(0.8), stoneMaterial, false));
            return group;
        };

        // ---- Texturas fotográficas opcionales ---------------------------
        // Se piden nada más crear el entorno. env.ready se resuelve cuando todas están
        // aplicadas (o han fallado), para que la escena no se muestre a medio cargar.
        let photoDone = 0, photoTotal = 0;
        const progressListeners = [];
        env.onProgress = function (fn) { progressListeners.push(fn); fn(photoDone, photoTotal); };

        function loadPhotoSet(name, cfg) {
            const target = { grass: grassMaterial, paving: pavingMaterial, bark: barkMaterial }[name];
            if (!target || !cfg || !cfg.color) return Promise.resolve();
            const loader = new THREE.TextureLoader();
            const load = url => new Promise(resolve => {
                if (!url) { resolve(null); return; }
                photoTotal++;
                const done = t => { photoDone++; progressListeners.forEach(fn => fn(photoDone, photoTotal)); resolve(t); };
                loader.load(url, done, undefined, () => done(null));
            });
            return Promise.all([load(cfg.color), load(cfg.normal), load(cfg.rough)]).then(res => {
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
                target.roughness = rough ? 1.0 : (name === 'paving' ? 0.85 : 0.92);
                target.needsUpdate = true;
                old.forEach(t => { if (t) t.dispose(); });
            });
        }

        env.ready = photoSets
            ? Promise.all(Object.keys(photoSets).map(name => loadPhotoSet(name, photoSets[name]))).then(() => {})
            : Promise.resolve();

        // ---- Actualización por fotograma -------------------------------
        env.update = function (time, camera) {
            timeUniform.value = time;
            for (let i = 0; i < animated.length; i++) animated[i](time);
            skyMaterial.uniforms.uTime.value = time;
            sky.position.copy(camera.position);
        };

        return env;
    }

    global.BPEnv = { create: create };
})(window);
