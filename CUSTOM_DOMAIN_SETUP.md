# Custom Domain Setup Guide for dealsonline.ninja

## Prerequisites
- Azure Container App must be deployed and running
- Access to your domain registrar's DNS management (where you bought dealsonline.ninja)

## Step-by-Step Process

### Step 1: Deploy the Application

```bash
# Make the deployment script executable
chmod +x deploy-azure.sh

# Run the deployment
./deploy-azure.sh
```

Wait for deployment to complete and note the app URL (e.g., `your-app.azurecontainerapps.io`)

### Step 2: Get Domain Verification Information

```bash
# Get your app's default URL
az containerapp show \
    --name price-deals-app \
    --resource-group price-deals-rg \
    --query properties.configuration.ingress.fqdn \
    -o tsv

# Get the verification ID
az containerapp show \
    --name price-deals-app \
    --resource-group price-deals-rg \
    --query properties.customDomainVerificationId \
    -o tsv
```

### Step 3: Configure DNS Records

Go to your domain registrar (where you bought dealsonline.ninja) and add these DNS records:

#### Option A: Root Domain (dealsonline.ninja)

**1. CNAME Record (for root domain):**
- **Type**: CNAME or ALIAS (if supported) or A record
- **Name**: `@` or leave blank
- **Value**: `<your-app-url>` (from Step 2)
- **TTL**: 3600 (1 hour)

⚠️ **Note**: Some registrars don't support CNAME for root domains. In that case:
- Use A record pointing to the IP address of your app, OR
- Use ANAME/ALIAS if supported, OR
- Use `www.dealsonline.ninja` instead (see Option B)

**2. TXT Record (for verification):**
- **Type**: TXT
- **Name**: `asuid` or `asuid.dealsonline.ninja`
- **Value**: `<verification-id>` (from Step 2)
- **TTL**: 3600

#### Option B: WWW Subdomain (www.dealsonline.ninja)

If root domain CNAME doesn't work, use www subdomain:

**1. CNAME Record:**
- **Type**: CNAME
- **Name**: `www`
- **Value**: `<your-app-url>`
- **TTL**: 3600

**2. TXT Record:**
- **Type**: TXT
- **Name**: `asuid.www` or `asuid.www.dealsonline.ninja`
- **Value**: `<verification-id>`
- **TTL**: 3600

**3. Root Domain Redirect (Optional):**
- Set up a redirect from `dealsonline.ninja` to `www.dealsonline.ninja` in your registrar settings

### Step 4: Wait for DNS Propagation

```bash
# Check if DNS has propagated (wait 5-10 minutes)
nslookup dealsonline.ninja
# or
dig dealsonline.ninja

# Check TXT record
nslookup -type=TXT asuid.dealsonline.ninja
# or
dig TXT asuid.dealsonline.ninja
```

### Step 5: Add Custom Domain to Azure

```bash
# Make the script executable
chmod +x add-custom-domain.sh

# Run the custom domain setup
./add-custom-domain.sh
```

OR manually:

```bash
RESOURCE_GROUP="price-deals-rg"
CONTAINER_APP_NAME="price-deals-app"
CUSTOM_DOMAIN="dealsonline.ninja"  # or www.dealsonline.ninja

# Add the hostname
az containerapp hostname add \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --hostname $CUSTOM_DOMAIN

# Bind with managed certificate (automatic SSL)
az containerapp hostname bind \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --hostname $CUSTOM_DOMAIN \
    --validation-method CNAME
```

### Step 6: Verify SSL Certificate

```bash
# Check hostname binding status
az containerapp hostname list \
    --name price-deals-app \
    --resource-group price-deals-rg \
    -o table

# Test the domain
curl -I https://dealsonline.ninja
```

## Common DNS Provider Instructions

### Namecheap
1. Go to Domain List → Manage → Advanced DNS
2. Add CNAME Record: Host=`@`, Value=`your-app.azurecontainerapps.io`
3. Add TXT Record: Host=`asuid`, Value=`verification-id`

### GoDaddy
1. Go to DNS Management
2. Add CNAME: Name=`@`, Points to=`your-app.azurecontainerapps.io`
3. Add TXT: Name=`asuid`, Value=`verification-id`

### Cloudflare
1. Go to DNS settings
2. Add CNAME: Name=`@`, Target=`your-app.azurecontainerapps.io`, Proxy=Off
3. Add TXT: Name=`asuid`, Content=`verification-id`
4. **Important**: Set SSL/TLS to "Full" not "Flexible"

### Google Domains
1. Go to DNS settings
2. Add CNAME: Name=`@`, Data=`your-app.azurecontainerapps.io`
3. Add TXT: Name=`asuid`, Data=`verification-id`

## Troubleshooting

### "Domain verification failed"
- Wait longer for DNS propagation (can take up to 48 hours, usually 10-30 minutes)
- Verify TXT record is correct: `dig TXT asuid.dealsonline.ninja`
- Make sure you copied the verification ID correctly

### "CNAME not allowed for root domain"
- Use `www.dealsonline.ninja` instead
- Or use ALIAS/ANAME if your DNS provider supports it
- Or use A record with IP address (less recommended)

### "SSL certificate provisioning failed"
- Make sure CNAME points to the correct Azure URL
- Remove and re-add the domain
- Wait a few minutes and try again

### Domain works without SSL
```bash
# Check certificate status
az containerapp hostname list \
    --name price-deals-app \
    --resource-group price-deals-rg

# Re-bind with managed certificate
az containerapp hostname bind \
    --name price-deals-app \
    --resource-group price-deals-rg \
    --hostname dealsonline.ninja \
    --validation-method CNAME
```

## Testing Your Domain

```bash
# Test HTTP redirect to HTTPS
curl -I http://dealsonline.ninja

# Test HTTPS
curl -I https://dealsonline.ninja

# Check SSL certificate
openssl s_client -connect dealsonline.ninja:443 -servername dealsonline.ninja

# Test from browser
# Open: https://dealsonline.ninja
```

## Summary of DNS Records Needed

| Type  | Name  | Value | Purpose |
|-------|-------|-------|---------|
| CNAME | @ or www | your-app.azurecontainerapps.io | Points domain to Azure |
| TXT | asuid | verification-id | Verifies domain ownership |

## Complete Command Sequence

```bash
# 1. Deploy app
chmod +x deploy-azure.sh
./deploy-azure.sh

# 2. Get info for DNS setup
RESOURCE_GROUP="price-deals-rg"
CONTAINER_APP_NAME="price-deals-app"

# Get app URL
APP_URL=$(az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn -o tsv)
echo "CNAME Value: $APP_URL"

# Get verification ID
VERIFICATION_ID=$(az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query properties.customDomainVerificationId -o tsv)
echo "TXT Value: $VERIFICATION_ID"

# 3. Add DNS records at your registrar (wait 10 minutes)

# 4. Verify DNS propagation
dig dealsonline.ninja
dig TXT asuid.dealsonline.ninja

# 5. Add custom domain
chmod +x add-custom-domain.sh
./add-custom-domain.sh

# 6. Test
curl -I https://dealsonline.ninja
```

## Cost Implications

- Custom domains: **FREE** on Azure Container Apps
- Managed SSL certificates: **FREE**
- No additional charges for HTTPS

## Next Steps After Domain Setup

1. Update CORS settings if needed
2. Update OAuth redirect URLs
3. Add www redirect if using root domain
4. Set up monitoring for domain health
5. Consider adding CDN for better performance