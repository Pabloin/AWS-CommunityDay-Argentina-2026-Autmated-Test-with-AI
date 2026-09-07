# Dale confianza a tu codigo

## Crea un pipeline en AWS que genera tests con IA

AWS Community Day Argentina 2026  
Workshop practico con StockLens v04

---

## 1. Contexto

En muchos equipos, los tests quedan para el final.

El codigo avanza, las features salen, el deploy se acerca, pero aparece una
pregunta incomoda:

```text
Que se puede romper si despliego esto ahora?
```

La falta de cobertura no siempre se siente durante el desarrollo. Se siente en
el momento de pasar a produccion.

---

## 2. Problema

Los equipos suelen convivir con tres tensiones:

- Se necesita entregar rapido.
- Se necesita validar mas.
- No siempre hay tiempo para escribir buenos tests.

Cuando los tests se escriben apurados, suelen cubrir el camino feliz minimo. Y
cuando directamente no se escriben, el pipeline solo confirma que el codigo
compila, no que el producto funciona.

---

## 3. Hipotesis Del Workshop

La IA puede ayudar a generar tests, pero no debe decidir si se despliega.

La idea central:

```text
La IA propone.
Playwright verifica.
El pipeline decide.
```

El objetivo no es reemplazar criterio tecnico. Es sumar una capa automatizada de
validacion antes del deploy.

---

## 4. Que Vamos A Construir

Un pipeline de CI/CD que:

- Recibe cambios desde GitHub.
- Asume permisos en AWS usando OIDC.
- Invoca una Lambda generadora de tests.
- Usa Amazon Bedrock para proponer tests Playwright.
- Ejecuta esos tests contra la aplicacion.
- Guarda evidencia de la ejecucion.
- Despliega solo si el quality gate pasa.

---

## 5. Aplicacion De Referencia

La demo usa StockLens v04.

StockLens es una aplicacion de inventario visual con QR:

- Front web para administracion.
- Front mobile para operacion en campo.
- Backend serverless.
- Evidencia de fotos y movimientos.
- Tenant y tags propios para la demo v04.

Dominios:

```text
https://stock-v4.lens.glaciar.org
https://mobile-v4.lens.glaciar.org
https://admin-v4.lens.glaciar.org
```

---

## 6. Arquitectura General

```text
GitHub
  -> GitHub Actions
  -> OIDC hacia AWS
  -> Lambda ai-test-generator
  -> Amazon Bedrock
  -> test Playwright generado
  -> Playwright
  -> S3 + CloudFront + Lambda
```

La infraestructura se define con Terraform, pero no se aplica desde la notebook
de la demo. El apply entra por pipeline.

---

## 7. Dos Pipelines Separados

### Pipeline De Infraestructura

Responsable de crear y actualizar recursos AWS:

- S3.
- CloudFront.
- ACM.
- Route53.
- Lambda.
- API Gateway.
- DynamoDB.
- IAM roles OIDC.
- Resource Groups.

Se ejecuta manualmente con `workflow_dispatch` y `apply=true`.

### Pipeline De Aplicacion

Responsable del ciclo de calidad y deploy:

- Generar test con IA.
- Compilar front web, mobile, admin y backend.
- Ejecutar Playwright.
- Publicar evidencia.
- Desplegar assets y Lambda si pasa.

---

## 8. Por Que OIDC

OIDC evita guardar access keys largas en GitHub.

GitHub emite un token temporal para el workflow. AWS valida ese token y permite
asumir un rol IAM limitado al repositorio y branch esperados.

Beneficio:

- Sin claves permanentes.
- Permisos trazables.
- Roles separados para infraestructura y aplicacion.
- Menor superficie de exposicion.

---

## 9. Roles Principales

```text
STOCKLENS_V04_INFRA_ROLE_ARN
```

Rol usado por el pipeline de infraestructura. Tiene permisos para que Terraform
cree y actualice recursos.

```text
STOCKLENS_V04_APP_ROLE_ARN
```

Rol usado por el pipeline de aplicacion. Tiene permisos mas acotados:

- Invocar la Lambda generadora de tests.
- Actualizar la Lambda API.
- Subir assets a buckets S3 especificos.
- Subir evidencia Playwright.
- Invalidar distribuciones CloudFront especificas.

---

## 10. Flujo De AI Test Generation

El pipeline invoca:

```text
stocklens-v04-ai-test-generator
```

La Lambda toma contexto del codigo:

- Front web.
- Front mobile.
- Backend API.
- Estilos relevantes.

Con ese contexto llama a Amazon Bedrock y pide un test Playwright ejecutable.

---

## 11. Guardrails Tecnicos

La IA no puede devolver cualquier cosa.

El generador valida que el resultado:

- Importe `@playwright/test`.
- Defina al menos un `test(...)`.
- Use `page.goto("/")`.
- No hardcodee `localhost`.
- No hardcodee `127.0.0.1`.
- Se mantenga dentro de un limite de tamanio.

Si no cumple, el pipeline falla.

---

## 12. Fallback Apagado

Para la demo remota, el fallback esta apagado:

```text
AI_TEST_STRICT_MODE=true
ALLOW_AI_TEST_FALLBACK=false
```

Esto es importante.

Si Bedrock falla, no se inventa un test local para hacer pasar el pipeline. El
fallo queda visible.

Ese comportamiento da mas confianza que un fallback silencioso.

---

## 13. Playwright Como Quality Gate

Playwright ejecuta el test generado contra la aplicacion.

El pipeline solo despliega si Playwright pasa.

Regla:

```text
Si falla la generacion, no hay deploy.
Si falla la validacion del test, no hay deploy.
Si falla Playwright, no hay deploy.
```

---

## 14. Evidencia

Cada ejecucion puede dejar:

- Video `.webm`.
- Trace.
- Screenshot en fallas.
- Reporte HTML.
- Logs del workflow.
- Summary con links presignados.

Esto transforma el pipeline en una demo visible, no solo en una lista de checks.

---

## 15. Admin De Evidencia

Se agrego un sitio estatico:

```text
https://admin-v4.lens.glaciar.org
```

Este admin muestra:

- Runs de GitHub Actions.
- Estado del quality gate.
- Commit probado.
- Prefix S3 de evidencia.
- Videos Playwright embebidos.
- Links al run y a S3.

No tiene backend propio. Lee un `index.json` publicado en S3 y reproduce videos
privados usando URLs presignadas.

---

## 16. Demo Positiva

Flujo:

```text
Cambio de codigo
  -> push a master
  -> GitHub Actions Application
  -> Bedrock genera test
  -> Playwright pasa
  -> se publica evidencia
  -> deploy web/mobile/admin/API
```

Mostrar:

- Workflow verde.
- Test generado.
- Video Playwright.
- Aplicacion actualizada.

---

## 17. Demo Negativa

Romper un texto, selector o dato que el test espera.

Flujo:

```text
Cambio riesgoso
  -> Bedrock genera test
  -> Playwright falla
  -> se publica evidencia
  -> no hay deploy de aplicacion
```

Esta es una parte clave de la charla.

El valor no es que todo pase. El valor es que el pipeline detecte algo antes de
produccion.

---

## 18. Que Testea

El foco principal es end-to-end sobre el front web.

Playwright valida comportamiento visible:

- Que la aplicacion carga.
- Que aparecen datos esperados.
- Que la UI expone informacion clave.
- Que cambios de frontend no rompen flujos criticos.

Indirectamente tambien toca backend cuando el flujo requiere datos de API.

No reemplaza:

- Unit tests.
- Contract tests.
- Tests de integracion profundos.
- Pruebas de seguridad.
- Revision humana.

---

## 19. Riesgos Y Limites

La IA puede generar tests pobres, fragiles o demasiado superficiales.

Riesgos:

- Tests no deterministas.
- Selectores fragiles.
- Cobertura aparente pero poco valor real.
- Costo y latencia del modelo.
- Dependencia de contexto incompleto.
- Falsos positivos o falsos negativos.

Mitigaciones:

- Validar sintaxis y estructura del test.
- Ejecutar siempre en pipeline.
- Guardar evidencia.
- Revisar tests propuestos.
- Mantener caminos criticos definidos por humanos.
- No permitir fallback silencioso en CI/CD.

---

## 20. Buenas Practicas

- Separar pipeline de infra y pipeline de app.
- Usar OIDC en vez de access keys.
- Aplicar minimo privilegio por rol.
- Hacer visible la evidencia del test.
- Fallar cerrado: si la IA no responde bien, no se despliega.
- Mantener la IA como asistente, no como autoridad.
- Versionar la arquitectura esperada.
- Taggear recursos para costo, ownership y limpieza.

---

## 21. Tags Y Tenant

Todos los recursos v04 usan tags consistentes:

```text
Project      = stocklens-v04
Release      = stocklens-v04
Tenant       = aws-cday-argentina-2026-v4
DeploymentId = v4
Environment  = demo
Event        = aws-cday-argentina-2026
ManagedBy    = terraform
```

Esto permite:

- Buscar recursos por Resource Groups.
- Entender costos.
- Separar tenants/versiones.
- Limpiar la demo con menos riesgo.

---

## 22. Decision Arquitectonica

La propuesta original mencionaba CodePipeline y CodeBuild.

Para v04, la demo queda con GitHub Actions porque:

- Reduce pasos de setup.
- Evita CodeStar Connections.
- Hace mas visible el flujo para la audiencia.
- Permite mostrar OIDC de forma directa.
- Separa bien infraestructura y aplicacion.

La idea de calidad es la misma: un pipeline en AWS integrado con IA y testing
automatizado. Cambia el plano de orquestacion.

---

## 23. Mensaje Para Llevarse

No se trata de confiar ciegamente en tests generados por IA.

Se trata de usar IA para acelerar la creacion de escenarios, y usar el pipeline
para imponer control tecnico.

```text
La confianza no viene de la IA.
La confianza viene de automatizar validaciones observables antes del deploy.
```

---

## 24. Cierre

El deploy deja de ser un salto de fe cuando el pipeline puede responder:

- Que cambio entro.
- Que test se genero.
- Que se ejecuto.
- Que evidencia quedo.
- Que se desplego.
- Que se bloqueo.

Ese es el objetivo de StockLens v04 para el workshop.

