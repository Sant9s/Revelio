# Revelio

Demo 3D de una casa grande y abandonada. Explorá seis habitaciones conectadas por un pasillo central.

Abrí `project.godot` con Godot 4.7 y presioná **F5**.

| Control | Acción |
| --- | --- |
| WASD / flechas | Caminar |
| Mantener Shift al moverse | Correr |
| Espacio | Saltar |
| Mantener Ctrl | Agacharse |
| Ratón | Mirar |
| E | Abrir una puerta o hablar con Julián al apuntarlos de cerca |
| V | Alternar entre primera y tercera persona |
| Esc | Soltar el cursor |
| Clic izquierdo | Volver al juego |

La escena principal está en `demo_3d/casa_abandonada.tscn`.

Las seis ventanas están tapadas por completo. Julián espera junto al portón de entrada/salida, detrás de la posición inicial del jugador. Acercate y apuntale con E para conversar. Primero leés a Julián y apretás E o Enter para ver tus respuestas. Elegí con clic o flechas y Enter. El menú principal termina con «Chau, nos vemos» para salir; dentro de cada tema, «Quiero hablar de otra cosa» vuelve directamente al menú principal. Esc también termina la conversación. El movimiento y la cámara quedan bloqueados mientras hablás.

La geometría y la ubicación del personaje se conservan al ejecutar `node tools/generate_house.mjs`. El diálogo está en `demo_3d/house_dialogue.gd`.

Verificación: `Godot --headless --path . --script res://tools/test_house_dialogue.gd`. Agregá `-- --preview-dialogue` sin `--headless` para inspeccionar la conversación en pantalla.
