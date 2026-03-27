#!/bin/bash

# Script to add custom domain to Azure Container App
# Run this AFTER the initial deployment is complete

set -e

# Configuration
RESOURCE_GROUP="price-deals-rg"
CONTAINER_APP_NAME="price-deals-app"
CUSTOM_DOMAIN="dealsonline.ninja"

echo "=== Adding Custom Domain to Azure Container App ==="
echo "Domain: $CUSTOM_DOMAIN"
echo "Container App: $CONTAINER_APP_NAME"
echo

# Step 1: Get the app's verification ID
echo "Getting domain verification ID..."
VERIFICATION_ID=$(az containerapp show \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --query properties.customDomainVerificationId \
    -o tsv)

echo
echo "=== IMPORTANT: DNS Configuration Required ==="
echo "Before proceeding, you need to add these DNS records to your domain:"
echo
echo "1. CNAME Record:"
echo "   Name: @"
echo "   Value: <your-app-url>.azurecontainerapps.io"
echo "   (Get this from: az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn -o tsv)"
echo
echo "2. TXT Record (for verification):"
echo "   Name: asuid"
echo "   Value: $VERIFICATION_ID"
echo
echo "After adding these DNS records, wait 5-10 minutes for propagation."
read -p "Have you added the DNS records and waited for propagation? (yes/no): " DNS_READY

if [ "$DNS_READY" != "yes" ]; then
    echo "Please add the DNS records first, then run this script again."
    exit 0
fi

# Step 2: Add the custom domain (without certificate first)
echo
echo "Adding custom domain to container app..."
az containerapp hostname add \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --hostname $CUSTOM_DOMAIN

# Step 3: Create managed certificate
echo
echo "Creating managed certificate for $CUSTOM_DOMAIN..."
az containerapp ssl upload \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --hostname $CUSTOM_DOMAIN \
    --certificate-name "${CUSTOM_DOMAIN}-cert" \
    --environment $(az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query properties.environmentId -o tsv | rev | cut -d'/' -f1 | rev)

# Alternative: Use managed certificate (simpler)
echo
echo "Binding managed certificate..."
az containerapp hostname bind \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --hostname $CUSTOM_DOMAIN \
    --validation-method CNAME

echo
echo "=== Custom Domain Setup Complete! ==="
echo "Your app is now available at: https://$CUSTOM_DOMAIN"
echo
echo "Note: It may take a few minutes for the SSL certificate to be issued."
echo "You can check the status with:"
echo "az containerapp hostname list --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP"