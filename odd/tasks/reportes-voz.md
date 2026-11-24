# Feature: Reportes por voz con IA (GLM 5.3 Flash vía nan.builders)

El usuario habla, el navegador transcribe, el backend interpreta con un LLM
OpenAI-compatible y consume los endpoints /api/reportes/* existentes.
Resultado: dashboard en pantalla + respuesta hablada + exportación PDF/Excel/CSV.

## Specs

S1: "voz decir generame reportes de ventas de esta semana / ano / mes y cualquier
reporte que tengamos y este consuma el endpoint de los reportes" — micrófono en
la página /reportes: Web Speech API del navegador transcribe y envía el TEXTO a
POST /api/reportes/interpretar.

S2 (usuario): intérprete = "IA (LLM)" con "nan.builders ... GLM 5.3 Flash".
Env vars: NAN_BUILDERS_BASE_URL (default https://api.nan.builders/v1),
NAN_BUILDERS_API_KEY, NAN_BUILDERS_MODEL (default glm5.3-flash). Llamada
chat/completions, temperature 0, max_tokens 300, output SOLO JSON
{tipo, desde, hasta, fechaCorte, titulo} validado con Zod; fechas ISO
YYYY-MM-DD en America/La_Paz calculadas por el LLM (se le pasa la fecha de hoy
en el system prompt); desde<=hasta y rango máximo 2 años (clamp/cut).

S3 (usuario): resultado "Ambos (completo)" — el frontend recibe el JSON, completa
el formulario (tipo/fechas), genera el dashboard que ya existe, habla el resumen
por speechSynthesis (es), y los botones PDF/Excel/CSV quedan como están.

S4: endpoint con authenticate + requirePermissions('REPORTES_CONSULTAR') +
validateQuery/zod; el LLM NO toca la BD: solo mapea texto→parámetros.

S5: errores del backend: 503 AI_NOT_CONFIGURED (sin key), 502 AI_INVALID_RESPONSE
(LLM respondió JSON inválido), 503 AI_UNAVAILABLE (fetch falló/timeout 15s);
401/403 auth; 400 VALIDATION_ERROR entrada. Frontend: navegador sin
SpeechRecognition → mic oculto y formulario normal (degradación).

S6: frases cubiertas (mínimo): " esta semana" (lunes→hoy), "este mes", "este año",
"hoy", "ayer", "últimos 30 días", fechas explícitas; tipos: ventas, ganancias,
inventario (con fecha de corte), rotación/demanda.

## Tasks

T1 [S2,S4] backend env + errorCodes + DTO + ruta POST /api/reportes/interpretar +
service voiceInterpreterService (fetch→LLM→Zod) + openapi — commit
T2 [S2,S5,R] tests backend: unit (mock fetch: parse ok, JSON inválido, API caída,
timeout) + integration (401/403/400/happy) — commit
T3 [S1,S5] frontend: interpretarReporteVoz() en reporteService.ts + hook de mic
(webkitSpeechRecognition es-419, estado escuchando/error) — commit
T4 [S1,S3,S5] frontend: botón mic en Reportes + dispara generar() + TTS resumen +
degradación sin SpeechRecognition + README — commit
T5 [S2] usuario agrega NAN_BUILDERS_API_KEY a .env local y a Dokploy; smoke E2E
con voz real; verificar deploy — bloqueado hasta T5 keys [DONE: key puesta,
bugfix max_tokens f01dd09, e2e validado por el usuario]
T6 [S7] contexto conversacional sin estado: el frontend reenvía la última
interpretación; el LLM resuelve referencias relativas (el mes anterior, esa
misma semana) contra ese contexto — commit
T7 [S8] voz natural: selección de la mejor voz es disponible (Google español /
Natural > es-*), cadencia con puntuación, montos en palabras + "bolivianos";
el frontend pasa contexto — commit [DONE: ver repo frontend 1d059b6, smoke
productivo del follow-up contextual OK]
T8 [S9] switch de modelo IA en caliente: migración 018 tabla configuracion
(clave/valor, idempotente); configuracionRepository; voiceInterpreterService
resuelve modelo efectivo por request (override BD > NAN_BUILDERS_MODEL env >
glm5.3-flash); GET /api/reportes/modelo y PUT {modelo} (≤80 chars, no vacío)
con auth + REPORTES_CONSULTAR; openapi; tests: override gana sobre env,
PUT válido cambia, inválido 400 sin fetch, 401/403, modelo usado en el body
del LLM configurable vía stub — commit
T9 [S10] historial multi-turno: DTO acepta `historial?: ContextoReporte[]`
(max 5, validado con Zod, cada item igual que `contexto`); el service incluye
el historial en los mensajes para referencias a turnos previos; se mantiene
`contexto` (retrocompatible) — commit
T10 [S11] multi-reporte: la respuesta incluye `reportes: [{tipo,desde,hasta,
fechaCorte?}]` (1..3 elementos) además de tipo/desde/hasta (primero) por
retrocompatibilidad; el prompt pide separar pedidos múltiples ("ventas y
ganancias de octubre", "ventas de ayer y de hoy") hasta 3; tests — commit

T11 [S12] preguntas sobre el informe generado (fase 2 de la conversación):
POST /api/reportes/preguntar recibe {pregunta, informe: {tipo, periodo?,
resumen?, items?: [record] (máx 60)}, historial?: [preguntaPrevia]} y devuelve
{respuesta: string (lenguaje natural, 1-3 frases, en español, solo con datos
del informe), destacados?: string[] (ids de items mencionados)}. Guards
REPORTES_CONSULTAR. El LLM SOLO razona sobre el informe enviado (no consulta la
BD ni inventa cifras fuera de él); pregunta vacía/larga o informe >60 items se
rechazan con 400 antes de llamar al modelo; errores AI_* igual que interpretar.
Frontend: input "Preguntar sobre este informe" + micrófono reutilizando el hook,
respuesta visible y leída en voz alta, historial de preguntas del informe.

## Log

L5 (2026-11-24, pedido del usuario): "Si le pregunto sobre una venta específica
debería de responderme?" → decisión del usuario: "sería adecuado poder tener,
en 2 fases primero que se genere el reporte y después si pregunta que sea sobre
el informe generado". Alcance T11: preguntas conversacionales ancladas al informe
ya generado (no búsqueda libre de ventas en toda la BD).

L4 (2026-11-24, pedido del usuario): "Que sea más interactivo lo de la voz con
los reportes nivel 2 como dijiste". Alcance nivel 2:
- T9 [S10] historial multi-turno: el cliente envía `historial` (hasta 5
  interpretaciones previas) además del `contexto` actual; el LLM resuelve
  referencias a turnos anteriores ("volvé al de la semana pasada", "el mismo
  que hace dos").
- T10 [S11] multi-reporte en una frase: la respuesta pasa a incluir
  `reportes: [{tipo,desde,hasta,fechaCorte?}]` (1..3); se mantienen
  tipo/desde/hasta del primero por retrocompatibilidad. El front genera los
  pedidos en secuencia, muestra el último y lo dice por voz.
Bug bloqueante detectado en la misma corrida (fix incluido): CORS
ALLOWED_METHODS no incluía PUT, así que el selector de modelo fallaba en el
navegador con "Network Error" aunque el endpoint funcionara por curl.

L3 (2026-11-23, pedido del usuario): "Si quiero que sea interactivo como
tendría que ser? Y también cambiar el tipo de voz que sea más natural".
Decisión: contexto sin estado (cliente reenvía contexto; el server no guarda
memoria), follow-up permite cambiar de tipo conservando el periodo; voz local
mejorada (no se agregan proveedores TTS nuevos).

L1 (petición original): "oki ahora lko que tenemos que haces es agregar la
generacion de reportes por ai con vos, que nos ayude en la generacion de
reportes la idea es tener la voz decir  generame reportes de ventas de esta
semana / ano / mes y cualquier reporte que tengamos y este consuma el endpoint
de los reportes algo asi voz-> recopila la instruccion_> genera reporte con el
endpoint /reportes me dejo entender?"
L2 (decisión usuario, 2026-11-22): captura=Navegador(Web Speech); intérprete=
IA(LLM) proveedor nan.builders modelo GLM 5.3 Flash; resultado=Ambos(dashboard+
voz+export); docs nan: base https://api.nan.builders/v1, OpenAI-compatible,
id modelo glm5.3-flash.
