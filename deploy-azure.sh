#!/bin/bash

# Azure Container Apps Deployment Script
# This script automates the deployment to Azure Container Apps

set -e  # Exit on error

# Configuration
RESOURCE_GROUP="price-deals-rg"
LOCATION="Switzerland North"  # Change to your preferred region
CONTAINER_APP_ENV="price-deals-env"
CONTAINER_APP_NAME="price-deals-app"
CONTAINER_REGISTRY="pricedealsacr"  # Must be globally unique - change this!
IMAGE_NAME="price-deals-web"
IMAGE_TAG="latest"
MONGO_URI=mongodb+srv://reginaldkyalo:et9g7Oh0rJQ60ggA@phonedealscluster.5sbcedm.mongodb.net/?retryWrites=true&w=majority&appName=PhoneDealsCluster
REDIS_URL=redis-12239.c56.east-us.azure.cloud.redislabs.com:12239

echo "=== Azure Container Apps Deployment Script ==="
echo "Resource Group: $RESOURCE_GROUP"
echo "Location: $LOCATION"
echo "Container App: $CONTAINER_APP_NAME"
echo

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    # Try activating the virtual environment
    if [ -f "apienv/bin/activate" ]; then
        source apienv/bin/activate
    fi
    
    # Check again
    if ! command -v az &> /dev/null; then
        echo "Error: Azure CLI is not installed. Please install it first."
        echo "Visit: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        exit 1
    fi
fi

# Check if logged in to Azure
echo "Checking Azure login status..."
if ! az account show &> /dev/null; then
    echo "Not logged in to Azure. Logging in..."
    az login
else
    echo "Already logged in to Azure"
fi

# Create Resource Group
echo
echo "Creating resource group..."
az group create --name $RESOURCE_GROUP --location "$LOCATION"

# Create Azure Container Registry
echo
echo "Creating Azure Container Registry..."
az acr create \
    --resource-group $RESOURCE_GROUP \
    --name $CONTAINER_REGISTRY \
    --sku Basic \
    --location "$LOCATION" \
    --admin-enabled true

# Get ACR credentials
echo
echo "Getting ACR credentials..."
ACR_USERNAME=$(az acr credential show --name $CONTAINER_REGISTRY --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $CONTAINER_REGISTRY --query passwords[0].value -o tsv)

# Build Docker image
echo
echo "Building Docker image..."
docker build -f Dockerfile.azure -t ${CONTAINER_REGISTRY}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG} .

# Push to ACR
echo
echo "Pushing image to Azure Container Registry..."
echo "Logging in to ACR with credentials..."
docker login ${CONTAINER_REGISTRY}.azurecr.io --username $ACR_USERNAME --password $ACR_PASSWORD
docker push ${CONTAINER_REGISTRY}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}

# Create Container Apps Environment
echo
echo "Creating Container Apps Environment..."
az containerapp env create \
    --name $CONTAINER_APP_ENV \
    --resource-group $RESOURCE_GROUP \
    --location "$LOCATION"


# Create Container App
echo
echo "Creating Container App..."
echo "MongoDB URI: ${MONGO_URI:0:30}..." # Show first 30 chars for verification
echo "Redis URL: $REDIS_URL"

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
        "MONGO_URI=$MONGO_URI" \
        "REDIS_URL=$REDIS_URL"

# Get app URL
echo
echo "=== Deployment Complete! ==="
APP_URL=$(az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn -o tsv)
echo "Your app is available at: https://$APP_URL"
echo
echo "Useful commands:"
echo "- View logs: az containerapp logs show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --follow"
echo "- Scale app: az containerapp update --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --min-replicas 1 --max-replicas 10"
echo "- Delete app: az containerapp delete --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP"