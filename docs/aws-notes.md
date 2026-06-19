# AWS — Student Notes

## The Four Services You Need

To deploy a containerized app on AWS you need exactly four services:

| Service | What it is |
|---|---|
| **IAM** | Identity and Access Management — who can do what |
| **VPC** | Virtual Private Cloud — your private network in AWS |
| **EC2** | Elastic Compute Cloud — your Linux server in the cloud |
| **ECR** | Elastic Container Registry — private Docker image storage |

---

## IAM — Identity and Access Management

Everything in AWS runs through IAM. It controls who can do what.

**Users** — a person or application that needs AWS access. Zero permissions by default; you grant only what's needed.

**Groups** — a collection of users that share permissions (`Developers`, `Admins`, etc.).

**Roles** — like a user, but for AWS services rather than people. An EC2 instance uses a Role to pull from ECR — no passwords stored on the server.

**Policies** — JSON documents that define permissions (Effect: Allow/Deny, Action: what, Resource: what it applies to).

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}
```

**Rules to always follow:**
- Never use the root account for day-to-day work
- Never commit access keys to git — treat them like passwords
- EC2 instances should use IAM Roles, not access keys

---

## Security Groups — The Firewall

A Security Group is a virtual firewall attached to your EC2 instance. It controls which traffic can reach it.

Security groups are **stateful** — allow inbound on port 8000 and the response is automatically allowed out.

For a typical deployment:

| Type | Port | Source | Why |
|---|---|---|---|
| SSH | 22 | Your IP | Connect to the server |
| Custom TCP | 8000 | 0.0.0.0/0 | Public access to your app |

**Most common mistake:** your app runs on port 8000 but the Security Group doesn't allow it — the browser just hangs. Always check this first when something isn't reachable.

---

## ECR — Elastic Container Registry

ECR is your private Docker registry inside AWS. EC2 instances pull from it using an IAM Role — no passwords stored anywhere.

```bash
# 1. Authenticate Docker to your ECR registry
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# 2. Create a repository (one-time)
aws ecr create-repository --repository-name myapp --region us-east-1

# 3. Tag your local image
docker tag myapp:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/myapp:latest

# 4. Push
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
```

ECR image URI format:
```
ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/REPOSITORY_NAME:TAG
```

---

## EC2 — Your Cloud Server

**Instance types** follow the pattern `family.size`:

| Instance | vCPUs | RAM | Use |
|---|---|---|---|
| t3.micro | 2 | 1 GB | Free tier, demos |
| t3.small | 2 | 2 GB | Small apps |
| t3.medium | 2 | 4 GB | Moderate workloads |

**AMI** — the OS template your server starts from. Use **Ubuntu 22.04** for today.

**Key Pair** — SSH authentication. AWS stores the public key; you download the `.pem` file once. Keep it safe — if you lose it you can't SSH in.

```bash
chmod 400 /path/to/key.pem          # fix permissions (SSH rejects it otherwise)
ssh -i /path/to/key.pem ubuntu@YOUR_PUBLIC_IP
```

---

## Full Deployment: Local → ECR → EC2

```
Local Machine           AWS
─────────────           ──────────────────────────────
 Your code
    │
    ├── docker build
    │
    └── Dockerfile ──→ Image ──→ ECR (push)
                                   │
                             EC2 (pull + run)
                                   │
                             App on public IP
```

**Step-by-step:**

### 1. Push your image to ECR
```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

docker tag myapp:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
```

### 2. Create an IAM Role for EC2 → ECR access
In AWS Console: IAM → Roles → Create Role → Trusted entity: EC2 → attach policy `AmazonEC2ContainerRegistryReadOnly` → name it `ec2-ecr-pull-role`.

Attach this role when launching your EC2 instance.

### 3. Launch EC2
- AMI: Ubuntu Server 22.04 LTS
- Instance type: t3.micro
- Key pair: create new, download `.pem`
- Security Group: SSH (22) from My IP + Custom TCP (8000) from Anywhere
- IAM Instance Profile: `ec2-ecr-pull-role`

### 4. Install Docker on EC2
```bash
sudo apt-get update -y
sudo apt-get install -y docker.io
sudo systemctl start docker && sudo systemctl enable docker
sudo usermod -aG docker ubuntu
# Log out and back in for the group change to take effect
```

### 5. Pull and run your image
```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

docker pull ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/myapp:latest

docker run -d \
  -p 8000:8000 \
  --name myapp \
  --restart unless-stopped \
  ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
```

`--restart unless-stopped` auto-restarts the container if EC2 reboots.

### 6. Verify
```
http://YOUR_EC2_PUBLIC_IP:8000
http://YOUR_EC2_PUBLIC_IP:8000/docs
```

```bash
docker ps
docker logs -f myapp
```

---

## AWS CLI Quick Reference

```bash
# Configure once
aws configure

# ECR
aws ecr get-login-password --region REGION | \
  docker login --username AWS --password-stdin ACCOUNT.dkr.ecr.REGION.amazonaws.com
aws ecr create-repository --repository-name NAME --region REGION
aws ecr list-images --repository-name NAME

# EC2
aws ec2 describe-instances
aws ec2 stop-instances --instance-ids i-xxx
aws ec2 start-instances --instance-ids i-xxx
```

---

## The Mental Model

```
Dockerfile → Image → Container       (Docker loop)
Image → ECR → EC2 → Running app     (Deployment loop)
```
