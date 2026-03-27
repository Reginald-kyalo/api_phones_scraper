#!/bin/bash

# Quick redeploy script - rebuilds and pushes Docker image

set -e

RESOURCE_GROUP="price-deals-rg"
CONTAINER_APP_NAME="price-deals-app"
CONTAINER_REGISTRY="pricedealsacr"
IMAGE_NAME="price-deals-web"
IMAGE_TAG="latest"

echo "=== Quick Redeploy Script ==="
echo

# Get ACR credentials
echo "Getting ACR credentials..."
ACR_USERNAME=$(az acr credential show --name $CONTAINER_REGISTRY --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $CONTAINER_REGISTRY --query passwords[0].value -o tsv)

# Build Docker image
echo
echo "Building Docker image..."
docker build -f Dockerfile.azure -t ${CONTAINER_REGISTRY}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG} .

# Push to ACR
echo
echo "Pushing to ACR..."
docker login ${CONTAINER_REGISTRY}.azurecr.io --username $ACR_USERNAME --password $ACR_PASSWORD
docker push ${CONTAINER_REGISTRY}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}

# Update container app to pull new image
echo
echo "Updating container app..."
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --image ${CONTAINER_REGISTRY}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}

echo
echo "=== Redeploy Complete! ==="
echo "App URL: https://price-deals-app.icystone-629a02e7.switzerlandnorth.azurecontainerapps.io"
