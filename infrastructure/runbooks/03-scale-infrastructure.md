# Runbook: Scale Infrastructure

## Scale Application

```bash
# Scale API horizontally
docker service scale runebolt_backend-api=5

# Scale workers
docker service scale runebolt_backend-worker=4

# Scale frontend
docker service scale runebolt_frontend=4
```

## Add New Node

```bash
# On manager
docker swarm join-token worker

# On new node
docker swarm join --token <token> <manager-ip>:2377

# Label node
docker node update --label-add role=worker <node-id>
```
