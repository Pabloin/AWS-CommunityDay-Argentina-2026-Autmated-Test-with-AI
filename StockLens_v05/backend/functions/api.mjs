import { randomUUID } from "node:crypto";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import QRCode from "qrcode";

const bedrock = new BedrockRuntimeClient({});
const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

const modelId = process.env.BEDROCK_MODEL_ID ?? "us.anthropic.claude-haiku-4-5-20251001-v1:0";
const tableName = process.env.ITEMS_TABLE;
const photosBucket = process.env.PHOTOS_BUCKET;
const defaultTenantId = process.env.DEFAULT_TENANT_ID ?? "aws-cday-argentina-2026-v5";
const publicAppUrl = process.env.PUBLIC_APP_URL ?? "https://mobile-v5.lens.glaciar.org";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
  "content-type": "application/json"
};

const now = () => new Date().toISOString();

function publicItemUrl(itemId) {
  const url = new URL(publicAppUrl);
  url.searchParams.set("item", itemId);
  return url.toString();
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body)
  };
}

function textResponse(statusCode, contentType, body) {
  return {
    statusCode,
    headers: {
      ...corsHeaders,
      "content-type": contentType
    },
    body
  };
}

function parseBody(event) {
  if (!event.body) return {};
  return JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body);
}

function pathParts(event) {
  return (event.rawPath ?? event.path ?? "/").split("/").filter(Boolean);
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

  return { format, bytes, contentType: `image/${format}` };
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
    qrLabel: String(parsed.qrLabel ?? "Etiqueta QR pendiente").slice(0, 80),
    locationHint: String(parsed.locationHint ?? "Galpon / caja").slice(0, 80),
    tags,
    checklist: checklist.length ? checklist : ["Foto principal", "Estado visible", "Descripcion revisada"]
  };
}

async function analyzeImage(dataUrl) {
  const image = parseDataUrl(dataUrl);
  const prompt = `Analiza esta foto para una app de inventario visual llamada StockLens.

La persona quiere ordenar objetos de una casa, edificio, galpon o baulera. El objetivo es identificar el objeto, generar una ficha confiable y asociarla a un QR fisico.
Detecta el objeto principal y devolve SOLO JSON valido con esta forma:
{
  "name": "nombre corto del objeto",
  "category": "Juego de mesa | Libro | Juguete | Herramienta | Deporte | Objeto",
  "description": "descripcion util y concreta",
  "condition": "estado visible o recomendacion de revision",
  "qrLabel": "texto corto para imprimir junto al QR",
  "locationHint": "ubicacion sugerida tipo Galpon / caja azul",
  "tags": ["etiquetas significativas"],
  "checklist": ["pasos para que la ficha quede identificable y verificable"]
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

  const result = await bedrock.send(command);
  return normalizeSuggestion(parseJson(extractText(result.output)));
}

function normalizeItem(input) {
  return {
    name: String(input.name ?? "Objeto sin nombre").slice(0, 100),
    category: String(input.category ?? "Objeto").slice(0, 50),
    location: String(input.location ?? "Sin ubicacion").slice(0, 100),
    status: String(input.status ?? "review").slice(0, 30),
    price: Number(input.price ?? 0),
    notes: String(input.notes ?? "").slice(0, 1200),
    checklist: Array.isArray(input.checklist) ? input.checklist.map(String).slice(0, 12) : [],
    checked: Array.isArray(input.checked) ? input.checked.map(String).slice(0, 12) : [],
    aiTags: Array.isArray(input.aiTags) ? input.aiTags.map(String).slice(0, 12) : []
  };
}

async function signPhotos(photoKeys) {
  return Promise.all(
    (photoKeys ?? []).map(async (photo) => ({
      key: photo.key,
      contentType: photo.contentType,
      url: await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: photosBucket,
          Key: photo.key
        }),
        { expiresIn: 900 }
      )
    }))
  );
}

function itemToResponse(item) {
  return {
    id: item.itemId,
    name: item.name,
    category: item.category,
    location: item.location,
    status: item.status,
    price: item.price,
    notes: item.notes,
    checklist: item.checklist ?? [],
    checked: item.checked ?? [],
    aiTags: item.aiTags ?? [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    photoCount: (item.photoKeys ?? []).length,
    qrPayload: publicItemUrl(item.itemId),
    qrUrl: `/items/${encodeURIComponent(item.itemId)}/qr`
  };
}

async function itemWithPhotos(item) {
  return {
    ...itemToResponse(item),
    photos: await signPhotos(item.photoKeys ?? [])
  };
}

async function handleListItems() {
  const result = await dynamodb.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :item)",
      ExpressionAttributeValues: {
        ":pk": `TENANT#${defaultTenantId}`,
        ":item": "ITEM#"
      },
      ScanIndexForward: false
    })
  );

  return response(200, {
    tenantId: defaultTenantId,
    items: await Promise.all((result.Items ?? []).map(itemWithPhotos))
  });
}

async function handleGetItem(itemId) {
  const result = await dynamodb.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: `TENANT#${defaultTenantId}`,
        sk: `ITEM#${itemId}`
      }
    })
  );

  if (!result.Item) return response(404, { error: "item_not_found" });
  return response(200, await itemWithPhotos(result.Item));
}

async function handleGetItemQr(itemId) {
  const result = await dynamodb.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: `TENANT#${defaultTenantId}`,
        sk: `ITEM#${itemId}`
      }
    })
  );

  if (!result.Item) return response(404, { error: "item_not_found" });

  const svg = await QRCode.toString(publicItemUrl(itemId), {
    type: "svg",
    margin: 1,
    width: 240,
    color: {
      dark: "#17251f",
      light: "#ffffff"
    }
  });

  return textResponse(200, "image/svg+xml", svg);
}

async function uploadPhotos(itemId, photos) {
  const nextPhotos = [];
  for (const dataUrl of (photos ?? []).slice(0, 4)) {
    const image = parseDataUrl(dataUrl);
    const photoId = randomUUID();
    const key = `tenants/${defaultTenantId}/items/${itemId}/photos/${photoId}.${image.format === "jpeg" ? "jpg" : image.format}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: photosBucket,
        Key: key,
        Body: image.bytes,
        ContentType: image.contentType,
        Metadata: {
          tenantId: defaultTenantId,
          itemId,
          photoId
        }
      })
    );
    nextPhotos.push({ key, contentType: image.contentType });
  }
  return nextPhotos;
}

async function handleCreateItem(event) {
  const body = parseBody(event);
  const itemId = body.id || `SLV5-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;
  const timestamp = now();
  const item = {
    pk: `TENANT#${defaultTenantId}`,
    sk: `ITEM#${itemId}`,
    entityType: "ITEM",
    tenantId: defaultTenantId,
    itemId,
    ...normalizeItem(body),
    photoKeys: await uploadPhotos(itemId, body.photos),
    createdAt: timestamp,
    updatedAt: timestamp
  };

  await dynamodb.send(
    new PutCommand({
      TableName: tableName,
      Item: item
    })
  );

  return response(201, await itemWithPhotos(item));
}

export async function handler(event) {
  if (event.requestContext?.http?.method === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  const method = event.requestContext?.http?.method;
  const parts = pathParts(event);

  try {
    if (method === "GET" && event.rawPath === "/health") {
      return response(200, {
        service: "stocklens-v05-api",
        status: "ok",
        storage: {
          itemsTable: tableName,
          photosBucket
        }
      });
    }

    if (method === "POST" && event.rawPath === "/analyze") {
      const body = parseBody(event);
      const suggestion = await analyzeImage(body.imageDataUrl);
      return response(200, { suggestion });
    }

    if (method === "GET" && event.rawPath === "/items") {
      return handleListItems();
    }

    if (method === "POST" && event.rawPath === "/items") {
      return handleCreateItem(event);
    }

    if (method === "GET" && parts[0] === "items" && parts[1] && parts[2] === "qr") {
      return handleGetItemQr(parts[1]);
    }

    if (method === "GET" && parts[0] === "items" && parts[1]) {
      return handleGetItem(parts[1]);
    }

    return response(404, { error: "not_found" });
  } catch (error) {
    console.error(error);
    return response(500, {
      error: "api_error",
      message: error instanceof Error ? error.message : "No se pudo completar la operacion."
    });
  }
}
