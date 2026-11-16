# clean-paseo: archivar workspaces en bulk — diseño

## Intención
Hoy en Paseo los workspaces se archivan de a uno. Rodrigo quiere ver todos sus
workspaces activos (~24) en una sola pantalla, ordenarlos por actividad, marcar
varios y archivarlos de una vez.

## Objetivos
- Pantalla con la lista de workspaces activos de todos los proyectos.
- Orden por última actividad (`activityAt`), por defecto la más vieja primero; se puede invertir.
- Selección múltiple (checkbox por fila + seleccionar todos) y botón "Archivar N".
- Confirmación antes de archivar.

## No-objetivos
- Chequeos de git (rama mergeada, commits sin pushear). Fue el enfoque B, descartado por ahora.
- Borrado "duro": se usa el archive oficial de Paseo, no se tocan archivos a mano.
- Filtros, búsqueda y reglas automáticas de limpieza.

## Anti-objetivos
- Archivar algo sin que el usuario lo vea marcado y lo confirme.
- Que un error al archivar uno frene en silencio el resto o deje la lista desactualizada.

## Restricciones
- Paseo 0.15.0 y SDK `@getpaseo/plugin` (el que trae el CLI instalado).
- Solo API pública: `usePaseo().workspaces.list()` / `.archive(id)`, `addScreen` y `addSidebarHeaderItem`.

## Enfoques
- **A. Solo cliente (elegido).** La pantalla lista y archiva con `usePaseo()`. Es poco código y no corre nada en el daemon.
- **B. Cliente + servidor con chequeos de git.** Da avisos más ricos, pero cuesta el doble y hay que manejar worktrees rotos. Descartado por ahora; se puede sumar después.
- **Script de CLI.** Descartado: no da una pantalla para revisar y elegir.

## Diseño
- Plugin local en este directorio, generado con `paseo plugin init` e instalado desde el directorio.
- Una entrada "Limpiar workspaces" en el sidebar abre la pantalla.
- Cada fila muestra: checkbox, título (o nombre), proyecto, "hace X" según `activityAt` ("sin actividad" si es null), estado y diff `+a −d` si existe.
- ⚠ en las filas con estado `running` o `needs_input`. Se pueden seleccionar igual.
- Las filas con `archivingAt` se muestran deshabilitadas.
- Archivar: confirmación dentro de la pantalla ("Archivar N workspaces"). Después se archivan uno por uno, con progreso, y siguen aunque alguno falle. Al final se muestran los errores por fila y se refresca la lista.

## Decisiones mías (revisables)
- Los workspaces sin `activityAt` se ordenan como los más viejos.
- Archivar en secuencia, no en paralelo, para no saturar al daemon.
- Los workspaces `local_checkout` (por ejemplo "main") también aparecen. Archivarlos no borra el repo.

## Queda para quien lo construya
- La forma exacta de paginar `list()` para traer todos los workspaces.
- Los componentes de UI concretos del SDK (`client/ui`) y el ícono.
