#!/bin/bash

set -e

# Variables
MONGO_PORT=27017
ADMIN_USER="admin"
ADMIN_PASS="mongopass"  # Change this to a secure password!

# Function to detect the operating system
detect_os() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VERSION=$VERSION_ID
  else
    echo "Unsupported operating system."
    exit 1
  fi
}

# Function to import MongoDB GPG key and add repository
add_mongodb_repo() {
  if [ "$OS" == "ubuntu" ]; then
    echo "🔑 Importing MongoDB GPG key for Ubuntu..."
    wget -qO - https://pgp.mongodb.com/server-8.0.asc | sudo tee /etc/apt/trusted.gpg.d/mongodb-server-8.0.gpg > /dev/null

    echo "📦 Adding MongoDB 8.0 repository for Ubuntu..."
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $VERSION_CODENAME/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
  elif [ "$OS" == "debian" ]; then
    echo "🔑 Importing MongoDB GPG key for Debian..."
    curl -fsSL https://pgp.mongodb.com/server-8.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor

    echo "📦 Adding MongoDB 8.0 repository for Debian..."
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/debian $VERSION_CODENAME/mongodb-org/8.0 main" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
  else
    echo "Unsupported operating system."
    exit 1
  fi
}

# Function to install MongoDB
install_mongodb() {
  echo "🔄 Updating package list..."
  sudo apt update

  echo "⬇️ Installing MongoDB 8.0..."
  sudo apt install -y mongodb-org
}

# Function to configure MongoDB
configure_mongodb() {
  echo "🔒 Configuring mongod.conf for all IP binding and authentication..."
  sudo sed -i 's/bindIp: 127.0.0.1/bindIp: 0.0.0.0/' /etc/mongod.conf
  sudo sed -i '/#security:/a\security:\n  authorization: enabled' /etc/mongod.conf

  echo "📡 Starting and enabling MongoDB..."
  sudo systemctl start mongod
  sudo systemctl enable mongod

  echo "⏳ Waiting for MongoDB to start..."
  sleep 5

  echo "👤 Creating admin user..."
  mongo --quiet --eval "
use admin;
db.createUser({
  user: '$ADMIN_USER',
  pwd: '$ADMIN_PASS',
  roles: [{ role: 'userAdminAnyDatabase', db: 'admin' }, { role: 'dbAdminAnyDatabase', db: 'admin' }, { role: 'readWriteAnyDatabase', db: 'admin' }]
});
"

  echo "🔒 Configuring firewall to allow MongoDB port..."
  sudo ufw allow OpenSSH
  sudo ufw allow $MONGO_PORT/tcp
  sudo ufw --force enable

  echo "🚀 Restarting MongoDB to apply authentication settings..."
  sudo systemctl restart mongod

  echo "🎉 MongoDB 8.0 setup complete!"
  echo "Admin User: $ADMIN_USER"
  echo "Admin Password: $ADMIN_PASS"
  echo "MongoDB running on port: $MONGO_PORT"
}

# Main script execution
detect_os
add_mongodb_repo
install_mongodb
configure_mongodb
