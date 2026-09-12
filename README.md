# AWS Community Day Argentina 2026 - StockLens

Repositorio de demo para la charla: crear una aplicacion con IA y evolucionarla
hacia una arquitectura AWS.

## Apps

- `StockLens_v05/`: demo de producto mobile-first para identificar objetos con IA, generar QR y organizar inventario.
- `StockLens_ppt/`: material de presentacion.

## Aplicaciones Desplegadas

### StockLens v05 - Demo de producto mobile-first

Version pensada para que alguien del publico se lleve la idea a su casa:
catalogar objetos con fotos, analizarlos con IA, generar etiquetas QR y
administrar un inventario personal. La app mobile carga objetos, fotos y lee
QR; la vista admin permite ver el catalogo compartido desde una notebook.

Entrada de la demo: [home.lens.glaciar.org](https://home.lens.glaciar.org).

<table>
  <tr>
    <td align="center" width="50%" style="padding: 18px;">
      <img src="docs/qr/stocklens-v05-mobile.svg" alt="QR StockLens v05 mobile" width="170" />
      <br />
      <strong>Mobile producto</strong>
      <br />
      <a href="https://mobile.lens.glaciar.org">mobile.lens.glaciar.org</a>
      <br />
      <small>Version: <a href="https://mobile-v5.lens.glaciar.org">mobile-v5.lens.glaciar.org</a></small>
    </td>
    <td align="center" width="50%" style="padding: 18px;">
      <img src="docs/qr/stocklens-v05-admin.svg" alt="QR StockLens v05 admin" width="170" />
      <br />
      <strong>Web catalogo</strong>
      <br />
      <a href="https://web.lens.glaciar.org">web.lens.glaciar.org</a>
      <br />
      <small>Version: <a href="https://web-v5.lens.glaciar.org">web-v5.lens.glaciar.org</a></small>
    </td>
  </tr>
</table>

Evidencia visual de las pruebas E2E v05:
[ver ejecuciones, videos y resultados](https://web.lens.glaciar.org/evidence/).

## Documentacion

- `README_MAIN.md`: guia principal de la charla.
- `STRUCTURE_OVERVIEW.md`: mapa de carpetas y versiones.
- `README_USE_CASES.md`: motivacion y casos de uso de edificio/casa.
- `README_TESTING_WITH_IA.md`: estrategia de testing con IA, capas estaticas/dinamicas y pipeline recomendado.
