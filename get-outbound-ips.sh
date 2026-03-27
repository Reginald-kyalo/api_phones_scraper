#!/bin/bash

# Get outbound IP addresses for Azure Container App

RESOURCE_GROUP="price-deals-rg"
CONTAINER_APP_NAME="price-deals-app"
CONTAINER_APP_ENV="price-deals-env"

echo "Getting outbound IP addresses for Container App..."
echo

# Get the Container App Environment ID
ENV_ID=$(az containerapp show \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --query "properties.environmentId" -o tsv)

if [ -z "$ENV_ID" ]; then
    echo "Error: Could not find Container App Environment ID"
    exit 1
fi

echo "Container App Environment: $ENV_ID"
echo

# Get outbound IPs from the environment
az containerapp env show \
    --ids $ENV_ID \
    --query "properties.staticIp" -o tsv

echo
echo "Add this IP address to MongoDB Atlas Network Access:"
echo "1. Go to https://cloud.mongodb.com"
echo "2. Navigate to Network Access"
echo "3. Click 'Add IP Address'"
echo "4. Enter the IP address shown above"
echo "5. Click 'Confirm'"
