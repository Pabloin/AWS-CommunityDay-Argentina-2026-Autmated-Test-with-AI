import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const tableName = process.env.ASSETS_TABLE;
const evidenceBucket = process.env.EVIDENCE_BUCKET;
const defaultTenantId = process.env.DEFAULT_TENANT_ID ?? "aws-cday-argentina-2026";

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
    "access-control-allow-headers": "content-type,authorization"
  },
  body: JSON.stringify(body)
});

const now = () => new Date().toISOString();

function pathParts(event) {
  return (event.rawPath ?? event.path ?? "/").split("/").filter(Boolean);
}

function claimsFrom(event) {
  return event.requestContext?.authorizer?.jwt?.claims ?? {};
}

function actorFrom(event) {
  const claims = claimsFrom(event);
  return {
    userSub: claims.sub ?? "anonymous",
    email: claims.email ?? "",
    tenantId: claims["custom:tenantId"] ?? defaultTenantId,
    role: claims["custom:role"] ?? "operator"
  };
}

function requireRole(actor, allowedRoles) {
  if (!allowedRoles.includes(actor.role)) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }
}

function parseBody(event) {
  if (!event.body) return {};
  return JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body);
}

function itemToAsset(item) {
  return {
    assetId: item.assetId,
    name: item.name,
    location: item.location,
    quantity: item.quantity,
    minQuantity: item.minQuantity,
    status: item.status,
    labelText: item.labelText,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

async function tenantExists(tenantId) {
  const result = await dynamodb.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: `TENANT#${tenantId}`,
        sk: "METADATA"
      }
    })
  );
  return Boolean(result.Item);
}

async function getAsset(actor, assetId) {
  const result = await dynamodb.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: `TENANT#${actor.tenantId}`,
        sk: `ASSET#${assetId}`
      }
    })
  );
  return result.Item;
}

async function listPhotos(actor, assetId) {
  const result = await dynamodb.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :photo)",
      ExpressionAttributeValues: {
        ":pk": `TENANT#${actor.tenantId}#ASSET#${assetId}`,
        ":photo": "PHOTO#"
      },
      ScanIndexForward: false
    })
  );

  return Promise.all(
    (result.Items ?? []).map(async (photo) => ({
      photoId: photo.photoId,
      photoType: photo.photoType,
      contentType: photo.contentType,
      status: photo.status,
      createdAt: photo.createdAt,
      url: await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: evidenceBucket,
          Key: photo.key
        }),
        { expiresIn: 900 }
      )
    }))
  );
}

async function handleListAssets(actor) {
  const result = await dynamodb.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :asset)",
      ExpressionAttributeValues: {
        ":pk": `TENANT#${actor.tenantId}`,
        ":asset": "ASSET#"
      }
    })
  );

  return json(200, {
    tenantId: actor.tenantId,
    items: (result.Items ?? []).map(itemToAsset)
  });
}

async function handleGetAsset(actor, assetId) {
  const asset = await getAsset(actor, assetId);
  if (!asset) return json(404, { message: "Asset not found" });
  const photos = await listPhotos(actor, assetId);
  return json(200, { ...itemToAsset(asset), photos });
}

async function handleCreateAsset(actor, event) {
  requireRole(actor, ["admin", "operator"]);

  const body = parseBody(event);
  const assetId = body.assetId ?? `SL-${Date.now().toString(36).toUpperCase()}`;
  const timestamp = now();

  const item = {
    pk: `TENANT#${actor.tenantId}`,
    sk: `ASSET#${assetId}`,
    gsi1pk: `ASSET#${assetId}`,
    gsi1sk: `TENANT#${actor.tenantId}`,
    entityType: "ASSET",
    tenantId: actor.tenantId,
    assetId,
    name: body.name ?? "Activo sin nombre",
    location: body.location ?? "Sin ubicacion",
    quantity: Number(body.quantity ?? 0),
    minQuantity: Number(body.minQuantity ?? 0),
    status: body.status ?? "ok",
    labelText: body.labelText ?? "",
    createdBy: actor.userSub,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  await dynamodb.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
      ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)"
    })
  );

  return json(201, itemToAsset(item));
}

async function handleCreateMovement(actor, event) {
  requireRole(actor, ["admin", "operator", "auditor"]);

  const body = parseBody(event);
  const assetId = body.assetId;
  if (!assetId) return json(400, { message: "assetId is required" });

  const asset = await getAsset(actor, assetId);
  if (!asset) return json(404, { message: "Asset not found" });

  const timestamp = now();
  const movementId = randomUUID();
  const amount = Number(body.amount ?? 0);
  const item = {
    pk: `TENANT#${actor.tenantId}#ASSET#${assetId}`,
    sk: `MOVEMENT#${timestamp}#${movementId}`,
    gsi1pk: `TENANT#${actor.tenantId}`,
    gsi1sk: `MOVEMENT#${timestamp}#${movementId}`,
    entityType: "MOVEMENT",
    tenantId: actor.tenantId,
    assetId,
    movementId,
    type: body.type ?? "audit",
    amount,
    note: body.note ?? "",
    createdBy: actor.userSub,
    createdAt: timestamp
  };

  await dynamodb.send(
    new PutCommand({
      TableName: tableName,
      Item: item
    })
  );

  return json(201, item);
}

async function handlePresignPhoto(actor, event, assetId) {
  requireRole(actor, ["admin", "operator", "auditor"]);

  const asset = await getAsset(actor, assetId);
  if (!asset) return json(404, { message: "Asset not found" });

  const body = parseBody(event);
  const photoId = randomUUID();
  const photoType = body.photoType ?? "producto";
  const contentType = body.contentType ?? "image/jpeg";
  const timestamp = now();
  const key = `tenants/${actor.tenantId}/assets/${assetId}/photos/${photoId}.jpg`;

  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: evidenceBucket,
      Key: key,
      ContentType: contentType,
      Metadata: {
        tenantId: actor.tenantId,
        assetId,
        photoId,
        photoType
      }
    }),
    { expiresIn: 900 }
  );

  await dynamodb.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: `TENANT#${actor.tenantId}#ASSET#${assetId}`,
        sk: `PHOTO#${timestamp}#${photoId}`,
        gsi1pk: `TENANT#${actor.tenantId}`,
        gsi1sk: `PHOTO#${timestamp}#${photoId}`,
        entityType: "PHOTO",
        tenantId: actor.tenantId,
        assetId,
        photoId,
        photoType,
        bucket: evidenceBucket,
        key,
        contentType,
        status: "pending_upload",
        createdBy: actor.userSub,
        createdAt: timestamp
      }
    })
  );

  return json(201, {
    photoId,
    key,
    uploadUrl,
    expiresIn: 900
  });
}

export async function handler(event) {
  try {
    const method = event.requestContext?.http?.method ?? event.httpMethod;
    const parts = pathParts(event);

    if (method === "OPTIONS") return json(204, {});
    if (method === "GET" && parts.join("/") === "health") {
      return json(200, { service: "stocklens-v02-api", status: "ok" });
    }

    const actor = actorFrom(event);
    if (!(await tenantExists(actor.tenantId))) {
      return json(403, { message: "Tenant is not enabled", tenantId: actor.tenantId });
    }

    if (method === "GET" && parts.length === 1 && parts[0] === "assets") {
      return handleListAssets(actor);
    }

    if (method === "POST" && parts.length === 1 && parts[0] === "assets") {
      return handleCreateAsset(actor, event);
    }

    if (method === "GET" && parts.length === 2 && parts[0] === "assets") {
      return handleGetAsset(actor, parts[1]);
    }

    if (method === "POST" && parts.length === 4 && parts[0] === "assets" && parts[2] === "photos" && parts[3] === "presign") {
      return handlePresignPhoto(actor, event, parts[1]);
    }

    if (method === "POST" && parts.length === 1 && parts[0] === "movements") {
      return handleCreateMovement(actor, event);
    }

    return json(404, { message: "Route not found", method, path: event.rawPath ?? event.path });
  } catch (error) {
    console.error(error);
    return json(error.statusCode ?? 500, {
      message: error.message ?? "Internal server error"
    });
  }
}
