# EJCETICA — Contexto de la aplicación

## 1. Qué es

**EJCETICA** es una landing page / mini-juego educativo de **duelos 1 vs 1 por equipos** con preguntas abiertas de ética y paz. Dos equipos se enfrentan respondiendo preguntas al azar contra reloj: cada acierto dispara un tanque contra el rival y le quita una vida. Gana quien conserve más vidas.

- Sin login, sin backend, sin dependencias: **HTML + CSS + JavaScript puro**.
- Los datos (equipos y preguntas) se guardan en el navegador con **localStorage**.
- Para usarla basta abrir `index.html` en el navegador.

## 2. Estructura del proyecto

```
EJCETICA/
├── index.html   # Estructura: menú, 3 vistas, arena del duelo, overlay de ganador
├── styles.css   # Diseño minimalista verde, responsive, animaciones CSS
├── app.js       # Toda la lógica: datos, duelo, batalla de tanques en canvas, sonidos
└── CONTEXTO.md  # Este archivo
```

## 3. Navegación (menú de 3 opciones)

| Vista | Contenido |
|---|---|
| **Duelo** (inicial) | Solo selección de Equipo 1 vs Equipo 2, cantidad de preguntas (vidas), tiempo por turno e inicio del duelo + arena en vivo. |
| **Equipos** | Crear, editar y eliminar equipos con color personalizado (paleta + hexadecimal + tonos sugeridos). Mínimo 2 para jugar. |
| **Preguntas** | Crear, editar y eliminar preguntas abiertas (solo texto, sin categorías ni colores). Salen al azar sin repetirse hasta agotar el banco. |

## 4. Flujo del duelo

1. Se eligen dos equipos distintos.
2. Se define la **cantidad de preguntas (= vidas por equipo)** y el **tiempo por turno** (segundos, configurable).
3. Al iniciar, cada equipo parte con N vidas y 0 aciertos.
4. Cada ronda muestra una pregunta aleatoria y el temporizador arranca solo (30 s por defecto, pausable).
5. **Acierto** (botón o tecla): el tanque dispara al rival → al impactar le quita 1 vida y suma 1 acierto.
6. No hay botón de fallo: solo los aciertos hacen daño.
7. Gana quien tenga más vidas al acabarse las rondas (desempate por aciertos).
8. Al final: el perdedor con vidas en 0 explota en el acto; si le quedan vidas, llega un **misil de remate** a destruirlo. En empate cae una **bomba nuclear** que arrasa con ambos. Siempre hay mensaje de ganador y bandera(s) blanca(s).

## 5. Controles

- Botones **Acierto · disparar** en cada tarjeta (conmutan por turno, pero cualquiera puede responder).
- Teclado: **Q** dispara el Equipo 1, **W** dispara el Equipo 2 (solo con duelo iniciado, sin escribir en campos).
- Temporizador: iniciar/pausar/continuar y reinicio a 30 s (o al valor configurado).

## 6. Batalla de tanques (canvas)

- Campo de 1800 px con dos montañas nevadas, valle con río, pinos, nubes y sol. Cada tanque, al pie de su montaña, con el color de su equipo.
- **Balística realista:** tiro parabólico con gravedad; los aciertos calculan el ángulo exacto y la velocidad varía en cada disparo (distintas inclinaciones). Los fallos ambientales salen entre 5° y 55°.
- **Fuego ambiental:** cada 2 s, alternando tanques, tiros decorativos al valle sin daño.
- **Cámaras (4 vistas sincronizadas):** general fija con todo el campo, tríptico tanque A | bala | tanque B. La vista de la bala sigue el proyectil; al final encuadra al perdedor.
- **Daño progresivo por vidas:** normal → poco humo → humo oscuro + calcinado → fuego con resplandor → destruido (humo y llamas persistentes), con bandera blanca de rendición.
- **Misil de remate:** nace tras la montaña del ganador, pequeño y lejano, crece al acercarse y detona sobre el perdedor.
- **Empate nuclear:** sirena, bomba cayendo con silbido, destello blanco, hongo nuclear y destrucción total.
- Efectos: explosiones por capas, ondas de choque, marcas de quemado, sacudida de pantalla, estelas punteadas, humo volumétrico y fuego con núcleo incandescente.

## 7. Sonidos (sintetizados con WebAudio, sin archivos)

Clic, acierto, nueva ronda, tic-tac final, alarma de tiempo, disparo, impacto metálico, explosión, cohete en vuelo, sirena, silbido de bomba, estruendo nuclear, fanfarria de victoria y tono de empate.

## 8. Decisiones de diseño tomadas en el camino

- Se eliminó el sistema de roles/admin: pantalla normal con menú de 3 opciones.
- Sin textos de SENA ni emojis: estilo minimalista propio en verde.
- Sin categorías ni colores en preguntas.
- Sin botón de fallo: solo el acierto dispara.
- Pregunta ubicada encima de la vista general; marcador con vidas, aciertos e info bajo cada vista individual.

## 9. Cómo probarlo

1. Abrir `index.html` (doble clic o `Ctrl+O` en el navegador).
2. Ir a **Equipos** y **Preguntas** para ver/editar el contenido inicial.
3. En **Duelo**, elegir equipos, vidas y segundos, pulsar *Iniciar duelo*.
4. Responder con los botones o teclas **Q**/**W** y ver la batalla.
5. Para publicar en GitHub: `git init`, `git add .`, `git commit -m "EJCETICA"`, crear el repo remoto y `git remote add origin <URL>`, luego `git push -u origin main`.
