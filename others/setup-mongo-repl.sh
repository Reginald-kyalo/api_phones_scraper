#!/bin/bash

# Set your variables
PROJECT_ID="tensile-medium-453414-p2"
ZONE="us-central1-c"
USER_EMAIL="reginald.kyalo@gmail.com"
REPLICA_SET_NAME="rsPhones"

# MongoDB instance names
PRIMARY_VM="api-frontend-vm"  # Your existing primary server
SECONDARY1_VM="mongo-secondary1"
SECONDARY2_VM="mongo-secondary2"
PRIMARY_IP=$(gcloud compute instances describe $PRIMARY_VM --zone=$ZONE --format='get(networkInterfaces[0].networkIP)')
SECONDARY1_IP=$(gcloud compute instances describe $SECONDARY1_VM --zone=$ZONE --format='get(networkInterfaces[0].networkIP)')
SECONDARY2_IP=$(gcloud compute instances describe $SECONDARY2_VM --zone=$ZONE --format='get(networkInterfaces[0].networkIP)')

# MongoDB user credentials
MONGO_USER="root"
MONGO_PASS="mongodbmypass!"
AUTH_DB="admin"  # Typically the admin database for MongoDB authentication

# Step 7: Initialize the replica set from the primary
echo "Initializing replica set from primary node..."
gcloud compute ssh $PRIMARY_VM --zone=$ZONE --tunnel-through-iap --command "
  # Check if replica set is already initialized
  RS_STATUS=\$(mongosh --quiet --authenticationDatabase $AUTH_DB -u $MONGO_USER -p $MONGO_PASS --eval 'rs.status().ok' || echo '0')
  
  if [ \"\$RS_STATUS\" = \"1\" ]; then
    echo \"Replica set already initialized. Adding new members if needed...\"
    # Add secondary members if they don't exist
    mongosh --authenticationDatabase $AUTH_DB -u $MONGO_USER -p $MONGO_PASS --eval '
      var members = rs.conf().members.map(m => m.host);
      if (!members.includes(\"${SECONDARY1_IP}:27017\")) {
        rs.add({host: \"${SECONDARY1_IP}:27017\", priority: 0.5});
      }
      if (!members.includes(\"${SECONDARY2_IP}:27017\")) {
        rs.add({host: \"${SECONDARY2_IP}:27017\", priority: 0.5});
      }
    '
  else
    echo \"Initializing replica set...\"
    # Initialize replica set
    mongosh --authenticationDatabase $AUTH_DB -u $MONGO_USER -p $MONGO_PASS --eval '
      rs.initiate({
        _id: \"${REPLICA_SET_NAME}\", 
        members: [
          {_id: 0, host: \"${PRIMARY_IP}:27017\", priority: 1},
          {_id: 1, host: \"${SECONDARY1_IP}:27017\", priority: 0.5},
          {_id: 2, host: \"${SECONDARY2_IP}:27017\", priority: 0.5}
        ]
      })
    '
  fi
  
  # Wait for replica set to stabilize
  sleep 10
  
  # Check replica set status
  echo \"Current replica set status:\"
  mongosh --authenticationDatabase $AUTH_DB -u $MONGO_USER -p $MONGO_PASS --eval 'rs.status()'
"

echo "✅ MongoDB Replica Set setup complete!"
echo ""
echo "Primary MongoDB: $PRIMARY_VM - $PRIMARY_IP"
echo "Secondary 1: $SECONDARY1_VM - $SECONDARY1_IP"
echo "Secondary 2: $SECONDARY2_VM - $SECONDARY2_IP"
echo ""
echo "🔑 Connect to the replica set using:"
echo "   mongosh \"mongodb://$PRIMARY_IP:27017,$SECONDARY1_IP:27017,$SECONDARY2_IP:27017/?replicaSet=${REPLICA_SET_NAME}\""
echo ""
echo "🔄 Monitor replication with:"
echo "   gcloud compute ssh $PRIMARY_VM --zone=$ZONE --tunnel-through-iap -- \"mongosh --authenticationDatabase $AUTH_DB -u $MONGO_USER -p $MONGO_PASS --eval 'rs.status()'\""