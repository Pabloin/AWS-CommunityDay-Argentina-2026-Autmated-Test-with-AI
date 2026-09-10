# AWS Community Day Argentina 2026 - StockLens

Repositorio de demo para la charla: crear una aplicacion con IA y evolucionarla
hacia una arquitectura AWS.

## Apps

- `StockLens_v04/`: demo tecnica con GitHub Actions, OIDC, Amazon Bedrock, Playwright y evidencia.
- `StockLens_v05/`: demo de producto mobile-first para identificar objetos con IA, generar QR y organizar inventario.
- `StockLens_ppt/`: material de presentacion.

## Aplicaciones Desplegadas

### StockLens v04 - Demo tecnica del pipeline

Version para mostrar la arquitectura del workshop: aplicacion web, experiencia
mobile de campo y consola de evidencia para revisar artefactos de tests,
videos de Playwright y resultados del pipeline con IA.

<table>
  <tr>
    <td align="center" width="33%" style="padding: 18px;">
      <img src="docs/qr/stocklens-v04-mobile.svg" alt="QR StockLens v04 mobile" width="170" />
      <br />
      <strong>Mobile campo</strong>
      <br />
      <a href="https://mobile-v4.lens.glaciar.org">mobile-v4.lens.glaciar.org</a>
    </td>
    <td align="center" width="33%" style="padding: 18px;">
      <img src="docs/qr/stocklens-v04-web.svg" alt="QR StockLens v04 web" width="170" />
      <br />
      <strong>Web admin</strong>
      <br />
      <a href="https://stock-v4.lens.glaciar.org">stock-v4.lens.glaciar.org</a>
    </td>
    <td align="center" width="33%" style="padding: 18px;">
      <img src="docs/qr/stocklens-v04-admin.svg" alt="QR StockLens v04 admin" width="170" />
      <br />
      <strong>Admin evidencia</strong>
      <br />
      <a href="https://admin-v4.lens.glaciar.org">admin-v4.lens.glaciar.org</a>
    </td>
  </tr>
</table>

### StockLens v05 - Demo de producto mobile-first

Version pensada para que alguien del publico se lleve la idea a su casa:
catalogar objetos con fotos, analizarlos con IA, generar etiquetas QR y
administrar un inventario personal. La app mobile carga objetos, fotos y lee
QR; la vista admin permite ver el catalogo compartido desde una notebook.

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

Estado verificado el 2026-09-07:

- `stock-v4.lens.glaciar.org`: HTTP 200.
- `mobile-v4.lens.glaciar.org`: HTTP 200.
- `mobile-v5.lens.glaciar.org`: HTTP 200.
- `admin-v4.lens.glaciar.org`: pendiente de resolver DNS/aplicar infraestructura v4 admin.

## Documentacion

- `README_MAIN.md`: guia principal de la charla.
- `STRUCTURE_OVERVIEW.md`: mapa de carpetas y versiones.
- `README_USE_CASES.md`: motivacion y casos de uso de edificio/casa.
- `README_TESTING_WITH_IA.md`: estrategia de testing con IA, capas estaticas/dinamicas y pipeline recomendado.
