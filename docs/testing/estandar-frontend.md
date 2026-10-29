# Estándar de pruebas — Frontend (Angular 18)

Este documento define **cómo se estructura el frontend y cómo se escriben sus pruebas unitarias**. Aplica a personas y a agentes de IA. Las reglas operativas resumidas para agentes están en [rules.md](../../rules.md).

> **Stack de pruebas del proyecto** (según `front/package.json`): Angular **18.2**, componentes standalone, **Jasmine 5 + Karma 6** (`ng test`). Las APIs de prueba se tomaron de la documentación oficial de Angular v18 (Context7).

---

## 1. Estructura del código

```
front/src/
├── app/
│   ├── app.config.ts            providers globales (router, HttpClient)
│   ├── app.routes.ts
│   ├── models/
│   │   └── turno.ts             interfaces que replican los DTO del backend
│   ├── services/
│   │   ├── turno.service.ts     ÚNICO punto de acceso a la API
│   │   └── turno.service.spec.ts
│   └── pages/
│       ├── pedir-turno/         vista cliente
│       │   ├── pedir-turno.component.ts|html|css
│       │   └── pedir-turno.component.spec.ts
│       └── asesor/              vista asesor
│           ├── asesor.component.ts|html|css
│           └── asesor.component.spec.ts
└── testing/                     utilidades SOLO de prueba (no se importan desde app/)
    ├── turno.fixtures.ts        builders: crearTurno(), crearFila()
    └── dom.helpers.ts           porTestId(fixture, 'id'), click(...)
```

Reglas de diseño que hacen el código **probable**:

| Regla | Por qué importa para las pruebas |
|---|---|
| Los componentes **no** usan `HttpClient`; llaman a `TurnoService`. | En el componente se sustituye el servicio por un spy; el HTTP se prueba solo en el servicio. |
| Dependencias con `inject()` o constructor, nunca instanciadas con `new`. | `TestBed` puede reemplazarlas con `{ provide, useValue }`. |
| URL base de la API en un solo lugar (constante o `environment`). | Las pruebas del servicio verifican URLs exactas. |
| Todo elemento que una prueba lea o accione lleva `data-testid`. | Selectores estables que no se rompen si cambia el diseño. Prohibido seleccionar por clase CSS o texto. |
| Temporizadores (refresco de la fila) aislados en el componente con `interval`/`timer` de RxJS. | Se controlan con `fakeAsync` + `tick`, sin esperas reales. |
| `provideHttpClient()` va en `app.config.ts`. | *Pendiente*: hoy `app.config.ts` solo tiene el router. |

## 2. Estructura y tipos de prueba

- Cada archivo `x.ts` con lógica tiene su `x.spec.ts` **al lado** (convención del CLI).

| Qué se prueba | Cómo | Dobles de prueba |
|---|---|---|
| **Servicio HTTP** (`TurnoService`) | `TestBed` + `provideHttpClient()` + `provideHttpClientTesting()` + `HttpTestingController` | Backend falso de Angular |
| **Componente** (páginas) | `TestBed.configureTestingModule({ imports: [Componente] })` + `ComponentFixture`, interacción por DOM | `jasmine.createSpyObj<TurnoService>` |
| **Lógica pura** (funciones, pipes, mapeos) | Sin `TestBed`, llamada directa | Ninguno |

## 3. Patrón AAA (Arrange – Act – Assert)

**Todo** `it(...)` sigue AAA, con los bloques marcados por comentario y separados por una línea en blanco.

| Bloque | En Angular |
|---|---|
| `// Arrange` | Configurar el retorno del spy (`and.returnValue(of(...))`), datos con fixtures, `fixture.detectChanges()` inicial si la prueba parte de la vista ya renderizada. |
| `// Act` | **Una** acción: llamar al método del servicio, hacer clic en un `data-testid`, avanzar el tiempo (`tick`). |
| `// Assert` | `expect(...)` sobre el DOM (lo que ve el usuario), sobre el spy o sobre la petición HTTP. |

La configuración repetida de `TestBed` va en `beforeEach` (es Arrange compartido). Lo específico de cada caso va dentro del `it`.

### 3.1 Nombres con estilo Gherkin

En Angular **no se usa Cucumber**; Gherkin se aplica en la **redacción** de `describe`/`it`, en español, para que el reporte de Karma se lea como una especificación:

```
describe('PedirTurnoComponent')
  describe('cuando el cliente pide un turno')          ← Cuando
    it('debe mostrar el número, la posición y el estimado')   ← Entonces
  describe('cuando la API responde con error')
    it('debe mostrar un mensaje de error')
```

- `describe` externo = unidad bajo prueba.
- `describe` interno = contexto o acción (`'cuando ...'`, `'dado que ...'`).
- `it` = resultado esperado, empieza por `'debe ...'`.

### 3.2 Ejemplo — servicio HTTP

```ts
describe('TurnoService', () => {
  let service: TurnoService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      // provideHttpClient() SIEMPRE antes de provideHttpClientTesting()
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TurnoService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify(); // falla si quedó alguna petición sin atender
  });

  describe('cuando se pide un turno', () => {
    it('debe hacer POST a /api/turnos y devolver el turno creado', () => {
      // Arrange
      const esperado = crearTurno({ numero: 11, posicion: 6 });
      let recibido: Turno | undefined;

      // Act
      service.pedirTurno().subscribe((turno) => (recibido = turno));
      const req = httpTesting.expectOne('/api/turnos');
      req.flush(esperado);

      // Assert
      expect(req.request.method).toBe('POST');
      expect(recibido).toEqual(esperado);
    });
  });

  describe('cuando se llama al siguiente con la fila vacía', () => {
    it('debe propagar el error 409', () => {
      // Arrange
      let status: number | undefined;

      // Act
      service.llamarSiguiente().subscribe({ error: (e: HttpErrorResponse) => (status = e.status) });
      httpTesting
        .expectOne('/api/turnos/llamar-siguiente')
        .flush({ mensaje: 'La fila está vacía' }, { status: 409, statusText: 'Conflict' });

      // Assert
      expect(status).toBe(409);
    });
  });
});
```

> En pruebas HTTP, el `flush` forma parte del **Act**: es la respuesta del servidor que completa la acción.
> Los nombres de métodos y la URL base son ilustrativos: usar los del servicio real.

### 3.3 Ejemplo — componente

```ts
describe('AsesorComponent', () => {
  let fixture: ComponentFixture<AsesorComponent>;
  let turnoService: jasmine.SpyObj<TurnoService>;

  beforeEach(async () => {
    turnoService = jasmine.createSpyObj<TurnoService>('TurnoService', ['obtenerFila', 'llamarSiguiente']);
    turnoService.obtenerFila.and.returnValue(of(crearFila({ pendientes: [6, 7, 8] })));

    await TestBed.configureTestingModule({
      imports: [AsesorComponent],
      providers: [{ provide: TurnoService, useValue: turnoService }],
    }).compileComponents();

    fixture = TestBed.createComponent(AsesorComponent);
  });

  describe('cuando el asesor llama al siguiente', () => {
    it('debe mostrar el turno atendido', () => {
      // Arrange
      turnoService.llamarSiguiente.and.returnValue(of(crearTurno({ numero: 6 })));
      fixture.detectChanges();

      // Act
      porTestId(fixture, 'btn-llamar-siguiente').click();
      fixture.detectChanges();

      // Assert
      expect(porTestId(fixture, 'turno-atendido').textContent).toContain('6');
      expect(turnoService.llamarSiguiente).toHaveBeenCalledTimes(1);
    });
  });

  describe('cuando la fila está vacía', () => {
    it('debe mostrar el mensaje de fila vacía', () => {
      // Arrange
      turnoService.llamarSiguiente.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 409 })),
      );
      fixture.detectChanges();

      // Act
      porTestId(fixture, 'btn-llamar-siguiente').click();
      fixture.detectChanges();

      // Assert
      expect(porTestId(fixture, 'mensaje-error').textContent).toContain('vacía');
    });
  });
});
```

### 3.4 Asincronía y tiempo

| Situación | Herramienta |
|---|---|
| Observable síncrono (`of`, `throwError`) | Nada especial: `detectChanges()` basta. |
| Temporizadores, `interval`, `debounceTime`, `setTimeout` | `fakeAsync` + `tick(ms)`; terminar con `discardPeriodicTasks()` si hay `interval`. |
| Promesas / async real | `async` + `await fixture.whenStable()`. |
| Prohibido | Esperas reales (`setTimeout` en la prueba), `done` con tiempos, `jasmine.DEFAULT_TIMEOUT_INTERVAL` alto. |

Recordatorio de la documentación de Angular: `createComponent()` **no** ejecuta el binding; hasta llamar `fixture.detectChanges()` la vista no refleja el estado ni corre `ngOnInit`.

## 4. Convenciones generales

- **Probar lo que ve el usuario**: verificar el DOM vía `data-testid`, no propiedades privadas del componente.
- **Un spy por servicio** con `jasmine.createSpyObj<T>` tipado; nunca el servicio real con `HttpClient` real en pruebas de componente.
- **Fixtures** en `src/testing/` con valores por defecto válidos y `Partial<T>` para sobrescribir solo lo relevante.
- **Sin `fit` / `fdescribe` / `xit`** en el código que se sube.
- **Independencia**: cada `it` reconfigura lo que necesita; no depender del orden.
- **Cubrir por pantalla**: caso feliz, error de la API (incluido `409` fila vacía y `404` turno inexistente) y estado vacío/cargando.
- Borrar o completar el spec por defecto que genera el CLI (`should create`) — no dejar specs triviales como única prueba.

## 5. Comandos

```bash
cd front
npx ng test                                   # modo watch con navegador
npx ng test --watch=false --browsers=ChromeHeadless   # una sola corrida (CI / agentes)
npx ng test --watch=false --code-coverage     # con cobertura en coverage/
npx ng test --include='src/app/services/**/*.spec.ts' --watch=false   # solo un grupo
```
