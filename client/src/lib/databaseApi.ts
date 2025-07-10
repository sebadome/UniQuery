// client/src/lib/databaseApi.ts

import { supabase } from "@/lib/supabaseClient";

export type DatabaseConnection = {
  id: string;
  name: string;
  db_type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string; // Nunca retornes passwords del backend!
  created_at?: string;
  isActive?: boolean;
  data_dictionary?: Record<string, any> | null;
  dictionary_table?: string | null;
};

const BASE_URL = "http://127.0.0.1:8000";

// --- Utilidad para manejar errores de fetch ---
async function handleResponse(response: Response) {
  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      // do nothing
    }
    throw new Error(
      errorData.detail?.toString?.() ||
      errorData.message ||
      "Error en la solicitud al backend"
    );
  }
  return response.json();
}

// --- Helper para agregar headers de autenticación (Bearer JWT) ---
function authHeaders(jwt?: string, extra?: Record<string, string>) {
  return {
    ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    ...(extra || {}),
  };
}

// --- Obtiene el JWT vigente de Supabase ---
async function getJwtToken(): Promise<string | undefined> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token;
}

// --- Transforma el payload antes de enviar al backend ---
function toApiPayload(data: any) {
  const {
    type,
    db_type,
    data_dictionary,
    dictionary_table,
    ...rest
  } = data;
  let parsedDictionary = data_dictionary;
  if (typeof data_dictionary === "string" && data_dictionary.trim() !== "") {
    try {
      parsedDictionary = JSON.parse(data_dictionary);
    } catch {
      parsedDictionary = data_dictionary;
    }
  }
  return {
    db_type: db_type ?? type,
    ...rest,
    ...(dictionary_table !== undefined ? { dictionary_table } : {}),
    ...(parsedDictionary !== undefined && parsedDictionary !== "" ? { data_dictionary: parsedDictionary } : {}),
  };
}

// ----------------- ENDPOINTS (JWT) -----------------

// Prueba la conexión con los datos entregados (sin guardar)
async function testConnection(data: any) {
  const jwt = await getJwtToken();
  const payload = toApiPayload(data);
  const res = await fetch(`${BASE_URL}/connections/test`, {
    method: "POST",
    headers: authHeaders(jwt, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// Guarda la conexión en Supabase
async function createConnection(data: any) {
  const jwt = await getJwtToken();
  const payload = toApiPayload(data);
  const res = await fetch(`${BASE_URL}/connections/`, {
    method: "POST",
    headers: authHeaders(jwt, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// Obtiene todas las conexiones guardadas del usuario
async function getConnections() {
  const jwt = await getJwtToken();
  const res = await fetch(`${BASE_URL}/connections/`, {
    method: "GET",
    headers: authHeaders(jwt),
  });
  return handleResponse(res);
}

// Activa una conexión específica
async function activateConnection(connectionId: string) {
  const jwt = await getJwtToken();
  const res = await fetch(`${BASE_URL}/connections/${connectionId}/activate`, {
    method: "POST",
    headers: authHeaders(jwt, { "Content-Type": "application/json" }),
  });
  return handleResponse(res);
}

// Desactiva la conexión activa
async function deactivateConnection() {
  const jwt = await getJwtToken();
  const res = await fetch(`${BASE_URL}/connections/deactivate`, {
    method: "POST",
    headers: authHeaders(jwt, { "Content-Type": "application/json" }),
  });
  return handleResponse(res);
}

// Elimina una conexión
async function deleteConnection(connectionId: string) {
  const jwt = await getJwtToken();
  const res = await fetch(`${BASE_URL}/connections/${connectionId}`, {
    method: "DELETE",
    headers: authHeaders(jwt, { "Content-Type": "application/json" }),
  });
  return handleResponse(res);
}

// Obtiene la conexión activa
async function getActiveConnection() {
  const jwt = await getJwtToken();
  const res = await fetch(`${BASE_URL}/connections/active`, {
    method: "GET",
    headers: authHeaders(jwt),
  });
  return handleResponse(res);
}

// --------- OBTENER TABLAS PASANDO PARÁMETROS DE CONEXIÓN -----------
async function getTablesFromParams(params: any) {
  const jwt = await getJwtToken();
  const payload = toApiPayload(params);
  const res = await fetch(`${BASE_URL}/connections/get-tables`, {
    method: "POST",
    headers: authHeaders(jwt, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res); // <-- array de strings (nombres de tabla)
}

// (opcional) Lista tablas de la conexión activa (requiere haber activado una)
async function getTableNames() {
  const jwt = await getJwtToken();
  const res = await fetch(`${BASE_URL}/connections/tables`, {
    method: "GET",
    headers: authHeaders(jwt),
  });
  return handleResponse(res); // <-- array de strings
}

// --------- LLAMADA A LLM (preguntas en lenguaje natural) ---------
/**
 * Envía una pregunta en lenguaje natural al endpoint LLM.
 * @param {question, table, connectionId} - Pregunta, tabla, y opcionalmente el connectionId.
 * @returns { answer, sql_query, columns, rows, executionTime, query_log_id }
 */
async function askLLMQuestion({
  question,
  table,
  connectionId
}: { question: string; table: string; connectionId?: string }) {
  const jwt = await getJwtToken();
  // Siempre aseguramos que el payload tenga los campos requeridos
  const payload: any = {
    question: typeof question === "string" ? question : "",
    table: typeof table === "string" ? table : ""
  };
  if (connectionId) payload.connection_id = connectionId;

  const res = await fetch(`${BASE_URL}/human_query`, {
    method: "POST",
    headers: authHeaders(jwt, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res); // <-- espera: { answer, sql_query, columns, rows, executionTime, query_log_id }
}

/**
 * Envía feedback (👍 o 👎 y comentario) sobre una consulta realizada (por query_log_id).
 * @param logId - ID del log generado por el backend.
 * @param feedback - 1 (👍), -1 (👎)
 * @param feedbackComment - Comentario opcional del usuario.
 * @returns { success: boolean, log_id: number }
 */
async function sendQueryFeedback({
  logId,
  feedback,
  feedbackComment,
}: {
  logId: number;
  feedback: 1 | -1;
  feedbackComment?: string;
}) {
  const jwt = await getJwtToken();
  const payload = {
    feedback,
    feedback_comment: feedbackComment,
  };

  const res = await fetch(`${BASE_URL}/feedback/${logId}`, {
    method: "POST",
    headers: authHeaders(jwt, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res); // <-- espera: { success, log_id }
}

// EXPORTS
export const databaseApi = {
  testConnection,
  createConnection,
  getConnections,
  activateConnection,
  deactivateConnection,
  deleteConnection,
  getActiveConnection,
  getTableNames,
  getTablesFromParams,
  askLLMQuestion,
  sendQueryFeedback,    // <-- NUEVO
};
