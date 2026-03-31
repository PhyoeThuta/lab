# Kubernetes Deployment Setup

## Step 1: Create GKE Cluster

Run the script to create your GKE cluster:

```bash
# On your local machine (must have gcloud CLI installed)
bash k8s/create-cluster.sh
```

Or manually:

```bash
gcloud config set project devops-lab-491207

gcloud container clusters create lab-cluster \
  --zone=asia-southeast1-a \
  --num-nodes=3 \
  --machine-type=n1-standard-2 \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=5 \
  --enable-autorepair \
  --enable-autoupgrade \
  --enable-stackdriver-kubernetes \
  --addons=HorizontalPodAutoscaling,HttpLoadBalancing \
  --workload-pool=devops-lab-491207.svc.id.goog

# Get credentials
gcloud container clusters get-credentials lab-cluster --zone=asia-southeast1-a --project=devops-lab-491207
```

---

## Step 2: Verify Cluster Connection

```bash
kubectl cluster-info
kubectl get nodes
```

---

## Step 3: Add GitHub Secrets

Go to your GitHub repo → **Settings → Secrets and variables → Actions**

Add these secrets:

| Secret Name | Value |
|---|---|
| `GCP_SA_KEY` | Entire JSON content from `devops-lab-491207-7f387f2acc5f.json` |
| `DB_PASSWORD` | `postgres123` |
| `JWT_SECRET` | `your-secret-key-change-in-production` |

---

## Step 4: Push to GitHub

```bash
git add .
git commit -m "Add Kubernetes manifests and GitHub Actions workflow"
git push origin main
```

The workflow `.github/workflows/deploy-gke.yml` will automatically:
1. ✅ Build Docker images
2. ✅ Push to Artifact Registry
3. ✅ Deploy to GKE cluster
4. ✅ Create namespace and secrets
5. ✅ Deploy all microservices

---

## Step 5: Verify Deployment

```bash
# Check all services
kubectl get svc -n production

# Check pods
kubectl get pods -n production

# Get frontend LoadBalancer IP
kubectl get svc frontend -n production
```

---

## Manual Deployment (Optional)

If you want to deploy manually without GitHub Actions:

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create secrets and configmap
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml

# Deploy PostgreSQL
kubectl apply -f k8s/postgres.yaml

# Wait for postgres
kubectl wait --for=condition=ready pod -l app=postgres -n production --timeout=300s

# Deploy services
kubectl apply -f k8s/auth-service.yaml
kubectl apply -f k8s/user-service.yaml
kubectl apply -f k8s/order-service.yaml
kubectl apply -f k8s/frontend.yaml
```

---

## File Structure

```
k8s/
├── create-cluster.sh           # Script to create GKE cluster
├── namespace.yaml              # Kubernetes namespace
├── secret.yaml                 # Secrets (DB password, JWT)
├── configmap.yaml              # Configuration variables
├── postgres.yaml               # PostgreSQL StatefulSet
├── auth-service.yaml           # Auth service deployment
├── user-service.yaml           # User service deployment
├── order-service.yaml          # Order service deployment
└── frontend.yaml               # Frontend deployment

.github/workflows/
├── deploy-gke.yml              # GitHub Actions for Kubernetes
└── deploy.yml                  # (Old Cloud Run workflow - unchanged)
```

---

## Important Notes

- ✅ **GitLab pipeline unchanged** - `.gitlab-ci.yml` still works for Cloud Run
- ✅ **Separate workflows** - `deploy-gke.yml` handles Kubernetes only
- ✅ **Both can run** - GitLab and GitHub Actions are independent
- ✅ **Database** - PostgreSQL runs inside K8s cluster
- ✅ **External access** - Frontend service is LoadBalancer type

---

## Troubleshooting

**Check logs:**
```bash
kubectl logs -n production <pod-name>

# Stream logs
kubectl logs -f -n production <pod-name>
```

**Describe pod:**
```bash
kubectl describe pod <pod-name> -n production
```

**Port forward to test locally:**
```bash
kubectl port-forward -n production svc/auth-service 3001:3001
```

---

Done! Your Kubernetes setup is ready.
