# Fila virtual de turnos

Reto Accenture: un cliente pide turno y ve su número, su posición y el tiempo estimado de espera; un asesor llama al siguiente, ve los turnos en espera y la espera promedio.

**Regla de negocio:** se atiende por orden de llegada, los números no se repiten y no se puede llamar si la fila está vacía.

## Estructura

```
turnos-assessment/
├── pom.xml, src/   API REST (backend) - Spring Boot 4, Java 21
├── front/          Angular 18 - vista cliente y vista asesor
├── docs/testing/   Estándares de estructura y pruebas (backend y frontend)
├── rules.md        Reglas de pruebas obligatorias para agentes de IA
└── AGENTS.md       Punto de entrada para agentes de IA
```

El backend vive en la raíz del repositorio: los comandos de Maven del backend se ejecutan desde ahí.

## Estándares de pruebas

| Documento | Contenido |
|---|---|
| [docs/testing/estandar-backend.md](docs/testing/estandar-backend.md) | Estructura de paquetes, tipos de prueba (unitaria, `@WebMvcTest`, `@DataJpaTest`, `@SpringBootTest`), patrón AAA y escenarios Gherkin con Cucumber. |
| [docs/testing/estandar-frontend.md](docs/testing/estandar-frontend.md) | Estructura del front, pruebas de servicios con `HttpTestingController` y de componentes con `TestBed`, patrón AAA y nombres estilo Gherkin. |
| [rules.md](rules.md) | Reglas cortas y obligatorias para agentes de IA que escriben pruebas. |

Todas las pruebas siguen **AAA (Arrange – Act – Assert)**. Las reglas de negocio del reto se documentan además como escenarios **Gherkin** en español.

## Cómo correr el proyecto

### Requisitos

| Herramienta | Versión |
|---|---|
| JDK | 21 o superior |
| Maven | 3.9 o superior (o el wrapper `mvnw` incluido) |
| Node.js | 20 o superior (con npm) |
| Angular CLI | No hace falta instalarla globalmente: se usa la versión 18 del proyecto con `npx` |
| Google Chrome | Para las pruebas unitarias del front (Karma) |

### 1. Backend (puerto 8080)

Desde la raíz del repositorio:

```bash
mvn spring-boot:run
```

Pruebas:

```bash
mvn test
```

### 2. Frontend (puerto 4200)

```bash
cd front
npm install
npx ng serve
```

`npx ng` usa la Angular CLI instalada en el proyecto (versión 18), no una global.

Abrir http://localhost:4200.

Pruebas unitarias (una sola corrida, sin modo watch):

```bash
cd front
npx ng test --watch=false --browsers=ChromeHeadless
```

## ¿Por qué Angular, Java y Spring Boot?

El reto pide este stack. Además, es una buena elección para este problema:

**Java 21**
- Es la versión LTS más reciente con soporte largo y es compatible con Spring Boot 4, que exige como mínimo Java 17.
- Tiene concurrencia madura. Esto importa aquí porque varios clientes pueden pedir turno al mismo tiempo y la regla "los números no se repiten" debe cumplirse siempre.
- El tipado estático y los `record` dejan explícitos los contratos de la API, y el compilador detecta los errores antes de ejecutar.

**Spring Boot 4**
- Da lo necesario sin configuración manual: servidor web embebido, validación y una configuración por defecto razonable.
- Las pruebas son de primera clase: `@SpringBootTest` levanta la aplicación real, y `MockMvcTester` (MockMvc con aserciones AssertJ) prueba los endpoints sin abrir un puerto.
- Es un estándar en proyectos empresariales, lo que facilita mantener el código y sumar personas al equipo.

**Angular**
- Es un framework completo: rutas, cliente HTTP, formularios e inyección de dependencias vienen incluidos, sin elegir librerías aparte.
- Su estructura (páginas, servicios, modelos) permite trabajar en paralelo. Por ejemplo, `services/turno.service.ts` concentra las llamadas a la API y `models/turno.ts` replica las respuestas del backend.
- TypeScript tipa las respuestas de la API igual que Java tipa las del backend, así que un cambio en el contrato aparece como error de compilación en ambos lados.

## Decisiones tomadas y por qué

### Creación del frontend

El proyecto Angular se generó con:

```bash
npx -p @angular/cli@18 ng new front --ssr=false --skip-git
```

| Opción | Por qué |
|---|---|
| `npx -p @angular/cli@18` | Garantiza Angular 18 sin depender de la versión de Angular CLI instalada globalmente en cada máquina. Así todo el equipo genera y corre el proyecto con la misma versión, sin conflictos. |
| `--ssr=false` | La aplicación es una SPA que corre solo en el navegador y consume la API REST. El renderizado en servidor (SSR) agregaría código y un servidor Node que no se necesitan. |
| `--skip-git` | El front vive dentro del repositorio compartido con el backend. Sin esta opción, Angular crearía un repositorio git anidado dentro de `front/`. |
