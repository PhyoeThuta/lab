#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
GCP_PROJECT_ID="devops-lab-491207"
GKE_CLUSTER="lab-cluster"
GKE_ZONE="asia-southeast1-a"
KUBE_NAMESPACE="production"
CLOUDSQL_INSTANCE="lab-postgres"
CLOUDSQL_DATABASE="lab"
CLOUDSQL_USER="postgres"
ARTIFACT_REGISTRY="asia-southeast1-docker.pkg.dev"
REGISTRY_NAME="lab"

echo -e "${YELLOW}🚀 Kubernetes Deployment Script${NC}"
echo ""

# Step 1: Authenticate to GCP
echo -e "${YELLOW}[1/7] Authenticating to Google Cloud...${NC}"
gcloud auth application-default login --project=$GCP_PROJECT_ID
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to authenticate to Google Cloud${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Authenticated${NC}"
echo ""

# Step 2: Get GKE cluster credentials
echo -e "${YELLOW}[2/7] Getting GKE cluster credentials...${NC}"
gcloud container clusters get-credentials $GKE_CLUSTER \
    --zone=$GKE_ZONE \
    --project=$GCP_PROJECT_ID
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to get cluster credentials${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Cluster credentials obtained${NC}"
echo ""

# Step 3: Create namespace
echo -e "${YELLOW}[3/7] Creating Kubernetes namespace...${NC}"
kubectl create namespace $KUBE_NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to create namespace${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Namespace $KUBE_NAMESPACE created/verified${NC}"
echo ""

# Step 4: Create Secrets
echo -e "${YELLOW}[4/7] Creating Kubernetes secrets...${NC}"

# Get Cloud SQL Connection Name
CONN_NAME=$(gcloud sql instances describe $CLOUDSQL_INSTANCE --format='value(connectionName)' --project=$GCP_PROJECT_ID)
if [ -z "$CONN_NAME" ]; then
    echo -e "${RED}❌ Failed to get Cloud SQL connection name${NC}"
    exit 1
fi

# Read secrets from environment or prompt
if [ -z "$DB_PASSWORD" ]; then
    read -sp "Enter DB_PASSWORD: " DB_PASSWORD
    echo ""
fi

if [ -z "$JWT_SECRET" ]; then
    read -sp "Enter JWT_SECRET: " JWT_SECRET
    echo ""
fi

kubectl create secret generic app-secrets \
    --from-literal=DB_HOST_CLOUDSQL=$CONN_NAME \
    --from-literal=DB_PASSWORD=$DB_PASSWORD \
    --from-literal=JWT_SECRET=$JWT_SECRET \
    --namespace=$KUBE_NAMESPACE \
    --dry-run=client -o yaml | kubectl apply -f -

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to create secrets${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Secrets created/updated${NC}"
echo ""

# Step 5: Create ConfigMap
echo -e "${YELLOW}[5/7] Creating Kubernetes ConfigMap...${NC}"
kubectl create configmap app-config \
    --from-literal=DB_PORT=5432 \
    --from-literal=DB_NAME=$CLOUDSQL_DATABASE \
    --from-literal=DB_USER=$CLOUDSQL_USER \
    --from-literal=JWT_EXPIRES_IN=24h \
    --from-literal=AUTH_SERVICE_URL=http://auth-service.$KUBE_NAMESPACE.svc.cluster.local:3001 \
    --from-literal=USER_SERVICE_URL=http://user-service.$KUBE_NAMESPACE.svc.cluster.local:3002 \
    --from-literal=ORDER_SERVICE_URL=http://order-service.$KUBE_NAMESPACE.svc.cluster.local:3003 \
    --namespace=$KUBE_NAMESPACE \
    --dry-run=client -o yaml | kubectl apply -f -

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to create ConfigMap${NC}"
    exit 1
fi
echo -e "${GREEN}✓ ConfigMap created/updated${NC}"
echo ""

# Step 6: Apply Kubernetes manifests
echo -e "${YELLOW}[6/7] Applying Kubernetes manifests...${NC}"
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/serviceaccount.yaml
kubectl apply -f k8s/auth-service.yaml
kubectl apply -f k8s/user-service.yaml
kubectl apply -f k8s/order-service.yaml
kubectl apply -f k8s/frontend.yaml

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to apply manifests${NC}"
    exit 1
fi
echo -e "${GREEN}✓ All manifests applied${NC}"
echo ""

# Step 7: Wait for deployments
echo -e "${YELLOW}[7/7] Waiting for deployments to be ready (this may take 2-3 minutes)...${NC}"
kubectl rollout status deployment/auth-service -n $KUBE_NAMESPACE --timeout=5m
kubectl rollout status deployment/user-service -n $KUBE_NAMESPACE --timeout=5m
kubectl rollout status deployment/order-service -n $KUBE_NAMESPACE --timeout=5m
kubectl rollout status deployment/frontend -n $KUBE_NAMESPACE --timeout=5m

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to verify deployments${NC}"
    exit 1
fi
echo -e "${GREEN}✓ All deployments ready${NC}"
echo ""

# Print service info
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Service Endpoints:"
kubectl get svc -n $KUBE_NAMESPACE
echo ""
echo "Deployments:"
kubectl get deployments -n $KUBE_NAMESPACE
echo ""
echo "Pods:"
kubectl get pods -n $KUBE_NAMESPACE
echo ""

# Wait for frontend LoadBalancer IP
echo -e "${YELLOW}Waiting for frontend LoadBalancer IP...${NC}"
for i in {1..30}; do
    EXTERNAL_IP=$(kubectl get svc frontend -n $KUBE_NAMESPACE --template='{{range .status.loadBalancer.ingress}}{{.ip}}{{end}}' 2>/dev/null)
    if [ ! -z "$EXTERNAL_IP" ]; then
        echo -e "${GREEN}✓ Frontend available at: http://$EXTERNAL_IP${NC}"
        break
    fi
    echo "Waiting... (attempt $i/30)"
    sleep 2
done

echo ""
echo -e "${GREEN}🎉 To access your services:${NC}"
echo "Frontend: http://<EXTERNAL-IP> (see above)"
echo ""
echo -e "${GREEN}To view logs:${NC}"
echo "kubectl logs -f deployment/auth-service -n production"
echo "kubectl logs -f deployment/user-service -n production"
echo "kubectl logs -f deployment/order-service -n production"
echo "kubectl logs -f deployment/frontend -n production"
