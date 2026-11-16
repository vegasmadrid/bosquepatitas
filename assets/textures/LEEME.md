# Texturas fotográficas (opcional)

El bosque funciona sin ningún archivo en esta carpeta: el césped, el adoquinado y la
corteza se generan en el navegador (`assets/js/bp-environment.js`).

Si se añaden aquí texturas fotográficas, el plugin las detecta solo. Se descargan
**después** de que el bosque ya se esté viendo y sustituyen a las generadas, así que no
retrasan la carga inicial. Si un archivo no existe, no se hace ninguna petición.

## Nombres de archivo

| Superficie  | Color (obligatorio)  | Normales (opcional)   | Rugosidad (opcional)  |
|-------------|----------------------|-----------------------|-----------------------|
| Césped      | `grass_color.webp`   | `grass_normal.webp`   | `grass_rough.webp`    |
| Adoquinado  | `paving_color.webp`  | `paving_normal.webp`  | `paving_rough.webp`   |
| Corteza     | `bark_color.webp`    | `bark_normal.webp`    | `bark_rough.webp`     |

También se aceptan `.jpg` y `.png` con los mismos nombres; si hay varios, gana `.webp`.

## Requisitos

- Texturas **enlosables** (seamless), cuadradas y de 1024 × 1024 px. Más resolución casi
  no se nota y multiplica por cuatro la memoria de vídeo.
- Mapa de normales en convención **OpenGL** (en Poly Haven: "Normal (GL)").
- WebP con calidad 75–82. Como referencia, cada archivo debería quedar entre 60 y 250 KB.
- Licencia que permita redistribuirlas. Las de Poly Haven y ambientCG son CC0.

## Tamaño real

`config.json` indica cuántos metros cubre cada textura en el mundo (el dato "wide" de la
ficha de Poly Haven). Si las piedras o la hierba se ven demasiado grandes o pequeñas, es
el número que hay que ajustar.

## Sugerencias (CC0, Poly Haven)

- Adoquinado: [Pavement 05](https://polyhaven.com/a/pavement_05), 3,4 m de ancho.
- Corteza: [Bark Platanus](https://polyhaven.com/a/bark_platanus), 1,5 m, o
  [Trident Maple Bark](https://polyhaven.com/a/trident_maple_bark), 1,8 m.
- Césped: cualquier textura de la categoría de césped de Poly Haven o ambientCG que sea
  de hierba corta y uniforme.

De cada una hacen falta tres mapas a 1K: Diffuse, Normal (GL) y Rough.
