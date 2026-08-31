# Architecture Diagrams

## Prototipo local

```text
Browser / Mobile
  |
  |-- StockLens UI
  |-- localStorage
  |-- Camera / file upload
  |-- QR generation
```

## Arquitectura AWS propuesta

```text
User Mobile/Desktop
  |
  v
CloudFront
  |
  v
S3 static frontend
  |
  v
API Gateway
  |
  v
Lambda
  |------ DynamoDB: assets, movements, audit log
  |------ S3: product photos and label photos
  |------ Textract: OCR for labels
  |------ Bedrock: field suggestions and classification
  |------ EventBridge: scheduled checks and alerts
```
