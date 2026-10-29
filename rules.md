# Reglas de pruebas para agentes de IA

Reglas **obligatorias** para cualquier agente de IA que escriba o modifique pruebas en este repositorio. El detalle y los ejemplos completos están en:

- Backend: [docs/testing/estandar-backend.md](docs/testing/estandar-backend.md)
- Frontend: [docs/testing/estandar-frontend.md](docs/testing/estandar-frontend.md)

Si una regla de aquí choca con un estándar, **manda el estándar**; avisa del conflicto.

## 0. Antes de escribir una prueba

1. Lee el estándar de la tecnología que vas a probar.
2. Lee la clase/componente bajo prueba y sus colaboradores. No inventes nombres de métodos, rutas ni campos.
3. Confirma versiones en `pom.xml` / `front/package.json`. Hoy: **Spring Boot 4.1 + Java 21** y **Angular 18 + Jasmine/Karma**. No uses APIs de otra versión (p. ej. `@MockBean` no existe en Boot 4).
4. Identifica la regla de negocio que cubre la prueba (ver README → "Regla de negocio").

## 1. Patrón AAA — siempre

- Cada prueba tiene los bloques `// Arrange`, `// Act`, `// Assert`, en ese orden, separados por una línea en blanco.
- `// Act & Assert` solo para excepciones (`assertThatThrownBy`) o errores esperados.
- **Un solo Act** por prueba. Dos acciones = dos pruebas (excepto pruebas de integración de flujo, que deben decirlo en el `@DisplayName`).
- Sin lógica en las pruebas: nada de `if`, `for` ni `try/catch` para decidir qué verificar.

## 2. Gherkin — dónde y cómo

| Dónde | Cómo se aplica |
|---|---|
| Backend, reglas de negocio del reto | Archivos `.feature` en `src/test/resources/features/`, en español (`# language: es`), ejecutados con Cucumber + `cucumber-spring`. |
| Backend, JUnit | `@DisplayName` en español describiendo comportamiento. |
| Frontend (Jasmine) | Sin Cucumber. `describe('cuando …')` / `describe('dado que …')` + `it('debe …')`. |

Reglas Gherkin:
- Estilo **declarativo** (qué hace el negocio), nunca imperativo (clics, HTTP, JSON).
- Un `Cuando` por escenario. `Dado` = Arrange, `Cuando` = Act, `Entonces` = Assert.
- `Antecedentes` solo para contexto común a todos los escenarios; `Esquema del escenario` + `Ejemplos` para la misma regla con varios datos.
- Los steps delegan en la API o el servicio; no reimplementan lógica de negocio.

## 3. Nombres y ubicación

| | Backend | Frontend |
|---|---|---|
| Ubicación | Mismo paquete que la clase, bajo `src/test/java` | `x.spec.ts` al lado de `x.ts` |
| Archivo | `ClaseTest`, `ControllerTest`, `RepositoryTest`, `IntegrationTest` | `nombre.component.spec.ts`, `nombre.service.spec.ts` |
| Caso | `metodo_debeResultado_cuandoCondicion` + `@DisplayName` | `it('debe …')` dentro de `describe('cuando …')` |
| Utilidades | `com.accenture.turnos.support` | `src/testing/` |

## 4. Elegir el tipo de prueba correcto

**Backend**
- Regla de negocio → unitaria del servicio (Mockito, sin Spring).
- Contrato HTTP / códigos de error → `@WebMvcTest` + `MockMvcTester` + `@MockitoBean`.
- Consultas, orden y bloqueos → `@DataJpaTest`.
- Flujo completo, carga del CSV, concurrencia → `@SpringBootTest` + `@AutoConfigureMockMvc`.
- Regla del reto en lenguaje de negocio → escenario Gherkin.

**Frontend**
- Llamadas HTTP → solo en `TurnoService.spec`, con `HttpTestingController` y `httpTesting.verify()` en `afterEach`.
- Páginas → `TestBed` + `jasmine.createSpyObj<TurnoService>`; verificar el DOM por `data-testid`.

## 5. Prohibido

- `LocalDateTime.now()` / `Instant.now()` sin `Clock` en código o pruebas: usa `Clock.fixed(...)`.
- `Thread.sleep`, esperas reales, `setTimeout` en pruebas Angular: usa `CountDownLatch`, `fakeAsync`/`tick`.
- Seleccionar elementos por clase CSS o texto: usa `data-testid` (si falta, agrégalo a la plantilla).
- Mockear la clase bajo prueba, DTOs `record` o entidades.
- Pruebas que dependen del orden de ejecución o de datos dejados por otra prueba.
- `fit`, `fdescribe`, `xit`, `@Disabled` sin un motivo escrito.
- Debilitar una aserción, borrar una prueba o cambiar el código productivo **solo** para que una prueba pase. Si la prueba revela un bug, repórtalo.
- Agregar dependencias sin decirlo explícitamente en el resumen.

## 6. Aserciones y dobles

- Java: AssertJ (`assertThat`) + Mockito. `verify(...)` solo cuando la interacción es el efecto esperado.
- TypeScript: `expect` de Jasmine; spies tipados con `jasmine.createSpyObj<T>`.
- Datos con builders/fixtures con valores por defecto válidos; la prueba fija solo lo relevante.

## 7. Al terminar

1. Ejecuta las pruebas que tocaste y luego la suite completa:
   - Backend: `mvn test`
   - Frontend: `cd front && npx ng test --watch=false --browsers=ChromeHeadless`
2. Reporta el resultado real (pasaron / fallaron, con la salida). No digas que pasan sin haberlas ejecutado.
3. En el resumen indica: qué regla de negocio cubre cada prueba nueva, dependencias agregadas y `data-testid` añadidos.
