#!/bin/bash

# GKE Cluster Creation Script
# This script creates a GKE cluster for your microservices

PROJECT_ID="devops-lab-491207"
CLUSTER_NAME="lab-cluster"
REGION="asia-southeast1"
ZONE="asia-southeast1-a"
MACHINE_TYPE="e2-small"
NUM_NODES=1

echo "Creating GKE cluster: $CLUSTER_NAME..."

# Set the project
gcloud config set project $PROJECT_ID

# Create the GKE cluster (low budget - 1 node, no autoscaling)
gcloud container clusters create $CLUSTER_NAME \
  --zone=$ZONE \
  --num-nodes=$NUM_NODES \
  --machine-type=$MACHINE_TYPE \
  --enable-autorepair \
  --enable-autoupgrade \
  --addons=HttpLoadBalancing \
  --workload-pool=$PROJECT_ID.svc.id.goog

echo "Cluster created successfully!"

# Get credentials
echo "Configuring kubectl..."
gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE --project=$PROJECT_ID

# Verify
echo "Verifying cluster..."
kubectl cluster-info
kubectl get nodes

echo "Done! Your GKE cluster is ready."
