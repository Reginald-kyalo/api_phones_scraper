# Azure Container Apps - Quick Reference

## 🚀 First-Time Deployment

```bash
chmod +x deploy-azure.sh
./deploy-azure.sh
```

## 🔄 Update Existing Deployment

```bash
# Set variables (adjust as needed)
RESOURCE_GROUP="price-deals-rg"
CONTAINER_APP_NAME="price-deals-app"
CONTAINER_REGISTRY="pricedealsacr"
IMAGE_NAME="price-deals-web"
IMAGE_TAG="latest"

# Build and push new image
docker build -f Dockerfile.azure -t ${CONTAINER_REGISTRY}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG} .
az acr login --name $CONTAINER_REGISTRY
docker push ${CONTAINER_REGISTRY}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}

# Update container app
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --image ${CONTAINER_REGISTRY}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}
```

## 📊 Monitoring Commands

```bash
# View live logs
az containerapp logs show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --follow

# View recent logs
az containerapp logs show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --tail 100

# Check app status
az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP

# Get app URL
az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn -o tsv
```

## ⚙️ Scaling Commands

```bash
# Enable scale to zero (cost savings)
az containerapp update --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --min-replicas 0 --max-replicas 5

# Always keep 1 instance running (no cold starts)
az containerapp update --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --min-replicas 1 --max-replicas 10

# Increase resources
az containerapp update --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --cpu 1.0 --memory 2.0Gi
```

## 🔐 Secrets Management

```bash
# List secrets
az containerapp secret list --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP

# Update secret
az containerapp secret set \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --secrets "secret-name=new-value"

# Remove secret
az containerapp secret remove --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --secret-names "secret-name"
```

## 🌐 Custom Domain

```bash
# Add custom domain
az containerapp hostname add \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --hostname "yourdomain.com"

# Bind certificate
az containerapp hostname bind \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --hostname "yourdomain.com" \
  --certificate-name "your-cert-name"
```

## 🧹 Cleanup Commands

```bash
# Delete app only
az containerapp delete --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --yes

# Delete environment
az containerapp env delete --name price-deals-env --resource-group $RESOURCE_GROUP --yes

# Delete entire resource group (removes EVERYTHING)
az group delete --name $RESOURCE_GROUP --yes
```

## 💰 Cost Management

```bash
# View costs for resource group
az consumption usage list --resource-group $RESOURCE_GROUP

# Set budget alert
az consumption budget create \
  --budget-name "price-deals-budget" \
  --amount 10 \
  --category Cost \
  --time-period Monthly \
  --time-grain Monthly \
  --resource-group $RESOURCE_GROUP
```

## 🔧 Troubleshooting

```bash
# Restart app
az containerapp revision restart --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP

# List revisions
az containerapp revision list --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP -o table

# Activate specific revision
az containerapp revision activate --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --revision "revision-name"

# Check health status
az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query properties.runningStatus
```

## 📱 Common Issues

### App won't start
```bash
# Check logs for errors
az containerapp logs show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --tail 100

# Check environment variables
az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query properties.configuration.secrets
```

### Can't connect to database
- Verify MongoDB connection string is correct
- Check IP whitelist in MongoDB Atlas (0.0.0.0/0 for testing)
- Ensure Redis connection string format is correct

### High costs
```bash
# Enable scale to zero
az containerapp update --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --min-replicas 0

# Check current replicas
az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query properties.configuration.scale
```

## 📚 Useful Links

- [Azure Portal](https://portal.azure.com)
- [Azure Container Apps Docs](https://docs.microsoft.com/en-us/azure/container-apps/)
- [Pricing Calculator](https://azure.microsoft.com/en-us/pricing/calculator/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Redis Labs](https://redis.com/try-free/)

## 🎯 Pro Tips

1. **Always use scale-to-zero** for development environments
2. **Monitor logs regularly** during initial deployment
3. **Set up budget alerts** to avoid surprise costs
4. **Use managed databases** (MongoDB Atlas, Redis Labs) for their free tiers
5. **Enable Application Insights** for better monitoring
6. **Tag resources** for better cost tracking