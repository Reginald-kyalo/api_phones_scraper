#!/bin/bash

# Check Container App Status and Logs
# Use this to troubleshoot deployed container apps

RESOURCE_GROUP="price-deals-rg"
CONTAINER_APP_NAME="price-deals-app"

echo "=== Container App Status ==="
az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "{name:name, status:properties.runningStatus, fqdn:properties.configuration.ingress.fqdn, revision:properties.latestRevisionName}" \
  -o table

echo
echo "=== Environment Variables (without values for security) ==="
az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "properties.template.containers[0].env[*].name" \
  -o table

echo
echo "=== Recent Logs (last 50 lines) ==="
az containerapp logs show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --tail 50

echo
echo "=== Outbound IP Addresses (for MongoDB Atlas) ==="
az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "properties.outboundIpAddresses" \
  -o tsv
