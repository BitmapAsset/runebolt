# Runbook: Incident Response

## Severity Levels

- **P1 (Critical)**: Complete outage, data loss, security breach
- **P2 (High)**: Major feature degraded
- **P3 (Medium)**: Minor issues
- **P4 (Low)**: Cosmetic issues

## P1 Response

1. **Assess (0-5 min)**
   - Acknowledge page
   - Check status page
   - Verify scope

2. **Communicate (5-10 min)**
   - Internal: #incidents channel
   - External: Status page update
   - Users: Twitter if widespread

3. **Mitigate (10-30 min)**
   - Apply known fixes
   - Scale resources
   - Enable circuit breakers
   - Fallback to DR if needed

4. **Resolve**
   - Root cause analysis
   - Post-mortem within 24h

## Emergency Contacts

- Primary: +1-XXX-XXX-XXXX
- Secondary: +1-XXX-XXX-XXXX
- Escalation: +1-XXX-XXX-XXXX
