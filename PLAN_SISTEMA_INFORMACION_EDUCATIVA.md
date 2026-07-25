# PLAN_SISTEMA_INFORMACION_EDUCATIVA

Documento de planificación técnica y funcional para evolucionar Examio hacia un Sistema de Información Educativa orientado a la toma de decisiones, la mejora continua y la lectura pedagógica de las evaluaciones.

Este archivo es independiente de `PLAN.md`. No reemplaza el plan técnico general del frontend; lo complementa con una hoja de ruta especializada en analítica educativa, psicometría y visión institucional.

---

## 1. Estado de partida

### 1.1 Datos existentes aprovechables

Examio ya registra suficiente materia prima para una primera capa de analítica descriptiva:

- intentos de examen con estados, fechas, notas y número de intento;
- respuestas por pregunta;
- opciones seleccionadas y sus cambios históricos;
- tiempo de permanencia por pregunta;
- navegación del alumno dentro del examen;
- alertas antifraude y eventos de integridad;
- actividades, grupos, preguntas y opciones;
- materias, divisiones/comisiones y carreras;
- alumnos, docentes y actas;
- resultados corregidos y consultas históricas por alumno.

### 1.2 Analítica actualmente posible sin cambiar el modelo de datos

Con los datos anteriores ya es posible construir:

- rendimiento histórico del alumno;
- promedio, mediana, dispersión y tasa de aprobación por evaluación;
- análisis básico de dificultad por pregunta;
- frecuencia de selección de distractores en opción múltiple;
- tiempo medio por pregunta y por intento;
- evolución por materia, comisión y docente dentro del alcance actual;
- alertas de integridad y frecuencia de eventos;
- comparativas entre intentos, alumnos y evaluaciones;
- visibilidad de pendientes de corrección manual.

### 1.3 Brechas estructurales

El sistema todavía carece de:

- metadata curricular explícita por pregunta y grupo;
- cohorte y período académico como dimensiones formales;
- versionado histórico estable de preguntas y opciones;
- banca de preguntas realmente reutilizable;
- rúbricas y criterios estructurados para respuestas abiertas;
- estados funcionales de revisión y publicación pedagógica;
- workflow formal para alertas y anomalías;
- capa analítica unificada con contratos de métricas;
- una semántica clara para cobertura curricular y nivel cognitivo.

---

## 2. Criterios de diseño del roadmap

El plan se organiza bajo estas reglas:

1. Separar captura, semántica, procesamiento y presentación.
2. No diseñar dashboards antes de asegurar que los datos existen.
3. No confundir correlación con causalidad.
4. No convertir alertas antifraude en acusaciones automáticas.
5. No generar rankings simplistas de docentes.
6. No aplicar psicometría avanzada sin tamaño muestral y contexto suficientes.
7. Mantener compatibilidad con los registros históricos legacy.
8. Mostrar "información no disponible" cuando falten datos históricos.
9. Priorizar datos fundacionales baratos de capturar y caros de reconstruir.
10. Hacer explícito qué métrica significa, qué no significa y con qué muestra puede usarse.

### Capas conceptuales

| Capa | Responsabilidad | Riesgo si se mezcla |
|---|---|---|
| Captura de datos | Registrar hechos observables durante la operación normal | Perder historia o registrar tarde |
| Modelo semántico académico | Dar significado pedagógico al dato | Métricas sin contexto |
| Procesamiento analítico | Calcular indicadores, comparaciones y tendencias | Dashboards inconsistentes |
| Presentación e interpretación | Mostrar evidencia y alertas comprensibles | Conclusiones ambiguas o causales |

---

## 3. Fases del roadmap

| Fase | Objetivo | Requerimientos clave | Resultado verificable |
|---|---|---|---|
| Fase 0 | Preparación y contratos | SIE-RT-001 a SIE-RT-004 | Las métricas tienen contrato y reglas de exposición |
| Fase 1 | Datos fundacionales | SIE-RD-001 a SIE-RD-005 + SIE-RF-001 | El sistema ya captura el contexto pedagógico mínimo |
| Fase 2 | Analítica con datos actuales | SIE-RF-002 | Se publican indicadores descriptivos sobre el dato ya existente |
| Fase 3 | Analítica curricular | SIE-RF-003 | El sistema explica cobertura y balance cognitivo |
| Fase 4 | Calidad del instrumento e integridad | SIE-RF-004 y SIE-RF-005 | Se detectan preguntas/evaluaciones a revisar y se gestionan anomalías |
| Fase 5 | Analítica longitudinal | SIE-RF-006 | Existen comparativas por materia, comisión, cohorte, carrera e institución |
| Fase 6 | Analítica de preguntas abiertas | SIE-RF-007 | Las respuestas abiertas pueden analizarse con rúbrica y consistencia |
| Fase 7 | Inteligencia educativa avanzada | SIE-RF-008 y SIE-RF-009 | Hay psicometría, recomendaciones y evidencias exportables |

### Orden técnico sugerido por fase

1. Definir contrato.
2. Definir modelo.
3. Implementar captura o reutilización del dato.
4. Implementar servicios de cálculo.
5. Implementar API de lectura.
6. Implementar UI o reporte.
7. Validar muestras y permisos.
8. Escribir tests y ejemplos.
9. Documentar métricas y límites.

### Definition of Done transversal

Cada fase solo puede darse por terminada cuando:

- los datos requeridos quedan disponibles o reutilizados correctamente;
- las métricas tienen definición documentada;
- el sistema devuelve advertencias si falta muestra o contexto;
- no se alteran resultados históricos;
- la UI o el reporte muestran la información de forma explicable;
- existen pruebas o validaciones manuales reproducibles;
- la documentación técnica se actualiza.

---

## 4. Requerimientos reales del roadmap

### Fase 0 – Preparación y contratos

Objetivo: evitar que la evolución analítica quede dispersa en dashboards aislados o cálculos incompatibles.

#### SIE-RT-001 – Catálogo formal de métricas y contratos

- Objetivo: definir cada métrica analítica con una semántica única y compartida.
- Problema que resuelve: hoy la misma idea puede calcularse de forma distinta en distintos reportes.
- Descripción funcional: el sistema debe disponer de un catálogo de métricas con nombre, fórmula, población incluida, exclusiones, nivel de agregación, versión y fecha de vigencia.
- Actores involucrados: backend, frontend, analista funcional, docente, administrador.
- Datos necesarios:
  - ya existentes: intentos, respuestas, opciones, navegación, alertas, notas.
  - nuevos: definiciones de métricas, versiones de contrato, criterios de exclusión y contexto.
- Reglas de negocio: una métrica visible no puede existir sin definición; las versiones anteriores deben conservarse.
- Dependencias: ninguna funcional; es el punto de partida.
- Resultado esperado: todos los consumidores analíticos pueden referenciar la misma definición.
- Criterios de aceptación: cada indicador principal tiene contrato escrito y validable.
- Prioridad: Fundacional.
- Etapa propuesta: Fase 0.

#### SIE-RT-002 – Política de tamaño mínimo y comparabilidad

- Objetivo: impedir que el sistema muestre conclusiones débiles con pocas observaciones.
- Problema que resuelve: muchas métricas son engañosas cuando se calculan con muestras pequeñas.
- Descripción funcional: el sistema debe poder marcar indicadores como no confiables o insuficientes cuando la muestra no alcance un umbral definido.
- Actores involucrados: docente, administrador, analista institucional.
- Datos necesarios:
  - ya existentes: conteos de intentos, respuestas, preguntas y grupos.
  - nuevos: umbrales de confiabilidad y reglas de comparabilidad por tipo de análisis.
- Reglas de negocio: si no hay muestra suficiente, el sistema debe mostrar "información no disponible" o equivalente.
- Dependencias: SIE-RT-001.
- Resultado esperado: la analítica evita interpretaciones espurias.
- Criterios de aceptación: las vistas no muestran indicadores como estables cuando la muestra es insuficiente.
- Prioridad: Fundacional.
- Etapa propuesta: Fase 0.

#### SIE-RT-003 – Capa analítica reutilizable

- Objetivo: centralizar agregaciones, comparaciones y cálculos.
- Problema que resuelve: calcular la misma métrica en múltiples lugares crea inconsistencias y duplicación.
- Descripción funcional: el sistema debe ofrecer un servicio o capa analítica que reciba dimensiones, filtros y contrato de métrica, y devuelva resultados normalizados.
- Actores involucrados: procesos internos, backend, frontend, reportes.
- Datos necesarios:
  - ya existentes: todas las entidades académicas y de evaluación.
  - nuevos: cachés o vistas materializadas si el volumen lo justifica.
- Reglas de negocio: la capa analítica debe respetar los contratos del catálogo y no introducir fórmulas locales ad hoc.
- Dependencias: SIE-RT-001 y SIE-RT-002.
- Resultado esperado: cualquier dashboard consume la misma fuente lógica.
- Criterios de aceptación: dos vistas distintas devuelven el mismo resultado para la misma métrica.
- Prioridad: Alta.
- Etapa propuesta: Fase 0.

#### SIE-RT-004 – Política de agregación, anonimización y permisos

- Objetivo: limitar qué nivel de detalle puede ver cada actor.
- Problema que resuelve: no toda información debe exponerse con el mismo nivel de granularidad.
- Descripción funcional: el sistema debe definir qué agregaciones, desgloses y exportaciones puede consultar alumno, docente, administrador y autoridad institucional.
- Actores involucrados: alumno, docente, administrador, autoridad institucional.
- Datos necesarios:
  - ya existentes: roles, materias, comisiones, alumnos, docentes.
  - nuevos: reglas de anonimización por nivel de acceso y por tamaño de muestra.
- Reglas de negocio: la información individual debe protegerse cuando el análisis institucional no requiera identificación nominal.
- Dependencias: SIE-RT-001 y SIE-RT-002.
- Resultado esperado: se habilita una analítica útil sin exponer información innecesaria.
- Criterios de aceptación: los roles no autorizados no reciben desgloses indebidos.
- Prioridad: Fundacional.
- Etapa propuesta: Fase 0.

### Fase 1 – Datos fundacionales

Objetivo: comenzar a registrar el contexto pedagógico que hoy falta y que no puede reconstruirse luego.

#### SIE-RD-001 – Metadata curricular y taxonomía pedagógica

- Objetivo: asociar cada pregunta o grupo con significado curricular.
- Problema que resuelve: sin metadata no es posible analizar cobertura, competencias o contenidos.
- Descripción funcional: el sistema debe poder registrar materia, unidad, tema, contenido, competencia, objetivo de aprendizaje, resultado de aprendizaje y nivel cognitivo para preguntas y grupos.
- Actores involucrados: docente, administrador, procesos internos.
- Datos necesarios:
  - ya existentes: preguntas, grupos, actividades, materias, divisiones, carreras.
  - nuevos: campos curriculares y reglas de obligatoriedad/optionalidad.
- Reglas de negocio: no toda metadata debe ser obligatoria; parte puede ser configurable por institución.
- Dependencias: SIE-RT-001.
- Resultado esperado: una pregunta ya no es solo texto y opciones; pasa a tener contexto pedagógico.
- Criterios de aceptación: una pregunta puede quedar clasificada sin ambigüedad curricular básica.
- Prioridad: Fundacional.
- Etapa propuesta: Fase 1.

#### SIE-RD-002 – Cohortes, períodos y contexto histórico

- Objetivo: distinguir fechas, período académico, ciclo lectivo y cohorte.
- Problema que resuelve: no se puede comparar históricamente si solo se conserva la fecha de un examen.
- Descripción funcional: el sistema debe asociar cada evaluación, intento y resultado a un período académico formal y a una cohorte interpretable.
- Actores involucrados: institución, administrador, docente, analista.
- Datos necesarios:
  - ya existentes: fechas de intento, publicación, actas.
  - nuevos: período académico, ciclo lectivo, cohorte institucional y mapeos de legacy.
- Reglas de negocio: la cohorte no se deduce por año de fecha; debe ser una dimensión explícita.
- Dependencias: SIE-RT-001 y SIE-RD-001.
- Resultado esperado: se habilitan comparaciones longitudinales válidas.
- Criterios de aceptación: dos cohortes pueden diferenciarse sin inferencias frágiles.
- Prioridad: Fundacional.
- Etapa propuesta: Fase 1.

#### SIE-RD-003 – Versionado y snapshot histórico de preguntas

- Objetivo: preservar exactamente lo que el alumno vio al rendir.
- Problema que resuelve: si una pregunta cambia después, los intentos históricos pierden trazabilidad.
- Descripción funcional: el sistema debe registrar una versión inmutable de la pregunta, sus opciones, respuesta correcta, puntaje y metadata asociada cuando se use en una evaluación o intento.
- Actores involucrados: docente, alumno, backend, procesos internos.
- Datos necesarios:
  - ya existentes: pregunta, opción, intento, intento_pregunta, respuesta.
  - nuevos: versión de pregunta, snapshot de opciones, snapshot de metadata.
- Reglas de negocio: la pregunta editable y la pregunta utilizada en un intento no son el mismo objeto lógico.
- Dependencias: SIE-RD-001.
- Resultado esperado: la historia académica permanece consistente.
- Criterios de aceptación: editar una pregunta no altera intentos previos.
- Prioridad: Fundacional.
- Etapa propuesta: Fase 1.

#### SIE-RD-004 – Rúbricas, criterios y publicación/retroalimentación

- Objetivo: estructurar la corrección de preguntas abiertas y la comunicación de resultados.
- Problema que resuelve: hoy el sistema conoce la nota o el comentario, pero no el criterio pedagógico que la sustenta.
- Descripción funcional: el sistema debe registrar rúbricas, criterios, subcriterios, puntajes parciales, comentarios y estados de publicación del resultado.
- Actores involucrados: docente, alumno, administrador.
- Datos necesarios:
  - ya existentes: respuestas abiertas, corrección manual, notas finales.
  - nuevos: rúbricas, criterios, estado de publicación, visibilidad por actor.
- Reglas de negocio: el resultado calculado, corregido, validado y publicado no son equivalentes.
- Dependencias: SIE-RD-003.
- Resultado esperado: la corrección manual deja evidencia útil para análisis posterior.
- Criterios de aceptación: una respuesta abierta puede explicarse por criterio y no solo por nota.
- Prioridad: Alta.
- Etapa propuesta: Fase 1.

#### SIE-RD-005 – Alertas antifraude: estados y resolución

- Objetivo: transformar eventos antifraude en casos gestionables.
- Problema que resuelve: hoy se registran alertas, pero no su gestión funcional.
- Descripción funcional: el sistema debe registrar estados como pendiente, revisada, descartada, relevante o resuelta, junto con usuario, fecha y motivo.
- Actores involucrados: docente, administrador, autoridad institucional.
- Datos necesarios:
  - ya existentes: alertas de fraude y telemetría de navegación.
  - nuevos: resolución, clasificación y trazabilidad del caso.
- Reglas de negocio: una alerta no implica fraude por sí misma; solo evidencia para revisión humana.
- Dependencias: SIE-RT-004.
- Resultado esperado: la integridad académica deja de ser solo registro y pasa a ser workflow.
- Criterios de aceptación: una alerta puede cerrarse o descartarse con motivo y auditoría.
- Prioridad: Alta.
- Etapa propuesta: Fase 1.

### Fase 1 – Requerimiento funcional ligado a los datos fundacionales

#### SIE-RF-001 – Banca de preguntas y reutilización de grupos

- Objetivo: reutilizar contenido evaluativo sin duplicar exámenes completos.
- Problema que resuelve: hoy el docente puede crear evaluaciones, pero el contenido previo no opera como activo reutilizable completo.
- Descripción funcional: el sistema debe permitir buscar, filtrar, crear, guardar, reutilizar y asociar preguntas y grupos de preguntas desde una banca central, preservando su historia y contexto.
- Actores involucrados: docente, alumno, administrador.
- Datos necesarios:
  - ya existentes: preguntas, grupos, actividades, intentos.
  - nuevos: historial de uso, relación con versiones, metadata curricular y etiquetas de búsqueda.
- Reglas de negocio: una pregunta reutilizable no puede modificar retroactivamente intentos históricos; el uso de una pregunta debe quedar trazado.
- Dependencias: SIE-RD-001, SIE-RD-003 y SIE-RD-005.
- Resultado esperado: el contenido evaluativo se convierte en un recurso reutilizable y analizable.
- Criterios de aceptación: un docente puede tomar preguntas existentes, agregarlas a una nueva evaluación y consultar su uso histórico.
- Prioridad: Alta.
- Etapa propuesta: Fase 1.

### Fase 2 – Analítica con datos actuales

Objetivo: explotar la información ya capturada sin esperar nuevas migraciones.

#### SIE-RF-002 – Analítica descriptiva con datos actuales

- Objetivo: producir lectura del rendimiento del estudiante, la evaluación y la pregunta con los datos que ya existen.
- Problema que resuelve: hoy la plataforma muestra resultados operativos, pero no convierte esos resultados en evidencia pedagógica agregada.
- Descripción funcional: el sistema debe ofrecer vistas de evolución, promedio, mediana, dispersión, aprobación, rendimiento por materia/comisión, tiempos por pregunta, cambios de respuesta y preguntas omitidas.
- Actores involucrados: alumno, docente, administrador, autoridad institucional.
- Datos necesarios:
  - ya existentes: intentos, respuestas, opciones, historial, navegación, notas, alertas.
  - nuevos: ninguno obligatorio para la primera capa.
- Reglas de negocio: la analítica debe respetar la muestra mínima y el contexto de filtros.
- Dependencias: SIE-RT-001, SIE-RT-002 y SIE-RT-003.
- Resultado esperado: el sistema deja de limitarse a mostrar nota final y comienza a mostrar evidencia interpretativa.
- Criterios de aceptación: el mismo dato puede verse como serie temporal, resumen por materia y detalle por intento.
- Prioridad: Alta.
- Etapa propuesta: Fase 2.

### Fase 3 – Analítica curricular

Objetivo: medir qué se evalúa y cómo se reparte cognitivamente el examen.

#### SIE-RF-003 – Cobertura curricular y balance cognitivo

- Objetivo: responder qué contenidos y qué niveles cognitivos cubre una evaluación.
- Problema que resuelve: Examio hoy no puede decir con claridad qué tema o nivel cognitivo fue realmente evaluado.
- Descripción funcional: el sistema debe calcular cobertura por tema, unidad, competencia y objetivo, y también distribución por nivel cognitivo validado por docente.
- Actores involucrados: docente, institución, alumno.
- Datos necesarios:
  - ya existentes: preguntas, grupos, evaluaciones.
  - nuevos: metadata curricular y nivel cognitivo.
- Reglas de negocio: no existe una distribución correcta universal; el sistema describe y compara, no impone.
- Dependencias: SIE-RD-001 y SIE-RD-002.
- Resultado esperado: el docente puede ver si una evaluación está concentrada en recordar/comprender o si tiene equilibrio curricular.
- Criterios de aceptación: la cobertura y el balance pueden calcularse por evaluación y a través del tiempo.
- Prioridad: Alta.
- Etapa propuesta: Fase 3.

### Fase 4 – Calidad del instrumento e integridad

Objetivo: identificar preguntas y evaluaciones que merecen revisión y administrar anomalías de forma explícita.

#### SIE-RF-004 – Calidad de preguntas y evaluaciones

- Objetivo: evaluar si un ítem o una evaluación presenta señales de calidad o de revisión.
- Problema que resuelve: Examio aún no puede explicar de forma sistemática por qué una pregunta o un examen merece revisión.
- Descripción funcional: el sistema debe combinar dificultad, discriminación, distractores, tiempos, omisiones, cambios de respuesta y rendimiento por nivel para marcar señales explicables.
- Actores involucrados: docente, administrador, analista institucional.
- Datos necesarios:
  - ya existentes: respuestas, opciones, navegación, intentos, alertas.
  - nuevos: contratos de métrica e interpretación de calidad.
- Reglas de negocio: el sistema no debe emitir juicios absolutos; debe mostrar señales y razones.
- Dependencias: SIE-RT-001, SIE-RT-002 y SIE-RF-002.
- Resultado esperado: el docente sabe por qué una pregunta o evaluación quedó marcada como revisable.
- Criterios de aceptación: una etiqueta de revisión debe venir acompañada por señales observables.
- Prioridad: Alta.
- Etapa propuesta: Fase 4.

#### SIE-RF-005 – Integridad académica y revisión de anomalías

- Objetivo: gestionar alertas y eventos sin convertirlos en acusaciones automáticas.
- Problema que resuelve: hoy el sistema registra alertas pero no ofrece una vía clara de revisión y resolución.
- Descripción funcional: el sistema debe permitir revisar alertas, asociarlas a un intento, clasificarlas, resolverlas y conservar motivo y usuario responsable.
- Actores involucrados: docente, administrador, autoridad institucional.
- Datos necesarios:
  - ya existentes: alertas, navegación, intentos.
  - nuevos: estado de revisión, resolución, notas y trazabilidad del caso.
- Reglas de negocio: la evidencia de integridad es independiente de la culpabilidad.
- Dependencias: SIE-RD-005 y SIE-RT-004.
- Resultado esperado: la institución puede supervisar anomalías con criterio humano.
- Criterios de aceptación: toda alerta puede llegar a un estado cerrado con motivo y auditoría.
- Prioridad: Alta.
- Etapa propuesta: Fase 4.

### Fase 5 – Analítica longitudinal

Objetivo: comparar el comportamiento académico a lo largo del tiempo y entre estructuras comparables.

#### SIE-RF-006 – Analítica longitudinal por materia, comisión, cohorte, carrera e institución

- Objetivo: ofrecer comparativas históricas y estructurales útiles para la toma de decisiones.
- Problema que resuelve: el sistema tiene datos dispersos, pero todavía no una lectura longitudinal robusta.
- Descripción funcional: el sistema debe analizar rendimiento, aprobación, dificultad, evolución y diferencias entre materias, comisiones, cohortes, carreras e institución.
- Actores involucrados: docente, administrador, autoridad institucional.
- Datos necesarios:
  - ya existentes: materias, divisiones, carreras, intentos, actas.
  - nuevos: cohorte y período académico formal, y contexto histórico estable.
- Reglas de negocio: comparaciones solo válidas cuando existe contexto suficiente de equivalencia.
- Dependencias: SIE-RD-002 y SIE-RT-002.
- Resultado esperado: la institución puede detectar tendencias, materias con dificultades recurrentes y diferencias entre grupos.
- Criterios de aceptación: el sistema distingue entre comparación válida y comparación no confiable.
- Prioridad: Alta.
- Etapa propuesta: Fase 5.

### Fase 6 – Analítica de preguntas abiertas

Objetivo: analizar preguntas abiertas como parte del instrumento y no solo como texto a corregir.

#### SIE-RF-007 – Analítica de preguntas abiertas

- Objetivo: estudiar desempeño, consistencia y calidad de preguntas que requieren corrección manual.
- Problema que resuelve: hoy la respuesta abierta se corrige, pero no se explota analíticamente su historia ni sus criterios.
- Descripción funcional: el sistema debe permitir analizar rúbricas, subcriterios, puntajes parciales, observaciones del corrector y consistencia entre intentos.
- Actores involucrados: docente, alumno, administrador.
- Datos necesarios:
  - ya existentes: respuesta abierta, comentario del docente, nota final.
  - nuevos: rúbricas, criterios, subcriterios y estados de visibilidad.
- Reglas de negocio: no se asume corrección automática por IA.
- Dependencias: SIE-RD-004.
- Resultado esperado: las preguntas abiertas pueden entrar en analítica pedagógica sin perder contexto.
- Criterios de aceptación: un docente puede ver el desempeño por criterio y no solo por nota global.
- Prioridad: Media.
- Etapa propuesta: Fase 6.

### Fase 7 – Inteligencia educativa avanzada

Objetivo: avanzar hacia métricas más complejas, siempre que existan datos suficientes y contexto confiable.

#### SIE-RF-008 – Psicometría avanzada y consistencia interna

- Objetivo: habilitar indicadores psicométricos cuando la evaluación y la muestra lo permitan.
- Problema que resuelve: el sistema actual no está preparado para evaluar formalmente consistencia interna o discriminación refinada.
- Descripción funcional: el sistema debe poder calcular o exponer indicadores como consistencia interna, con criterios claros de aplicabilidad y exclusión.
- Actores involucrados: analista institucional, docente, administrador.
- Datos necesarios:
  - ya existentes: respuestas, aciertos, distribución de resultados.
  - nuevos: tamaño de muestra suficiente, criterios de exclusión y contexto de comparación.
- Reglas de negocio: no toda evaluación admite psicometría avanzada; el sistema debe marcar cuando no corresponde.
- Dependencias: SIE-RF-004 y SIE-RF-006.
- Resultado esperado: la institución dispone de análisis más fino sin sobredimensionar conclusiones.
- Criterios de aceptación: el sistema no calcula indicadores avanzados cuando la muestra o el tipo de examen no lo justifican.
- Prioridad: Avanzada.
- Etapa propuesta: Fase 7.

#### SIE-RF-009 – Recomendaciones pedagógicas, exportación y evidencia para decisión

- Objetivo: transformar métricas en mensajes accionables y transferibles.
- Problema que resuelve: la analítica solo es útil si puede convertirse en evidencia comprensible para docentes e institución.
- Descripción funcional: el sistema debe producir recomendaciones explicables, exportar reportes o resúmenes y presentar evidencia para decisiones académicas sin atribución causal automática.
- Actores involucrados: docente, administrador, autoridad institucional.
- Datos necesarios:
  - ya existentes: métricas analíticas previas.
  - nuevos: formato de exportación, reglas de redacción y políticas de visibilidad.
- Reglas de negocio: las recomendaciones deben explicarse por señales; no deben presentarse como verdad absoluta.
- Dependencias: SIE-RT-001, SIE-RT-004 y SIE-RF-004.
- Resultado esperado: Examio pasa de mostrar resultados a orientar revisión y mejora.
- Criterios de aceptación: cada recomendación puede trazarse a métricas y umbrales documentados.
- Prioridad: Avanzada.
- Etapa propuesta: Fase 7.

---

## 5. Datos fundacionales

### 5.1 Metadata curricular

La metadata de una pregunta o grupo debería poder ser:

- obligatoria:
  - materia;
  - grupo o sección de la evaluación;
  - tipo de pregunta.
- opcional:
  - unidad;
  - tema;
  - contenido;
  - competencia;
  - objetivo de aprendizaje;
  - resultado de aprendizaje.
- validada o definida por docente:
  - nivel cognitivo;
  - pertinencia curricular;
  - relación con competencias.
- configurable por institución:
  - obligatoriedad de campos;
  - vocabulario curricular;
  - taxonomía usada;
  - granularidad mínima aceptable.

La regla principal es simple: si un dato será necesario para interpretar una métrica futura, conviene capturarlo desde ahora. Lo que no se registra no puede reconstruirse con precisión histórica.

### 5.2 Qué no debe perderse históricamente

Registrar desde el inicio:

- versión de pregunta y de opciones;
- puntaje y respuesta correcta al momento del intento;
- asociación a grupo, materia y cohorte;
- nivel cognitivo validado;
- rúbrica o criterio aplicado;
- estado de publicación;
- estado de revisión de alertas.

---

## 6. Taxonomía cognitiva

La clasificación cognitiva no debe inferirse automáticamente como si fuera verdad objetiva. Debe ser una metadata definida o validada por el docente.

### Funcionamiento esperado

- la clasificación se asigna al crear o editar la pregunta o el grupo;
- puede modificarse mientras la pregunta no haya sido congelada en una versión histórica;
- una vez usada en una evaluación, la versión histórica conserva el nivel cognitivo original;
- los cambios posteriores generan una nueva versión o una nueva referencia editable;
- el sistema debe permitir analizar por nivel: recordar, comprender, aplicar, analizar, evaluar y crear.

### Impacto posterior

Esta clasificación habilita:

- balance cognitivo por evaluación;
- distribución cognitiva por materia;
- evolución histórica de la carga cognitiva;
- comparativas entre docentes y comisiones bajo contexto suficiente.

---

## 7. Versionado y snapshot histórico de preguntas

El punto crítico de la analítica histórica es preservar el contexto exacto bajo el cual respondió el alumno.

### Debe preservarse

- enunciado;
- opciones;
- respuesta correcta;
- puntaje;
- metadata curricular;
- nivel cognitivo;
- grupo;
- versión.

### Relación conceptual

- Pregunta editable: objeto de trabajo del docente.
- Versión de pregunta: representación inmutable de un estado específico.
- Pregunta utilizada en una evaluación: instancia congelada que ya no debe mutar.
- Pregunta registrada dentro de un intento: referencia histórica válida para cálculo y comparación.

### Regla esencial

Editar una pregunta no debe alterar:

- intentos ya iniciados;
- reportes históricos;
- métricas históricas;
- comparaciones longitudinales.

Si una pregunta cambia de forma material, el sistema debe registrar una nueva versión y conservar la anterior.

---

## 8. Banca de preguntas

La banca de preguntas debe evolucionar en dos etapas.

### Etapa inicial

- almacenamiento de preguntas y grupos;
- búsqueda y filtrado;
- clasificación curricular;
- asociación a materia y nivel cognitivo;
- reutilización en nuevas evaluaciones;
- versionado de contenido reutilizable;
- trazabilidad de uso.

### Etapa analítica

Cada pregunta debería poder mostrar:

- cantidad de usos;
- cantidad de respuestas;
- porcentaje de acierto;
- dificultad histórica;
- discriminación;
- tiempo promedio;
- tasa de omisión;
- cambios de respuesta;
- comportamiento de distractores;
- evaluaciones donde fue utilizada;
- evolución de sus indicadores.

### Precaución clave

Nunca comparar versiones distintas como si fueran el mismo ítem. Si una pregunta cambió, el sistema debe separar claramente:

- uso de la versión 1;
- uso de la versión 2;
- cambios que afectan comparabilidad.

---

## 9. Cohortes y períodos académicos

El plan necesita una dimensión temporal académica explícita.

- Fecha: instante puntual de una acción.
- Período académico: tramo institucional de análisis.
- Ciclo lectivo: unidad temporal administrativa más amplia.
- Cohorte: grupo de estudiantes comparable por ingreso o generación.
- Comisión: agrupación operativa de cursada.

### Regla

No inferir cohorte solo por año de fecha.  
Debe existir una relación explícita entre evaluación, intento, alumno y período para que las comparaciones sean válidas.

---

## 10. Analítica por dimensión

### 10.1 Estudiante

Debe poder verse:

- rendimiento histórico;
- evolución;
- tendencia;
- desempeño por materia, contenido, competencia y nivel cognitivo;
- comportamiento de resolución;
- preguntas omitidas;
- tiempos;
- cambios de respuesta.

### 10.2 Preguntas

Debe poder verse:

- dificultad;
- tasa de omisión;
- tiempo medio y mediana;
- cambios de respuesta;
- discriminación;
- estabilidad histórica.

### 10.3 Distractores

Debe poder verse:

- frecuencia por opción;
- porcentaje de selección;
- distractores nunca elegidos;
- distractores demasiado atractivos;
- comportamiento según nivel de desempeño.

### 10.4 Evaluaciones

Debe poder verse:

- media, mediana y dispersión;
- aprobación;
- dificultad general;
- dificultad por pregunta;
- discriminación agregada;
- tiempo;
- omisiones;
- cobertura curricular;
- balance cognitivo.

### 10.5 Materia, comisión, cohorte, carrera e institución

Debe poder verse:

- rendimiento agregado;
- aprobación;
- evolución temporal;
- contenidos problemáticos;
- diferencias entre grupos comparables;
- materias con indicadores que justifican análisis institucional;
- tendencias que orienten intervención humana.

### 10.6 Docente

Debe poder verse:

- resultados de sus evaluaciones;
- cobertura curricular;
- calidad de preguntas;
- balance cognitivo;
- diferencias entre comisiones.

Y debe evitarse:

- ranking simplista;
- juicio causal sobre "buen" o "mal" docente;
- conclusiones sin contexto suficiente.

### 10.7 Preguntas abiertas

Debe poder verse:

- rúbrica aplicada;
- criterios;
- puntajes parciales;
- observaciones;
- consistencia de corrección.

### 10.8 Integridad académica

Debe poder verse:

- alertas;
- frecuencia;
- patrones;
- cambios bruscos de comportamiento;
- revisiones y resoluciones.

---

## 11. Analítica de preguntas y distractores

### Indicadores principales

- porcentaje de respuestas correctas;
- dificultad;
- discriminación;
- tiempo medio de resolución;
- distractores elegidos;
- revisión de respuestas;
- comportamiento de alto y bajo desempeño.

### Resultado esperado

El sistema debe poder señalar, por ejemplo:

- "este distractor prácticamente no cumple función";
- "esta pregunta presenta indicadores que justifican revisión";
- "esta pregunta muestra dificultad alta en alumnos de alto rendimiento".

### Límite metodológico

No declarar automáticamente ambigüedad ni mala calidad.  
Solo mostrar señales y razones.

---

## 12. Analítica de evaluaciones

### Qué debe responder

¿Qué información tenemos sobre la calidad de esta evaluación como instrumento?

### Dimensiones mínimas

- distribución de notas;
- dificultad general;
- dispersión;
- tiempo total;
- omisiones;
- cobertura curricular;
- balance cognitivo;
- preguntas problemáticas;
- consistencia interna cuando corresponda.

### Lo que no debe hacer todavía

- emitir sentencias automáticas de "buena" o "mala";
- reemplazar el criterio del docente;
- inferir causalidades educativas directas.

---

## 13. Analítica longitudinal

### Materia

- evolución del rendimiento;
- aprobación;
- dificultades recurrentes;
- contenidos problemáticos;
- comparaciones por período.

### Comisión

- rendimiento general;
- comparación con comisiones equivalentes;
- diferencias entre docentes cuando el contexto lo permita.

### Cohorte

- evolución histórica;
- comparaciones entre generaciones;
- estabilidad o variación de rendimiento.

### Carrera

- materias con dificultades recurrentes;
- distribución del rendimiento;
- evolución por cohortes;
- señales de materias "cuello de botella".

### Institución

- tendencias;
- diferencias entre carreras;
- evolución agregada;
- evidencia para decisiones académicas.

---

## 14. Analítica avanzada

### Psicometría

Se planifica como fase avanzada, no inmediata:

- consistencia interna;
- discriminación refinada;
- alpha de Cronbach cuando corresponda;
- otros indicadores solo cuando el tipo de examen y la muestra lo justifiquen.

### Recomendaciones pedagógicas

El sistema podrá producir:

- recomendaciones determinísticas;
- señales de revisión;
- interpretaciones humanas con evidencia.

### Exportación y evidencia

El sistema deberá poder exportar:

- métricas;
- resúmenes;
- comparativas;
- evidencia trazable para docentes e instituciones.

---

## 15. Capa analítica y contratos de métricas

### Arquitectura reutilizable

No debe construirse una consulta distinta para cada dashboard si la métrica es la misma.

La capa analítica futura debería:

- compartir definiciones;
- centralizar filtros;
- normalizar agregaciones;
- respetar muestras mínimas;
- devolver contexto de interpretación;
- soportar caché o precálculo cuando el volumen lo justifique.

### Contrato mínimo de una métrica

Cada métrica importante debe declarar:

- descripción;
- unidad;
- población incluida;
- exclusiones;
- nivel de agregación;
- fuente de datos;
- limitaciones;
- versión del contrato.

---

## 16. Matriz de trazabilidad

| Requerimiento | Brecha que resuelve | Datos necesarios | Fase | Dependencias | Métricas habilitadas |
|---|---|---|---|---|---|
| SIE-RT-001 | Definiciones inconsistentes | Contratos de métricas | 0 | Ninguna | Todas |
| SIE-RT-002 | Muestras pequeñas engañosas | Conteos y umbrales | 0 | SIE-RT-001 | Todas |
| SIE-RT-003 | Cálculos duplicados | Agregaciones reutilizables | 0 | SIE-RT-001, SIE-RT-002 | Todas |
| SIE-RT-004 | Exposición excesiva | Reglas de acceso | 0 | SIE-RT-001, SIE-RT-002 | Todas |
| SIE-RD-001 | Falta de contexto curricular | Metadata curricular | 1 | SIE-RT-001 | Cobertura, balance |
| SIE-RD-002 | Cohortes no explícitas | Períodos y cohorte | 1 | SIE-RT-001, SIE-RD-001 | Comparativas históricas |
| SIE-RD-003 | Historial alterable | Snapshot de pregunta | 1 | SIE-RD-001 | Dificultad histórica, banco |
| SIE-RD-004 | Corrección abierta poco estructurada | Rúbricas y publicación | 1 | SIE-RD-003 | Analítica de abiertas |
| SIE-RD-005 | Alertas sin gestión | Resolución y estados | 1 | SIE-RT-004 | Integridad, auditoría |
| SIE-RF-001 | Banco inexistente | Reutilización y búsqueda | 1 | SIE-RD-001, SIE-RD-003 | Calidad histórica de ítems |
| SIE-RF-002 | Analítica descriptiva dispersa | Datos ya existentes | 2 | SIE-RT-003 | Rendimiento, tiempos |
| SIE-RF-003 | Cobertura curricular opaca | Metadata curricular | 3 | SIE-RD-001 | Cobertura, balance |
| SIE-RF-004 | Calidad de examen implícita | Métricas de ítems | 4 | SIE-RT-001, SIE-RT-002 | Revisión de ítems |
| SIE-RF-005 | Integridad no gestionada | Alertas resueltas | 4 | SIE-RD-005 | Riesgo y anomalías |
| SIE-RF-006 | Comparativas longitudinales débiles | Cohorte y período | 5 | SIE-RD-002 | Materia, comisión, cohorte |
| SIE-RF-007 | Abiertas sin lectura analítica | Rúbrica y criterios | 6 | SIE-RD-004 | Consistencia de corrección |
| SIE-RF-008 | Psicometría prematura | Muestra suficiente | 7 | SIE-RF-004, SIE-RF-006 | Consistencia interna |
| SIE-RF-009 | Recomendaciones sin trazabilidad | Métricas y contratos | 7 | SIE-RT-001, SIE-RT-004 | Evidencia accionable |

---

## 17. Matriz de datos → información

| Dato capturado | Métrica derivada | Información que permite obtener | Actor beneficiado |
|---|---|---|---|
| Intentos | Promedio, aprobación, dispersión | Rendimiento académico de un alumno o grupo | Docente / institución |
| Respuestas | Acierto por pregunta | Dificultad y calidad de ítem | Docente |
| Opciones seleccionadas | Frecuencia por distractor | Distractores eficaces o inútiles | Docente |
| Historial de cambios | Cambios de respuesta | Inestabilidad o revisión durante la resolución | Docente |
| Tiempo por pregunta | Tiempo medio / mediana | Preguntas costosas o ambiguas | Docente |
| Alertas | Frecuencia / resolución | Evidencia de integridad | Docente / administrador |
| Materia / comisión | Comparativas por grupo | Diferencias entre cursos y períodos | Institución |
| Carrera | Evolución por cohorte | Tendencias institucionales | Autoridad |
| Rúbrica | Consistencia de corrección | Calidad de evaluación abierta | Docente |
| Versión de pregunta | Historial comparable | Calidad histórica del ítem | Docente / analista |

---

## 18. Matriz de indicadores

| Indicador | Dimensión | Datos necesarios | Nivel de agregación | Usuario destinatario | Interpretación válida | Interpretación que debe evitarse | Fase |
|---|---|---|---|---|---|---|---|
| Dificultad | Pregunta | Intentos válidos, aciertos | Pregunta/version | Docente | Qué tan exigente fue el ítem | "La pregunta es mala" | 4 |
| Discriminación | Pregunta | Desempeño alto/bajo | Pregunta/version | Docente/analista | Si separa niveles de desempeño | Causalidad sobre aprendizaje | 4 |
| Cobertura curricular | Evaluación | Metadata curricular | Evaluación y materia | Docente/institución | Qué contenidos se cubrieron | Distribución pedagógica "correcta" universal | 3 |
| Balance cognitivo | Evaluación | Nivel cognitivo validado | Evaluación, materia | Docente | Qué niveles se evalúan | Distribución ideal universal | 3 |
| Evolución | Alumno | Intentos históricos | Alumno/materia | Docente | Tendencia temporal | Estilo de aprendizaje | 2/5 |
| Riesgo de revisión | Pregunta | Dificultad, tiempo, distractores | Ítem | Docente | Señal para revisar | Diagnóstico definitivo | 4 |
| Anomalía | Intento | Alertas, navegación | Intento | Docente/administrador | Evidencia para revisar | Prueba automática de fraude | 4/5 |
| Consistencia interna | Evaluación | Respuestas, tamaño muestral | Evaluación | Analista | Estabilidad del instrumento | Veredicto universal | 7 |

---

## 19. Decisiones pendientes antes de implementación

- definición institucional de cohorte;
- obligatoriedad exacta de metadata curricular;
- taxonomía curricular a usar por institución;
- umbrales de muestra mínima por métrica;
- política de anonimización por rol;
- visibilidad de comparativas entre docentes;
- reglas para comparar comisiones;
- estados funcionales definitivos de alertas;
- visibilidad de retroalimentación al alumno;
- criterios para declarar una métrica "no confiable".

Cada una de estas decisiones afecta el modelo de datos, la capa analítica, la API y la experiencia de usuario.

---

## 20. Fuera de alcance por ahora

No deben considerarse parte de la primera evolución analítica:

- rankings automáticos de docentes;
- diagnóstico psicológico de estudiantes;
- predicción determinista de abandono;
- acusaciones automáticas de fraude;
- inferencia automática de causalidad pedagógica;
- calificación automática de calidad docente;
- psicometría compleja sin muestra suficiente;
- IA generativa como requisito estructural;
- sustitución del criterio humano por puntajes opacos.

---

## 21. Compatibilidad con el Examio existente

La evolución debe preservar:

- login, sesión y navegación actuales;
- rendición y corrección ya operativas;
- actas y resultados existentes;
- reportes ya disponibles;
- visibilidad de intentos históricos.

### Reglas de compatibilidad

- los registros legacy no deben perderse;
- cuando falte metadata nueva, el sistema debe mostrar información no disponible;
- los nuevos campos deben ser opcionales o migrables cuando no existan datos históricos;
- toda métrica histórica debe indicar su grado de comparabilidad;
- la nueva capa analítica no debe romper los flujos actuales del alumno ni del docente.

---

## 22. Principio de explicabilidad

Toda señal pedagógica debe poder explicar:

- qué datos utilizó;
- qué cálculo realizó;
- qué significa;
- qué no significa.

Ejemplo correcto:

> "La pregunta presenta bajo poder discriminativo en 63 respuestas válidas y se recomienda revisión."

Ejemplo incorrecto:

> "Pregunta mala."

---

## 23. Resultado final esperado

Al completar el roadmap, Examio debería poder responder con evidencia a preguntas como:

- ¿Qué aprendió el alumno y dónde presenta dificultades?
- ¿Qué ocurrió en la evaluación y qué conviene revisar?
- ¿Cómo se comportó una pregunta como instrumento de medición?
- ¿Qué contenidos se evalúan y cuáles quedan desatendidos?
- ¿Qué materias presentan indicadores de dificultad recurrente?
- ¿Cómo se comportan distintas comisiones o cohortes?
- ¿Qué tendencias muestra una carrera?
- ¿Qué evidencia necesita una institución para decidir mejoras?

---

## 24. Conclusión

Este roadmap no busca agregar métricas por acumulación, sino convertir a Examio en un sistema de información educativa con memoria, contexto y capacidad de interpretación.

La prioridad inicial es fundacional: metadata curricular, cohortes, versionado, banca reutilizable, rúbricas y contratos de métricas.  
La prioridad siguiente es analítica: explotar lo que ya existe sin perder explicabilidad.  
La etapa avanzada consolida psicometría, recomendaciones y evidencias exportables.

Si se ejecuta en este orden, Examio puede pasar de registrar evaluaciones a producir evidencia útil para mejorar estudiantes, preguntas, docentes, carreras e instituciones.

