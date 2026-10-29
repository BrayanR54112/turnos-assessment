# AGENTS.md

Guía de entrada para agentes de IA que trabajan en este repositorio. Para el contexto funcional del reto, las decisiones de diseño y la API, lee el [README.md](README.md).

## Proyecto

Fila virtual de turnos: un cliente pide turno y ve su número, su posición y el tiempo estimado; un asesor llama al siguiente.
**Regla de negocio:** se atiende por orden de llegada, los números no se repiten y no se puede llamar si la fila está vacía.

| Parte | Ubicación | Stack |
|---|---|---|
| Backend | raíz (`pom.xml`, `src/`) | Java 21, Spring Boot 4.1, JUnit 5, AssertJ, Mockito |
| Frontend | `front/` | Angular 18 (standalone), Jasmine + Karma |

Las versiones válidas son las de `pom.xml` y `front/package.json`. Si el código o la documentación no coinciden con ellas, avisa antes de seguir.

## Pruebas — lectura obligatoria

Antes de escribir o modificar **cualquier** prueba:

1. [rules.md](rules.md): reglas obligatorias (AAA, Gherkin, prohibiciones y qué reportar al terminar).
2. El estándar de la tecnología que vas a tocar:
   - Backend: [docs/testing/estandar-backend.md](docs/testing/estandar-backend.md)
   - Frontend: [docs/testing/estandar-frontend.md](docs/testing/estandar-frontend.md)

Resumen mínimo:
- Toda prueba sigue **Arrange – Act – Assert**, con los tres bloques comentados.
- Las reglas de negocio del backend se describen en **Gherkin en español** (`src/test/resources/features/`). En el front, los nombres de las pruebas siguen el estilo Gherkin (`describe('cuando …')`, `it('debe …')`).
- La hora siempre viene de un `Clock` inyectado. Los selectores del front siempre usan `data-testid`.

## Comandos

```bash
# Backend (desde la raíz)
mvn spring-boot:run
mvn test

# Frontend
cd front
npm install
npx ng serve
npx ng test --watch=false --browsers=ChromeHeadless
```

## Forma de trabajar

- No agregues dependencias ni cambies versiones sin decirlo explícitamente.
- No cambies el contrato de la API (rutas, códigos, formato de error) sin actualizar `front/src/app/models/` y el README.
- Antes de decir que algo funciona, ejecuta las pruebas y reporta el resultado real.
- Si la documentación y el código no coinciden, avisa en lugar de elegir uno en silencio.
