#!/bin/bash

# Set your variables
PROJECT_ID="tensile-medium-453414-p2"
ZONE="us-central1-c"
USER_EMAIL="reginald.kyalo@gmail.com"
REPLICA_SET_NAME="rsPhones"

# MongoDB instance names
PRIMARY_VM="mongo-primary"
SECONDARY1_VM="mongo-secondary1"
SECONDARY2_VM="mongo-secondary2"

# Network tag for all MongoDB instances
MONGO_TAG="mongodb-replica"

# Exit on error
set -e

echo "Setting up MongoDB Replica Set: ${REPLICA_SET_NAME}"

# Step 1: Create 3 MongoDB instances
for VM_NAME in $PRIMARY_VM $SECONDARY1_VM $SECONDARY2_VM; do
  echo "Creating VM instance: $VM_NAME"
  gcloud compute instances create $VM_NAME \
    --project=$PROJECT_ID \
    --zone=$ZONE \
    --machine-type=e2-medium \
    --network-interface=network-tier=PREMIUM,subnet=default \
    --maintenance-policy=MIGRATE \
    --provisioning-model=STANDARD \
    --tags=$MONGO_TAG \
    --create-disk=auto-delete=yes,boot=yes,device-name=$VM_NAME,image=projects/debian-cloud/global/images/debian-12-bookworm-v20250311,mode=rw,size=10,type=pd-balanced
done

# Step 2: Enable firewall rules for MongoDB replication
echo "Setting up firewall rules for MongoDB replication..."
gcloud compute firewall-rules create allow-mongodb-internal \
  --project=$PROJECT_ID \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:27017 \
  --source-tags=$MONGO_TAG \
  --target-tags=$MONGO_TAG \
  --description="Allow MongoDB communication between replica set members"

gcloud compute firewall-rules create allow-mongodb-iap \
  --project=$PROJECT_ID \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:27017 \
  --source-ranges=35.235.240.0/20 \
  --target-tags=$MONGO_TAG

# Step 3: Set up IAP access
echo "Configuring IAP access..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="user:$USER_EMAIL" \
  --role="roles/iap.tunnelResourceAccessor"

# Step 4: Install MongoDB on all instances
for VM_NAME in $PRIMARY_VM $SECONDARY1_VM $SECONDARY2_VM; do
  echo "Installing MongoDB on $VM_NAME..."
  gcloud compute ssh $VM_NAME --zone=$ZONE --tunnel-through-iap --command '
    # Install required packages
    sudo apt-get update
    sudo apt-get install -y gnupg curl

    # Import MongoDB public GPG key
    curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
      sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor

    # Add MongoDB repository
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/8.0 main" | \
      sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list

    # Update package database and install MongoDB
    sudo apt-get update
    sudo apt-get install -y mongodb-org

    # Configure MongoDB for replication
    sudo sed -i "s/#replication:/replication:\\n  replSetName: '"${REPLICA_SET_NAME}"'/g" /etc/mongod.conf
    sudo sed -i "s/bindIp: 127.0.0.1/bindIp: 0.0.0.0/g" /etc/mongod.conf
    
    # Enable and start MongoDB service
    sudo systemctl enable mongod
    sudo systemctl restart mongod
    
    # Wait for MongoDB to start
    sleep 5
    
    # Check MongoDB status
    sudo systemctl status mongod --no-pager
  '
done

# Step 5: Initialize the replica set from the primary
echo "Initializing replica set from primary node..."
PRIMARY_IP=$(gcloud compute instances describe $PRIMARY_VM --zone=$ZONE --format='get(networkInterfaces[0].networkIP)')
SECONDARY1_IP=$(gcloud compute instances describe $SECONDARY1_VM --zone=$ZONE --format='get(networkInterfaces[0].networkIP)')
SECONDARY2_IP=$(gcloud compute instances describe $SECONDARY2_VM --zone=$ZONE --format='get(networkInterfaces[0].networkIP)')

gcloud compute ssh $PRIMARY_VM --zone=$ZONE --tunnel-through-iap --command "
  # Initialize replica set
  mongosh --eval '
    rs.initiate({
      _id: \"${REPLICA_SET_NAME}\", 
      members: [
        {_id: 0, host: \"${PRIMARY_IP}:27017\", priority: 2},
        {_id: 1, host: \"${SECONDARY1_IP}:27017\", priority: 1},
        {_id: 2, host: \"${SECONDARY2_IP}:27017\", priority: 1}
      ]
    })
  '
  
  # Check replica set status
  sleep 10
  mongosh --eval 'rs.status()'
"

echo "✅ MongoDB Replica Set setup complete!"
echo ""
echo "Primary MongoDB: $PRIMARY_VM - $PRIMARY_IP"
echo "Secondary 1: $SECONDARY1_VM - $SECONDARY1_IP"
echo "Secondary 2: $SECONDARY2_VM - $SECONDARY2_IP"
echo ""
echo "🔑 Connect to primary using:"
echo "   mongosh \"mongodb://$PRIMARY_IP:27017,$SECONDARY1_IP:27017,$SECONDARY2_IP:27017/?replicaSet=${REPLICA_SET_NAME}\""
echo ""
echo "🔄 Monitor replication with:"
echo "   gcloud compute ssh $PRIMARY_VM --zone=$ZONE --tunnel-through-iap -- \"mongosh --eval 'rs.status()'\""

#!/bin/bash

# Set your variables
PRIMARY_VM="api-frontend-vm-2"
SECONDARY1_VM="mongo-secondary1"
SECONDARY2_VM="mongo-secondary2"
ZONE="us-central1-c"

# First, check keyfile location on primary
echo "Checking keyfile on primary..."
PRIMARY_KEYFILE_PATH=$(gcloud compute ssh $PRIMARY_VM --zone=$ZONE --tunnel-through-iap --command "
  sudo find / -name 'mongodb-keyfile' 2>/dev/null || echo 'NOT_FOUND'
")

if [[ $PRIMARY_KEYFILE_PATH == "NOT_FOUND" ]]; then
  echo "ERROR: No keyfile found on primary server. Please specify the path:"
  read -p "Keyfile path on primary: " PRIMARY_KEYFILE_PATH
fi

echo "Using keyfile at: $PRIMARY_KEYFILE_PATH"

# Configure each server with the keyfile
for VM in $PRIMARY_VM $SECONDARY1_VM $SECONDARY2_VM; do
  echo "Configuring $VM..."
  
  gcloud compute ssh $VM --zone=$ZONE --tunnel-through-iap --command "
    # If this is a secondary, copy keyfile from primary
    if [[ \"$VM\" != \"$PRIMARY_VM\" ]]; then
      echo 'Copying keyfile from primary (if needed)...'
      sudo mkdir -p $(dirname $PRIMARY_KEYFILE_PATH) 2>/dev/null
      gcloud compute scp $PRIMARY_VM:$PRIMARY_KEYFILE_PATH /tmp/mongodb-keyfile --zone=$ZONE --tunnel-through-iap &>/dev/null || echo 'Using existing keyfile'
      sudo mv /tmp/mongodb-keyfile $PRIMARY_KEYFILE_PATH 2>/dev/null || echo 'Keyfile already exists'
    fi
    
    # Set proper permissions
    sudo chown mongodb:mongodb $PRIMARY_KEYFILE_PATH 2>/dev/null || sudo chown mongod:mongod $PRIMARY_KEYFILE_PATH 2>/dev/null
    sudo chmod 400 $PRIMARY_KEYFILE_PATH
    
    # Update MongoDB config
    echo 'Updating MongoDB configuration...'
    if ! grep -q 'keyFile: '$PRIMARY_KEYFILE_PATH /etc/mongod.conf; then
      sudo sed -i '/security:/d' /etc/mongod.conf
      echo -e '\nsecurity:\n  keyFile: $PRIMARY_KEYFILE_PATH' | sudo tee -a /etc/mongod.conf
    fi
    
    # Ensure replication settings
    sudo sed -i 's/#replication:/replication:\\n  replSetName: rsPhones/g' /etc/mongod.conf 2>/dev/null || echo 'Replication already configured'
    sudo sed -i 's/bindIp: 127.0.0.1/bindIp: 0.0.0.0/g' /etc/mongod.conf 2>/dev/null || echo 'bindIp already configured'
    
    # Restart MongoDB
    echo 'Restarting MongoDB...'
    sudo systemctl restart mongod
    sleep 5
    
    # Report status
    sudo systemctl status mongod --no-pager | grep Active
  "
done