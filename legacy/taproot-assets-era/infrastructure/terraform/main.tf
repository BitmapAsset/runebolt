# RuneBolt DigitalOcean Infrastructure
# Terraform configuration for production deployment

terraform {
  required_version = ">= 1.5.0"
  
  backend "s3" {
    bucket         = "runebolt-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    endpoint       = "https://nyc3.digitaloceanspaces.com"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
  }
  
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

# ═══════════════════════════════════════════════════════════════════════════════
# PROJECT
# ═══════════════════════════════════════════════════════════════════════════════
resource "digitalocean_project" "runebolt" {
  name        = "runebolt-production"
  description = "RuneBolt Bitcoin L2 Payment Hub"
  purpose     = "Service or API"
  environment = "Production"
  resources = [
    digitalocean_droplet.manager.urn,
    digitalocean_droplet.worker.urn,
    digitalocean_droplet.database.urn,
    digitalocean_database_cluster.main.urn,
  ]
}

# ═══════════════════════════════════════════════════════════════════════════════
# VPC
# ═══════════════════════════════════════════════════════════════════════════════
resource "digitalocean_vpc" "main" {
  name     = "runebolt-vpc-nyc1"
  region   = "nyc1"
  ip_range = "10.10.0.0/16"
}

# ═══════════════════════════════════════════════════════════════════════════════
# FIREWALL
# ═══════════════════════════════════════════════════════════════════════════════
resource "digitalocean_firewall" "public" {
  name = "runebolt-public"

  droplet_ids = [for droplet in digitalocean_droplet.manager : droplet.id]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = var.admin_ips
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol         = "tcp"
    port_range       = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol         = "udp"
    port_range       = "53"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}

resource "digitalocean_firewall" "private" {
  name = "runebolt-private"

  droplet_ids = concat(
    [for droplet in digitalocean_droplet.worker : droplet.id],
    [for droplet in digitalocean_droplet.database : droplet.id]
  )

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = ["10.10.0.0/16"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "1-65535"
    source_addresses = ["10.10.0.0/16"]
  }

  outbound_rule {
    protocol         = "tcp"
    port_range       = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}

# ═══════════════════════════════════════════════════════════════════════════════
# MANAGER NODES (Docker Swarm Managers)
# ═══════════════════════════════════════════════════════════════════════════════
resource "digitalocean_droplet" "manager" {
  count  = 3
  name   = "runebolt-manager-${count.index + 1}"
  region = "nyc1"
  size   = "s-2vcpu-4gb"
  image  = "ubuntu-22-04-x64"
  
  vpc_uuid = digitalocean_vpc.main.id
  
  ssh_keys = [digitalocean_ssh_key.deploy.id]
  
  tags = ["manager", "runebolt"]
  
  user_data = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y docker.io docker-compose-plugin
    
    # Initialize Docker Swarm (only on first manager)
    if [ "${count.index}" = "0" ]; then
      docker swarm init --advertise-addr $(hostname -I | awk '{print $1}')
    fi
    
    # Install monitoring agent
    curl -sSL https://repos.insights.digitalocean.com/install.sh | sudo bash
  EOF
}

# ═══════════════════════════════════════════════════════════════════════════════
# WORKER NODES (Application containers)
# ═══════════════════════════════════════════════════════════════════════════════
resource "digitalocean_droplet" "worker" {
  count  = 3
  name   = "runebolt-worker-${count.index + 1}"
  region = "nyc1"
  size   = "s-4vcpu-8gb"
  image  = "ubuntu-22-04-x64"
  
  vpc_uuid = digitalocean_vpc.main.id
  
  ssh_keys = [digitalocean_ssh_key.deploy.id]
  
  tags = ["worker", "runebolt"]
  
  user_data = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y docker.io docker-compose-plugin
    
    # Install monitoring agent
    curl -sSL https://repos.insights.digitalocean.com/install.sh | sudo bash
  EOF
}

# ═══════════════════════════════════════════════════════════════════════════════
# DATABASE NODES (PostgreSQL + Vault)
# ═══════════════════════════════════════════════════════════════════════════════
resource "digitalocean_droplet" "database" {
  count  = 3
  name   = "runebolt-db-${count.index + 1}"
  region = "nyc1"
  size   = "s-4vcpu-8gb"
  image  = "ubuntu-22-04-x64"
  
  vpc_uuid = digitalocean_vpc.main.id
  
  ssh_keys = [digitalocean_ssh_key.deploy.id]
  
  tags = ["database", "runebolt"]
  
  user_data = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y docker.io
    
    # Setup for high I/O
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    echo 'vm.dirty_ratio=40' >> /etc/sysctl.conf
    echo 'vm.dirty_background_ratio=10' >> /etc/sysctl.conf
    sysctl -p
    
    # Install monitoring agent
    curl -sSL https://repos.insights.digitalocean.com/install.sh | sudo bash
  EOF
}

# ═══════════════════════════════════════════════════════════════════════════════
# MANAGED DATABASE (PostgreSQL)
# ═══════════════════════════════════════════════════════════════════════════════
resource "digitalocean_database_cluster" "main" {
  name       = "runebolt-postgres"
  engine     = "pg"
  version    = "15"
  size       = "db-s-2vcpu-4gb"
  region     = "nyc1"
  node_count = 2
  
  private_network_uuid = digitalocean_vpc.main.id
}

resource "digitalocean_database_db" "runebolt" {
  cluster_id = digitalocean_database_cluster.main.id
  name       = "runebolt"
}

resource "digitalocean_database_user" "app" {
  cluster_id = digitalocean_database_cluster.main.id
  name       = "runebolt_app"
}

# ═══════════════════════════════════════════════════════════════════════════════
# SPACES (S3-compatible object storage)
# ═══════════════════════════════════════════════════════════════════════════════
resource "digitalocean_spaces_bucket" "backups" {
  name   = "runebolt-backups"
  region = "nyc3"
  acl    = "private"
}

resource "digitalocean_spaces_bucket" "terraform_state" {
  name   = "runebolt-terraform-state"
  region = "nyc3"
  acl    = "private"
}

# ═══════════════════════════════════════════════════════════════════════════════
# LOAD BALANCER
# ═══════════════════════════════════════════════════════════════════════════════
resource "digitalocean_loadbalancer" "public" {
  name   = "runebolt-lb"
  region = "nyc1"

  forwarding_rule {
    entry_port     = 80
    entry_protocol = "http"

    target_port     = 80
    target_protocol = "http"
  }

  forwarding_rule {
    entry_port     = 443
    entry_protocol = "https"

    target_port     = 443
    target_protocol = "https"
    
    certificate_id  = digitalocean_certificate.main.id
  }

  healthcheck {
    port     = 80
    protocol = "http"
    path     = "/health"
  }

  droplet_ids = digitalocean_droplet.manager[*].id
}

resource