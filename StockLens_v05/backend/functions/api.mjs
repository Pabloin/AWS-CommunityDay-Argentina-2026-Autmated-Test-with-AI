import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({});
const modelId = process.env.BEDROCK_MODEL_ID ?? "us.anthropic.claude-haiku-4-5-20251001-v1:0";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
  "content-type": "application/json"
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body)
  };
}

function parseDataUrl(dataUrl) {
  const match = /^data:image\/(png|jpe?g|webp);base64,(.+)$/i.exec(dataUrl ?? "");
  if (!match) {
    throw new Error("La imagen debe llegar como data URL png, jpeg o webp.");
  }

  const format = match[1].toLowerCase().replace("jpg", "jpeg");
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.byteLength > 3_750_000) {
    throw new Error("La imagen es demasiado grande para analizarla.");
  }

  return { format, bytes };
}

function extractText(output) {
  const content = output?.message?.content ?? [];
  return content.map((part) => part.text ?? "").join("\n").trim();
}

function parseJson(text) {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const raw = fenced?.[1] ?? text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Bedrock no devolvio JSON.");
  }
  return JSON.parse(raw.slice(start, end + 1));
}

function normalizeSuggestion(parsed) {
  const checklist = Array.isArray(parsed.checklist) ? parsed.checklist.slice(0, 8) : [];
  const tags = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8) : [];

  return {
    name: String(parsed.name ?? "Objeto sin identificar").slice(0, 80),
    category: String(parsed.category ?? "Objeto").slice(0, 40),
    description: String(parsed.description ?? "").slice(0, 400),
    condition: String(parsed.condition ?? "Para revisar").slice(0, 80),
    suggestedPriceLabel: String(parsed.suggestedPriceLabel ?? "Precio a definir").slice(0, 80),
    locationHint: String(parsed.locationHint ?? "Galpon / caja").slice(0, 80),
    tags,
    checklist: checklist.length ? checklist : ["Foto principal", "Estado visible", "Descripcion revisada"],
    listingText: String(parsed.listingText ?? "").slice(0, 900)
  };
}

async function analyzeImage(dataUrl) {
  const image = parseDataUrl(dataUrl);
  const prompt = `Analiza esta foto para una app de catalogo hogareno llamada StockLens.

La persona quiere ordenar objetos de una casa, galpon o baulera para decidir si venderlos online.
Detecta el objeto principal y devolve SOLO JSON valido con esta forma:
{
  "name": "nombre corto del objeto",
  "category": "Juego de mesa | Libro | Juguete | Herramienta | Deporte | Objeto",
  "description": "descripcion util y concreta",
  "condition": "estado visible o recomendacion de revision",
  "suggestedPriceLabel": "rango o criterio de precio, sin inventar certeza",
  "locationHint": "ubicacion sugerida tipo Galpon / caja azul",
  "tags": ["etiquetas significativas"],
  "checklist": ["pasos para dejarlo listo para vender"],
  "listingText": "texto breve para publicacion online"
}

No inventes marca, edicion ni estado si no se ve. Si tenes duda, marcala como revision pendiente.`;

  const command = new ConverseCommand({
    modelId,
    inferenceConfig: {
      maxTokens: 900,
      temperature: 0.2
    },
    messages: [
      {
        role: "user",
        content: [
          { text: prompt },
          {
            image: {
              format: image.format,
              source: {
                bytes: image.bytes
              }
            }
          }
        ]
      }
    ]
  });

  const result = await client.send(command);
  return normalizeSuggestion(parseJson(extractText(result.output)));
}

export async function handler(event) {
  if (event.requestContext?.http?.method === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  if (event.requestContext?.http?.method === "GET" && event.rawPath === "/health") {
    return response(200, { service: "stocklens-v05-api", status: "ok" });
  }

  if (event.requestContext?.http?.method !== "POST" || event.rawPath !== "/analyze") {
    return response(404, { error: "not_found" });
  }

  try {
    const body = JSON.parse(event.body ?? "{}");
    const suggestion = await analyzeImage(body.imageDataUrl);
    return response(200, { suggestion });
  } catch (error) {
    console.error(error);
    return response(502, {
      error: "image_analysis_failed",
      message: error instanceof Error ? error.message : "No se pudo analizar la imagen."
    });
  }
}
