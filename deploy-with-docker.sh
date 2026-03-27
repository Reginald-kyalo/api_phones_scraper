#!/bin/bash

# Wrapper script to deploy with Docker using sg (newgrp)
# This allows using Docker without sudo after adding user to docker group

set -e

cd /home/reginaldkyalo/codes/api_phones_scraper
source apienv/bin/activate

# Run the deployment script within the docker group context
sg docker -c "./deploy-azure.sh"
