# Estándar de pruebas — Backend (Java 21 + Spring Boot 4)

Este documento define **cómo se estructura el backend y cómo se escriben sus pruebas**. Aplica a personas y a agentes de IA. Las reglas operativas resumidas para agentes están en [rules.md](../../rules.md).

> **Versiones reales del proyecto** (según `pom.xml`): Spring Boot **4.1.2**, Java **21**, JUnit 5 (Jupiter), AssertJ y Mockito vía los starters `*-test`.
> Si hay dudas sobre versiones, **manda el `pom.xml`.** En Spring Boot 4 cambiaron los módulos y paquetes de prueba (ver [§6](#6-cambios-de-spring-boot-4-que-afectan-a-las-pruebas)).
>
> El backend vive en la raíz del repositorio; las rutas `src/...` de este documento son relativas a ella.

---

## 1. Estructura del código

Paquete raíz: `com.accenture.turnos`. Organización **por capa**, que es simple y suficiente para el tamaño del reto.

```
src/main/java/com/accenture/turnos/
├── TurnosApplication.java
├── config/        ClockConfig (bean Clock), CorsConfig, propiedades @ConfigurationProperties
├── controller/    TurnoController, FilaController        → solo HTTP: valida, delega, mapea a DTO
├── service/       TurnoService, CargaTurnosService       → reglas de negocio y transacciones
├── repository/    TurnoRepository, ControlFilaRepository → Spring Data JPA (+ @Lock)
├── domain/        Turno, EstadoTurno, ControlFila        → entidades JPA y enums
├── dto/           TurnoResponse, FilaResponse, ErrorResponse (record)
└── exception/     FilaVaciaException, TurnoNoEncontradoException, GlobalExceptionHandler

src/main/resources/
├── application.properties
└── data/turnos_hoy.csv
```

Reglas de diseño que hacen el código **probable**:

| Regla | Por qué importa para las pruebas |
|---|---|
| La hora se obtiene **siempre** de un `Clock` inyectado. Prohibido `LocalDateTime.now()` sin `Clock`. | Las pruebas usan `Clock.fixed(...)` y los resultados no dependen de cuándo se ejecutan. |
| Inyección por **constructor** (sin `@Autowired` en campos). | Las pruebas unitarias crean la clase con `new` y mocks, sin Spring. |
| Los controladores no tienen lógica de negocio. | La lógica se prueba en el servicio con pruebas rápidas; el controlador solo se prueba en su contrato HTTP. |
| La API devuelve `record` DTO, nunca entidades. | El contrato JSON se puede verificar campo a campo. |
| Las excepciones de negocio se traducen a HTTP **solo** en `GlobalExceptionHandler`. | Un único lugar que probar para `404`, `409`, etc. |
| `CargaTurnosService` recibe la ruta / `Reader` del CSV como parámetro. | Las pruebas usan CSVs propios en `src/test/resources/csv/`. |

## 2. Estructura de las pruebas

Las pruebas **replican el paquete** de la clase que prueban.

```
src/test/java/com/accenture/turnos/
├── service/
│   ├── TurnoServiceTest.java                 unitaria (Mockito, sin Spring)
│   └── CargaTurnosServiceTest.java           unitaria
├── controller/
│   └── TurnoControllerTest.java              slice @WebMvcTest
├── repository/
│   └── TurnoRepositoryTest.java              slice @DataJpaTest
├── integration/
│   ├── FilaIntegrationTest.java              @SpringBootTest + MockMvc, H2 real
│   └── ConcurrenciaIntegrationTest.java      50 hilos, números únicos
├── bdd/
│   ├── CucumberTest.java                     runner JUnit Platform Suite
│   ├── CucumberSpringConfiguration.java      @CucumberContextConfiguration + @SpringBootTest
│   └── steps/FilaSteps.java                  step definitions
└── support/
    ├── TurnoBuilder.java                     Test Data Builder
    └── Relojes.java                          Clock fijos reutilizables

src/test/resources/
├── application-test.properties
├── csv/                                      CSVs de prueba (desordenado, duplicado, vacío, inválido)
└── features/                                 archivos .feature (Gherkin, en español)
    ├── pedir_turno.feature
    └── llamar_siguiente.feature
```

### 2.1 Tipos de prueba y cuándo usar cada uno

| Tipo | Herramienta | Qué prueba | Velocidad | Sufijo |
|---|---|---|---|---|
| **Unitaria** | JUnit 5 + Mockito + AssertJ | Reglas de negocio de un servicio aislado | ms | `*Test` |
| **Slice web** | `@WebMvcTest` + `MockMvcTester` + `@MockitoBean` | Contrato HTTP: rutas, códigos, JSON, validación, `GlobalExceptionHandler` | ~1 s | `*ControllerTest` |
| **Slice JPA** | `@DataJpaTest` (H2) | Consultas, orden, bloqueos del repositorio | ~1-2 s | `*RepositoryTest` |
| **Integración** | `@SpringBootTest` + `@AutoConfigureMockMvc` | Flujo completo con base real: carga CSV → fila → atención | s | `*IntegrationTest` |
| **Aceptación (BDD)** | Cucumber + Gherkin + `cucumber-spring` | Reglas de negocio del reto en lenguaje de negocio | s | `.feature` |

Pirámide: **muchas unitarias, varias slice, pocas de integración, una feature por regla de negocio.**

> Se usa el sufijo `*IntegrationTest` (no `*IT`) para que Surefire las ejecute con `mvn test`, como indica el README.

## 3. Patrón AAA (Arrange – Act – Assert)

**Toda** prueba JUnit sigue AAA, con los tres bloques marcados por comentario y separados por una línea en blanco.

| Bloque | Contenido | Reglas |
|---|---|---|
| `// Arrange` | Datos, mocks, `Clock` fijo, estado inicial | Usar builders; solo lo relevante para *esta* prueba. |
| `// Act` | **Una sola** llamada al comportamiento bajo prueba | Si hay dos acciones, son dos pruebas (excepción: flujos de integración). |
| `// Assert` | Verificaciones del resultado | AssertJ. Varias aserciones sobre **el mismo** resultado están bien; usar `SoftAssertions`/`assertThat(...).extracting` si son muchas. |

Para excepciones, el Act y el Assert se unen en `assertThatThrownBy` / `assertThatExceptionOfType` y se marca `// Act & Assert`.

### 3.1 Nombres

- Clase: `<ClaseBajoPrueba>Test`.
- Método: `metodo_debeResultado_cuandoCondicion` (en español, snake entre las tres partes).
- `@DisplayName` en español, legible como frase de negocio.
- Agrupar por método/escenario con `@Nested`.

### 3.2 Ejemplo — unitaria de servicio

```java
@ExtendWith(MockitoExtension.class)
class TurnoServiceTest {

    private static final Clock RELOJ = Clock.fixed(Instant.parse("2026-10-29T13:00:00Z"), ZoneId.of("America/Bogota"));

    @Mock
    private TurnoRepository turnoRepository;

    @Mock
    private ControlFilaRepository controlFilaRepository;

    private TurnoService turnoService;

    @BeforeEach
    void setUp() {
        turnoService = new TurnoService(turnoRepository, controlFilaRepository, RELOJ);
    }

    @Nested
    @DisplayName("llamarSiguiente")
    class LlamarSiguiente {

        @Test
        @DisplayName("lanza FilaVaciaException cuando no hay turnos pendientes")
        void llamarSiguiente_debeLanzarFilaVacia_cuandoNoHayPendientes() {
            // Arrange
            when(turnoRepository.findPrimerPendiente()).thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> turnoService.llamarSiguiente())
                    .isInstanceOf(FilaVaciaException.class);
        }

        @Test
        @DisplayName("marca como atendido al primer pendiente con la hora del reloj")
        void llamarSiguiente_debeAtenderAlPrimero_cuandoHayPendientes() {
            // Arrange
            Turno primero = TurnoBuilder.unTurno().numero(6).pendiente().build();
            when(turnoRepository.findPrimerPendiente()).thenReturn(Optional.of(primero));

            // Act
            TurnoResponse atendido = turnoService.llamarSiguiente();

            // Assert
            assertThat(atendido.numero()).isEqualTo(6);
            assertThat(primero.getEstado()).isEqualTo(EstadoTurno.ATENDIDO);
            assertThat(primero.getHoraAtencion()).isEqualTo(LocalDateTime.now(RELOJ));
        }
    }
}
```

> Los nombres de métodos del repositorio en los ejemplos son ilustrativos: usar los que existan en el código.

### 3.3 Ejemplo — slice web (contrato HTTP)

```java
@WebMvcTest(TurnoController.class)
class TurnoControllerTest {

    @Autowired
    private MockMvcTester mvc;

    @MockitoBean
    private TurnoService turnoService;

    @Test
    @DisplayName("POST /api/turnos/llamar-siguiente responde 409 si la fila está vacía")
    void llamarSiguiente_debeResponder409_cuandoFilaVacia() {
        // Arrange
        when(turnoService.llamarSiguiente()).thenThrow(new FilaVaciaException());

        // Act
        MvcTestResult resultado = mvc.post().uri("/api/turnos/llamar-siguiente").exchange();

        // Assert
        assertThat(resultado).hasStatus(HttpStatus.CONFLICT);
        assertThat(resultado).bodyJson().extractingPath("$.status").isEqualTo(409);
        assertThat(resultado).bodyJson().extractingPath("$.path").isEqualTo("/api/turnos/llamar-siguiente");
    }
}
```

- `@WebMvcTest` carga controladores, `@ControllerAdvice`, filtros y convertidores; **no** carga servicios ni `@Configuration` propias: todo colaborador va con `@MockitoBean`.
- Preferir `MockMvcTester` (AssertJ) sobre `MockMvc` + `andExpect`.

### 3.4 Ejemplo — integración

```java
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(RelojFijoTestConfig.class)   // reemplaza el bean Clock por uno fijo
class FilaIntegrationTest {

    @Autowired
    private MockMvcTester mvc;

    @Test
    @DirtiesContext(methodMode = DirtiesContext.MethodMode.AFTER_METHOD)
    @DisplayName("la fila inicial respeta hora_solicitud aunque el CSV venga desordenado")
    void fila_debeEstarOrdenadaPorHoraSolicitud_cuandoArrancaConCsvDesordenado() {
        // Arrange — el CSV real se carga al iniciar el contexto

        // Act
        MvcTestResult resultado = mvc.get().uri("/api/fila").exchange();

        // Assert
        assertThat(resultado).hasStatusOk();
        assertThat(resultado).bodyJson().extractingPath("$.pendientes[*].numero").isEqualTo(List.of(6, 7, 8, 9, 10));
        assertThat(resultado).bodyJson().extractingPath("$.esperaPromedioMinutos").isEqualTo(12.2);
    }
}
```

- Cada prueba que **modifica** la fila debe dejar el estado limpio: `@DirtiesContext` (costoso) o, preferible, recargar datos en `@BeforeEach` con un servicio/SQL de prueba.
- Pruebas de concurrencia: `ExecutorService` + `CountDownLatch` para arrancar todos los hilos a la vez; verificar con `assertThat(numeros).doesNotHaveDuplicates()`. **Nunca** `Thread.sleep` para sincronizar.

## 4. Gherkin + Cucumber (pruebas de aceptación)

Gherkin se usa para las **reglas de negocio del reto**, escritas para que las lea alguien que no programa. No sustituye a las unitarias: cada escenario es un ejemplo de una regla.

### 4.1 Reglas de escritura

1. Archivo en español con `# language: es` en la primera línea.
   Palabras clave: `Característica`, `Regla`, `Antecedentes`, `Escenario`, `Esquema del escenario`, `Ejemplos`, `Dado/Dada`, `Cuando`, `Entonces`, `Y`, `Pero`.
2. **Estilo declarativo**: describir *qué* pasa en el negocio, no *cómo* (nada de "hago clic", "envío POST", "JSON", "tabla").
3. **Un comportamiento por escenario.** Un solo `Cuando` por escenario.
4. `Dado` = contexto (Arrange), `Cuando` = acción (Act), `Entonces` = resultado observable (Assert).
5. `Antecedentes` solo para contexto común a **todos** los escenarios de la característica.
6. `Esquema del escenario` + `Ejemplos` cuando la misma regla se prueba con varios datos.
7. Los step definitions **delegan**: llaman a la API vía `MockMvcTester` o al servicio; no contienen lógica de negocio.

### 4.2 Ejemplo

```gherkin
# language: es
Característica: Llamar al siguiente turno
  Como asesor
  quiero llamar al siguiente cliente en orden de llegada
  para atender a las personas de forma justa

  Antecedentes:
    Dado que la fila tiene los turnos pendientes 6, 7, 8, 9 y 10

  Escenario: Se atiende primero a quien llegó antes
    Cuando el asesor llama al siguiente
    Entonces se atiende el turno 6
    Y la fila queda con los turnos 7, 8, 9 y 10

  Escenario: No se puede llamar con la fila vacía
    Dado que no quedan turnos pendientes
    Cuando el asesor llama al siguiente
    Entonces el sistema informa que la fila está vacía
```

### 4.3 Configuración Cucumber (cuando se agregue)

Dependencias de prueba necesarias (**todavía no están en el `pom.xml`**): `io.cucumber:cucumber-java`, `io.cucumber:cucumber-spring`, `io.cucumber:cucumber-junit-platform-engine` (gestionar versión con `io.cucumber:cucumber-bom`) y `org.junit.platform:junit-platform-suite`.

```java
// Runner
@Suite
@IncludeEngines("cucumber")
@SelectClasspathResource("features")
@ConfigurationParameter(key = GLUE_PROPERTY_NAME, value = "com.accenture.turnos.bdd")
class CucumberTest {
}

// Contexto Spring compartido por todos los steps (solo una clase con esta anotación)
@CucumberContextConfiguration
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class CucumberSpringConfiguration {
}
```

- `@MockitoBean` solo funciona en la clase `@CucumberContextConfiguration`, no en las clases de steps.
- Los steps comparten estado del escenario mediante un bean `@ScenarioScope`.

## 5. Convenciones generales

- **Aserciones:** AssertJ (`assertThat`). No mezclar con `Assertions` de JUnit salvo `assertAll` puntual.
- **Mocks:** Mockito con `@ExtendWith(MockitoExtension.class)` en unitarias; `@MockitoBean` / `@MockitoSpyBean` en contexto Spring. **`@MockBean` no existe en Spring Boot 4.**
- **No mockear** lo que se está probando, ni `record` DTO, ni entidades: crearlos con builders.
- **Verificar interacciones** (`verify`) solo cuando el efecto es la interacción misma (ej. que se guardó). Preferir verificar el estado/resultado.
- **Datos de prueba:** builders en `support/` con valores por defecto válidos; la prueba solo fija lo que importa.
- **Independencia:** las pruebas no dependen del orden de ejecución ni comparten estado mutable.
- **Determinismo:** `Clock` fijo, sin `Random` sin semilla, sin `Thread.sleep`.
- **Una regla de negocio = al menos una prueba** (ver la regla de negocio en el [README](../../README.md)).

## 6. Cambios de Spring Boot 4 que afectan a las pruebas

Verificado en la documentación de Spring Boot 4.1 (Context7):

| Tema | Spring Boot 4 |
|---|---|
| Starters de prueba | Modulares: `spring-boot-starter-webmvc-test`, `spring-boot-starter-validation-test` (ya en el `pom.xml`); al agregar JPA, `spring-boot-starter-data-jpa-test`. |
| `@WebMvcTest`, `@AutoConfigureMockMvc` | Módulo `spring-boot-webmvc-test`, paquete `org.springframework.boot.webmvc.test.autoconfigure`. |
| `@DataJpaTest` | Módulo `spring-boot-data-jpa-test`, paquete `org.springframework.boot.data.jpa.test.autoconfigure`. |
| Mocks de beans | `@MockitoBean` / `@MockitoSpyBean` (`org.springframework.test.context.bean.override.mockito`). |
| MockMvc con AssertJ | `MockMvcTester` se autoconfigura junto a `MockMvc` si AssertJ está presente. |
| `TestRestTemplate` | Requiere `spring-boot-resttestclient` y `@AutoConfigureTestRestTemplate`. Preferir `MockMvcTester`. |

Si un import no compila, confirmar el paquete en la documentación de la versión del `pom.xml` antes de cambiar de enfoque.

## 7. Comandos

```bash
mvn test                                    # todas las pruebas
mvn test -Dtest=TurnoServiceTest            # una clase
mvn test -Dtest='TurnoServiceTest$LlamarSiguiente'   # un @Nested
mvn test -Dtest=CucumberTest                # solo aceptación (Gherkin)
```
