# Texturas fotográficas (opcional)

El bosque funciona sin ningún archivo en esta carpeta: el césped, el adoquinado y la
corteza se generan en el navegador (`assets/js/bp-environment.js`).

Si se añaden aquí texturas fotográficas, el plugin las detecta solo. Se descargan
durante la pantalla de carga y el bosque no se muestra hasta que están puestas, así que
su peso se suma al tiempo de espera inicial. Si un archivo no existe, no se hace ninguna
petición; si alguno tarda más de 15 segundos, el bosque se abre con la textura generada.

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

## Texturas incluidas

Todas tienen licencia CC0. Están reducidas y convertidas a WebP:

- `paving_*`: [Pavement 05](https://polyhaven.com/a/pavement_05) de Poly Haven, 1024 px, 3,4 m.
- `bark_*`: [Bark Platanus](https://polyhaven.com/a/bark_platanus) de Poly Haven, 512 px, 1,5 m.

El césped se genera en el navegador: se probó una textura fotográfica y gustó más el generado.
Si se añaden archivos `grass_*`, el plugin los usará.

El adoquinado y la corteza no llevan mapa de rugosidad: se usa un valor fijo, que en
esas dos superficies apenas se distingue.

## Sugerencias (CC0, Poly Haven)

- Otro césped: [Leafy Grass](https://polyhaven.com/a/leafy_grass), 2 m de ancho, con hojas secas.
- Otra corteza: [Trident Maple Bark](https://polyhaven.com/a/trident_maple_bark), 1,8 m.

De cada una hacen falta los mapas Diffuse y Normal (GL) a 1K; Rough es opcional.
