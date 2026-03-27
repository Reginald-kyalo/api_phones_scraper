# Azure Deployment Guide for Price Deals App

## Overview
This guide explains how to deploy your FastAPI application to Azure using **Azure Container Apps**, which offers consumption-based pricing (pay only when your app is running).

## Why Azure Container Apps?

✅ **Consumption-based pricing** - Scale to zero when idle
✅ **Auto-scaling** - Automatically scales based on traffic
✅ **No infrastructure management** - Fully managed service
✅ **Built-in HTTPS** - Free SSL certificates
✅ **Supports WebSockets** - For real-time features
✅ **Free tier available** - 180,000 vCPU-seconds and 360,000 GiB-seconds per month

## Cost Estimate

With scale-to-zero enabled:
- **Idle time**: $0 (app scales to zero)
- **Active usage**: ~$0.000012 per second (~$0.043/hour)
- **Example**: 100 hours/month = ~$4.30/month
- **Free tier**: First 180,000 vCPU-seconds FREE

## Prerequisites

1. **Azure Account** - [Sign up for free](https://azure.microsoft.com/free/)
2. **Azure CLI** - [Install Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
3. **Docker** - [Install Docker](https://docs.docker.com/get-docker/)
4. **MongoDB Atlas** (or Azure Cosmos DB)
5. **Redis** (or Azure Cache for Redis)

## Quick Deploy (Automated)

### Option 1: Using the deployment script (Linux/Mac)

```bash
# Make the script executable
chmod +x deploy-azure.sh

# Run the deployment
./deploy-azure.sh
```

### Option 2: Using PowerShell commands (Windows)

```powershell
# Follow the commands in azure-deploy-commands.ps1
# Copy and run each section
```

## Manual Deployment Steps

### 1. Install Azure CLI

```bash
# Linux
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# macOS
brew install azure-cli

# Windows
# Download from: https://aka.ms/installazurecliwindows
```

### 2. Login to Azure

```bash
az login
```

### 3. Set Configuration Variables

```bash
# Update these values
RESOURCE_GROUP="price-deals-rg"
LOCATION="Switzerland North"  # Change to your region
CONTAINER_APP_ENV="price-deals-env"
CONTAINER_APP_NAME="price-deals-app"
CONTAINER_REGISTRY="pricedealsacr"  # Must be globally unique!
IMAGE_NAME="price-deals-web"
IMAGE_TAG="latest"
```

### 4. Create Resource Group

```bash
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION
```

### 5. Create Azure Container Registry (ACR)

```bash
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_REGISTRY \
  --sku Basic \
  --location $LOCATION \
  --admin-enabled true
```

### 6. Build and Push Docker Image

```bash
# Login to ACR
az acr login --name $CONTAINER_REGISTRY

# Build image
docker build -f Dockerfile.azure -t ${CONTAINER_REGISTRY}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG} .

# Push image
docker push ${CONTAINER_REGISTRY}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}
```

### 7. Create Container Apps Environment

```bash
az containerapp env create \
  --name $CONTAINER_APP_ENV \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION
```

### 8. Create Container App

```bash
# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name $CONTAINER_REGISTRY --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $CONTAINER_REGISTRY --query passwords[0].value -o tsv)

# Create app with secrets
az containerapp create \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINER_APP_ENV \
  --image ${CONTAINER_REGISTRY}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG} \
  --registry-server ${CONTAINER_REGISTRY}.azurecr.io \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --target-port 10000 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 5 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --env-vars \
    "MONGO_URI=secretref:mongo-uri" \
    "REDIS_URL=secretref:redis-url" \
    "SECRET_KEY=secretref:secret-key" \
    "REFRESH_SECRET_KEY=secretref:refresh-secret-key" \
  --secrets \
    "mongo-uri=YOUR_MONGODB_CONNECTION_STRING" \
    "redis-url=YOUR_REDIS_CONNECTION_STRING" \
    "secret-key=YOUR_SECRET_KEY" \
    "refresh-secret-key=YOUR_REFRESH_SECRET_KEY"
```

### 9. Get Your App URL

```bash
az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn \
  -o tsv
```

## Updating Your App

### Deploy new version

```bash
# Build and push new image
docker build -f Dockerfile.azure -t ${CONTAINER_REGISTRY}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG} .
docker push ${CONTAINER_REGISTRY}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}

# Update container app
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --image ${CONTAINER_REGISTRY}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}
```

## Monitoring and Management

### View logs

```bash
# Stream logs
az containerapp logs show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --follow

# View recent logs
az containerapp logs show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --tail 100
```

### Scale configuration

```bash
# Manual scaling
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --min-replicas 1 \
  --max-replicas 10

# Enable scale to zero (for cost savings)
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --min-replicas 0
```

### Update secrets

```bash
az containerapp secret set \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --secrets \
    mongo-uri="new-mongodb-connection-string" \
    redis-url="new-redis-connection-string"
```

## Database Setup

### Option 1: MongoDB Atlas (Recommended)

1. Create free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free M0 cluster
3. Get connection string
4. Whitelist Azure IPs (or use 0.0.0.0/0 for testing)

### Option 2: Azure Cosmos DB

```bash
# Create Cosmos DB account
az cosmosdb create \
  --name price-deals-cosmos \
  --resource-group $RESOURCE_GROUP \
  --kind MongoDB

# Get connection string
az cosmosdb keys list \
  --name price-deals-cosmos \
  --resource-group $RESOURCE_GROUP \
  --type connection-strings
```

### Redis Setup

### Option 1: Redis Labs (Free tier)

1. Sign up at [Redis Labs](https://redis.com/try-free/)
2. Create free database
3. Get connection string

### Option 2: Azure Cache for Redis

```bash
# Create Redis cache
az redis create \
  --name price-deals-redis \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Basic \
  --vm-size c0

# Get connection string
az redis list-keys \
  --name price-deals-redis \
  --resource-group $RESOURCE_GROUP
```

## Cost Optimization Tips

1. **Enable scale to zero** (`--min-replicas 0`)
2. **Use free tiers** for MongoDB Atlas and Redis Labs
3. **Set resource limits** (0.5 CPU, 1GB memory is usually enough)
4. **Monitor usage** in Azure Portal
5. **Set up budget alerts** to avoid surprises

## Troubleshooting

### App won't start

```bash
# Check logs
az containerapp logs show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --tail 50

# Check app status
az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP
```

### Can't connect to databases

- Check connection strings are correct
- Verify IP whitelist in MongoDB Atlas
- Check Redis connection string format

### High costs

- Enable scale to zero
- Reduce max replicas
- Lower CPU/memory limits
- Check Azure cost analysis

## Clean Up Resources

```bash
# Delete entire resource group (removes everything)
az group delete --name $RESOURCE_GROUP --yes

# Or delete individual resources
az containerapp delete --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP
az containerapp env delete --name $CONTAINER_APP_ENV --resource-group $RESOURCE_GROUP
az acr delete --name $CONTAINER_REGISTRY --resource-group $RESOURCE_GROUP
```

## Alternative: Azure App Service

If you prefer App Service over Container Apps:

```bash
# Create App Service Plan (Linux, Consumption)
az appservice plan create \
  --name price-deals-plan \
  --resource-group $RESOURCE_GROUP \
  --is-linux \
  --sku B1

# Create Web App
az webapp create \
  --name price-deals-web \
  --resource-group $RESOURCE_GROUP \
  --plan price-deals-plan \
  --deployment-container-image-name ${CONTAINER_REGISTRY}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}
```

## Support and Resources

- [Azure Container Apps Documentation](https://docs.microsoft.com/en-us/azure/container-apps/)
- [Azure Pricing Calculator](https://azure.microsoft.com/en-us/pricing/calculator/)
- [Azure Free Account](https://azure.microsoft.com/en-us/free/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

## Next Steps

1. Deploy to Azure using the automated script
2. Set up custom domain (optional)
3. Configure CDN for static files (optional)
4. Set up monitoring and alerts
5. Configure auto-scaling rules
6. Set up CI/CD with GitHub Actions