output "manager_ips" {
  description = "Manager node public IPs"
  value       = digitalocean_droplet.manager[*].ipv4_address
}

output "database_endpoint" {
  description = "PostgreSQL endpoint"
  value       = digitalocean_database_cluster.main.host
  sensitive   = true
}

output "vpc_id" {
  description = "VPC ID"
  value       = digitalocean_vpc.main.id
}
