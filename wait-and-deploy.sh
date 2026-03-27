#!/bin/bash

# Wait for Azure provider registration and then deploy

set -e

echo "Waiting for Azure provider registration to complete..."
echo "This may take 2-5 minutes..."
echo

# Function to check provider status
check_provider() {
    local provider=$1
    local status=$(az provider show -n $provider --query "registrationState" -o tsv)
    echo "$provider: $status"
    echo $status
}

# Wait for all providers to be registered
while true; do
    acr_status=$(check_provider "Microsoft.ContainerRegistry")
    app_status=$(check_provider "Microsoft.App")
    insights_status=$(check_provider "Microsoft.OperationalInsights")
    
    if [ "$acr_status" == "Registered" ] && [ "$app_status" == "Registered" ] && [ "$insights_status" == "Registered" ]; then
        echo
        echo "✅ All providers registered successfully!"
        break
    fi
    
    echo "Still registering... waiting 30 seconds"
    echo
    sleep 30
done

echo
echo "Starting deployment..."
echo
./deploy-azure.sh
