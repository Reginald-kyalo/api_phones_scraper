# Azure Container Apps Deployment Configuration
# This file defines the infrastructure for deploying to Azure Container Apps

# Resource naming
$RESOURCE_GROUP = "price-deals-rg"
$LOCATION = "eastus"  # Change to your preferred region
$CONTAINER_APP_ENV = "price-deals-env"
$CONTAINER_APP_NAME = "price-deals-app"
$CONTAINER_REGISTRY = "pricedealsacr"  # Must be globally unique
$IMAGE_NAME = "price-deals-web"
$IMAGE_TAG = "latest"

# Deployment Steps:

# 1. Login to Azure
# az login

# 2. Create Resource Group
# az group create --name $RESOURCE_GROUP --location $LOCATION

# 3. Create Azure Container Registry (ACR)
# az acr create --resource-group $RESOURCE_GROUP --name $CONTAINER_REGISTRY --sku Basic --location $LOCATION

# 4. Login to ACR
# az acr login --name $CONTAINER_REGISTRY

# 5. Build and push Docker image
# docker build -f Dockerfile.azure -t $CONTAINER_REGISTRY.azurecr.io/$IMAGE_NAME:$IMAGE_TAG .
# docker push $CONTAINER_REGISTRY.azurecr.io/$IMAGE_NAME:$IMAGE_TAG

# 6. Create Container Apps Environment
# az containerapp env create --name $CONTAINER_APP_ENV --resource-group $RESOURCE_GROUP --location $LOCATION

# 7. Create Container App with environment variables
# az containerapp create \
#   --name $CONTAINER_APP_NAME \
#   --resource-group $RESOURCE_GROUP \
#   --environment $CONTAINER_APP_ENV \
#   --image $CONTAINER_REGISTRY.azurecr.io/$IMAGE_NAME:$IMAGE_TAG \
#   --registry-server $CONTAINER_REGISTRY.azurecr.io \
#   --target-port 10000 \
#   --ingress external \
#   --min-replicas 0 \
#   --max-replicas 5 \
#   --cpu 0.5 \
#   --memory 1.0Gi \
#   --env-vars \
#     MONGO_URI=secretref:mongo-uri \
#     REDIS_URL=secretref:redis-url \
#     SECRET_KEY=secretref:secret-key \
#     REFRESH_SECRET_KEY=secretref:refresh-secret-key

# 8. Set secrets (replace with your actual values)
# az containerapp secret set \
#   --name $CONTAINER_APP_NAME \
#   --resource-group $RESOURCE_GROUP \
#   --secrets \
#     mongo-uri="your-mongodb-connection-string" \
#     redis-url="your-redis-connection-string" \
#     secret-key="your-secret-key" \
#     refresh-secret-key="your-refresh-secret-key"

# 9. Update with new image (for future deployments)
# docker build -f Dockerfile.azure -t $CONTAINER_REGISTRY.azurecr.io/$IMAGE_NAME:$IMAGE_TAG .
# docker push $CONTAINER_REGISTRY.azurecr.io/$IMAGE_NAME:$IMAGE_TAG
# az containerapp update \
#   --name $CONTAINER_APP_NAME \
#   --resource-group $RESOURCE_GROUP \
#   --image $CONTAINER_REGISTRY.azurecr.io/$IMAGE_NAME:$IMAGE_TAG

# Get app URL
# az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn -o tsv