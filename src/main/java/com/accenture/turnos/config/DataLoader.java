package com.accenture.turnos.config;

import com.accenture.turnos.model.Turno;
import com.accenture.turnos.repository.TurnoRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

@Configuration
public class DataLoader {

    @Bean
    CommandLineRunner initDatabase(TurnoRepository turnoRepository) {
        return args -> {
            // Solo carga si la base de datos está vacía
            if (turnoRepository.count() == 0) {
                // Se lee desde el classpath (src/main/resources) para no depender del directorio de arranque
                ClassPathResource archivo = new ClassPathResource("data/turnos_hoy.csv");
                try (BufferedReader br = new BufferedReader(
                        new InputStreamReader(archivo.getInputStream(), StandardCharsets.UTF_8))) {
                    String linea;
                    boolean esPrimeraLinea = true;

                    while ((linea = br.readLine()) != null) {
                        if (esPrimeraLinea) {
                            esPrimeraLinea = false;
                            continue;
                        }

                       
                        String[] datos = linea.split(";");
                        if (datos.length >= 4) {
                            Turno turno = new Turno();
                            turno.setNumero(Integer.parseInt(datos[0].trim()));
                            turno.setHoraSolicitud(datos[1].trim());
                            
                            String horaAtencion = datos[2].trim();
                            turno.setHoraAtencion(horaAtencion.isEmpty() ? null : horaAtencion);
                            
                            turno.setEstado(datos[3].trim());

                            turnoRepository.save(turno);
                        }
                    }
                    System.out.println("¡Turnos cargados exitosamente en la base de datos!");
                } catch (Exception e) {
                    System.out.println("No se pudo leer el archivo CSV: " + e.getMessage());
                }
            }
        };
    }
}