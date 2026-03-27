#!/bin/bash

# Update Container App Environment Variables
# Use this script to update environment variables for the deployed container app

set -e

RESOURCE_GROUP="price-deals-rg"
CONTAINER_APP_NAME="price-deals-app"
MONGO_URI='mongodb+srv://reginaldkyalo:et9g7Oh0rJQ60ggA@phonedealscluster.5sbcedm.mongodb.net/?retryWrites=true&w=majority&appName=PhoneDealsCluster'
REDIS_URL='redis-12239.c56.east-us.azure.cloud.redislabs.com:12239'

echo "Updating environment variables for $CONTAINER_APP_NAME..."

az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --set-env-vars \
    "MONGO_URI=$MONGO_URI" \
    "REDIS_URL=$REDIS_URL"

echo
echo "Environment variables updated successfully!"
echo "The app will automatically restart with the new configuration."
