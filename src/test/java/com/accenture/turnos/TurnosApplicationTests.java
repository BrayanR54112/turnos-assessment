package com.accenture.turnos;

import com.accenture.turnos.entity.Turno;
import com.accenture.turnos.repository.TurnoRepository;
import com.accenture.turnos.service.TurnoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class TurnoServiceTest {

    @Autowired
    private TurnoService service;

    @Autowired
    private TurnoRepository repository;

    @BeforeEach
    void reset() {
        repository.deleteAll();
        service.cargarDatosIniciales();
    }

    @Test
    void respetaOrdenDeLlegadaYNoLlamaCancelados() {
        assertEquals(12.2, service.calcularPromedioEspera());

        // El primero en salir debe ser el 6 (8:25)
        Turno primero = service.llamarSiguiente();
        assertEquals(6, primero.getNumero());

        // Si el cliente cancela el 7 (8:34), el siguiente llamado debe saltar al 8 (8:38)
        service.cancelarTurno(7);
        assertEquals(8, service.llamarSiguiente().getNumero());
        assertEquals(9, service.llamarSiguiente().getNumero());
        assertEquals(10, service.llamarSiguiente().getNumero());

        // Fila vacía debe fallar con "No hay turnos en espera"
        assertThrows(IllegalStateException.class, () -> service.llamarSiguiente());
    }
}