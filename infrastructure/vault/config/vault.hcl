# Vault Configuration for RuneBolt
# Development mode - change for production!

storage "file" {
  path = "/vault/file"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1  # Enable TLS in production!
}

api_addr = "http://0.0.0.0:8200"
cluster_addr = "http://0.0.0.0:8201"

ui = true

# Enable telemetry for Prometheus
telemetry {
  prometheus_retention_time = "30s"
  disable_hostname          = false
}

# Default lease settings
default_lease_ttl = "768h"  # 32 days
max_lease_ttl     = "768h"
