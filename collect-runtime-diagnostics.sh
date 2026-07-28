#!/usr/bin/env bash
set -uo pipefail

TS="$(date +%Y%m%d-%H%M%S)"
OUT="runtime-diagnostics-${TS}"
LOG="${OUT}/collect.log"
SUMMARY="${OUT}/summary.txt"

mkdir -p "$OUT"
exec > >(tee -a "$LOG") 2>&1

section() {
  echo
  echo "=================================================="
  echo " $1"
  echo "=================================================="
}

run() {
  local file="$1"
  local title="$2"
  shift 2
  section "$title"
  {
    echo "### $title"
    echo "\$ $*"
    "$@"
  } > "${OUT}/${file}.txt" 2>&1 || true
  cat "${OUT}/${file}.txt"
}

run_sh() {
  local file="$1"
  local title="$2"
  local cmd="$3"
  section "$title"
  {
    echo "### $title"
    echo "\$ $cmd"
    bash -lc "$cmd"
  } > "${OUT}/${file}.txt" 2>&1 || true
  cat "${OUT}/${file}.txt"
}

mask() {
  sed -E 's/(PASSWORD|SECRET|TOKEN|KEY|DATABASE_URL|API_KEY|CLIENT_SECRET)=.*/\1=***MASKED***/Ig'
}

section "Preflight"
if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl not found"
  exit 1
fi

kubectl cluster-info >/dev/null 2>&1 || {
  echo "kubectl cannot access cluster"
  exit 1
}

run "kubectl-version" "kubectl version" kubectl version --output=yaml
run "cluster-info" "Cluster info" kubectl cluster-info
run "nodes" "Nodes" kubectl get nodes -o wide
run "namespaces" "Namespaces" kubectl get ns
run "pods-all" "All pods" kubectl get pods -A -o wide
run "deployments" "Deployments" kubectl get deploy -A
run "statefulsets" "StatefulSets" kubectl get sts -A
run "events" "Events" kubectl get events -A --sort-by=.lastTimestamp
run "services" "Services" kubectl get svc -A -o wide
run "endpoints" "Endpoints" kubectl get endpoints -A
run "endpointslices" "EndpointSlices" kubectl get endpointslices -A
run "networkpolicies" "NetworkPolicies" kubectl get networkpolicy -A
run "networkpolicies-yaml" "NetworkPolicies YAML" kubectl get networkpolicy -A -o yaml

section "Describe non-running pods"
kubectl get pods -A --no-headers 2>/dev/null | while read -r ns pod ready status rest; do
  case "$status" in
    Running|Completed) ;;
    *)
      kubectl describe pod -n "$ns" "$pod" > "${OUT}/describe-pod-${ns}-${pod}.txt" 2>&1 || true
      ;;
  esac
done

section "Pod logs"
kubectl get pods -A --no-headers 2>/dev/null | while read -r ns pod rest; do
  kubectl logs -n "$ns" "$pod" --all-containers --tail=200 > "${OUT}/logs-${ns}-${pod}.txt" 2>&1 || true
  kubectl logs -n "$ns" "$pod" --all-containers --previous --tail=200 > "${OUT}/logs-previous-${ns}-${pod}.txt" 2>&1 || true
done

section "Important component logs"
for item in \
  "kube-system deploy/coredns" \
  "external-secrets deploy/external-secrets" \
  "vault sts/vault" \
  "omnixys-security deploy/keycloak" \
  "omnixys-data sts/kafka" \
  "omnixys-data deploy/minio" \
  "omnixys-observability deploy/opentelemetry-collector"
do
  ns="$(echo "$item" | awk '{print $1}')"
  res="$(echo "$item" | cut -d' ' -f2-)"
  name="$(echo "$res" | tr '/' '-')"
  kubectl logs -n "$ns" "$res" --all-containers --tail=300 > "${OUT}/logs-${ns}-${name}.txt" 2>&1 || true
done

run "clustersecretstore-yaml" "ClusterSecretStore YAML" kubectl get clustersecretstore -o yaml
run "clustersecretstore-describe" "ClusterSecretStore Describe" kubectl describe clustersecretstore omnixys-cluster-secret-store
run "externalsecrets" "ExternalSecrets" kubectl get externalsecret -A -o wide
run "externalsecrets-yaml" "ExternalSecrets YAML" kubectl get externalsecret -A -o yaml
run "secrets-runtime-list" "Runtime secrets list only" kubectl get secret -A

section "Affected deployment descriptions"
for svc in logstream address notification authentication event; do
  kubectl describe deploy -n omnixys-platform "$svc" > "${OUT}/describe-deploy-${svc}.txt" 2>&1 || true
  kubectl rollout status deploy/"$svc" -n omnixys-platform --timeout=5s > "${OUT}/rollout-${svc}.txt" 2>&1 || true
  kubectl get svc -n omnixys-platform "$svc" -o yaml > "${OUT}/service-${svc}.yaml" 2>&1 || true
  kubectl describe svc -n omnixys-platform "$svc" > "${OUT}/describe-service-${svc}.txt" 2>&1 || true
done

section "ConfigMaps"
for svc in logstream address notification authentication event; do
  kubectl get configmap -n omnixys-platform "${svc}-config" -o yaml > "${OUT}/configmap-${svc}.yaml" 2>&1 || true
done

section "Masked environment variables"
for svc in logstream address notification authentication event; do
  pod="$(kubectl get pods -n omnixys-platform --no-headers 2>/dev/null | awk -v s="$svc" '$2 ~ s && $3 ~ /Running/ {print $2; exit}')"
  [ -z "${pod:-}" ] && continue
  kubectl exec -n omnixys-platform "$pod" -- env 2>/dev/null | mask > "${OUT}/env-${svc}.txt" || true
  kubectl get pod -n omnixys-platform "$pod" -o yaml > "${OUT}/pod-yaml-${svc}.yaml" 2>&1 || true
done

section "Health checks"
{
  for svc in logstream address notification authentication event; do
    pod="$(kubectl get pods -n omnixys-platform --no-headers 2>/dev/null | awk -v s="$svc" '$2 ~ s && $3 ~ /Running/ {print $2; exit}')"
    [ -z "${pod:-}" ] && continue

    echo "--- $svc / $pod ---"

    ports="$(kubectl get pod -n omnixys-platform "$pod" -o jsonpath='{range .spec.containers[*].ports[*]}{.containerPort}{" "}{end}' 2>/dev/null || true)"
    [ -z "$ports" ] && ports="3000 7004 7401 8080"

    for port in $ports; do
      for path in /health /health/liveness /health/readiness /actuator/health /actuator/health/readiness /actuator/health/liveness; do
        echo -n "http://127.0.0.1:${port}${path} -> "
        kubectl exec -n omnixys-platform "$pod" -- sh -c \
          "command -v curl >/dev/null 2>&1 && curl -sS -m 3 -o /tmp/h.out -w '%{http_code}' http://127.0.0.1:${port}${path} && echo && cat /tmp/h.out; \
           command -v wget >/dev/null 2>&1 && wget -q -T 3 -O - http://127.0.0.1:${port}${path}" \
          2>&1 || true
        echo
      done
    done
  done
} > "${OUT}/health-checks.txt" 2>&1 || true
cat "${OUT}/health-checks.txt"

section "DNS tests"
DNS_TARGETS="
kubernetes.default.svc.cluster.local
keycloak.omnixys-security.svc.cluster.local
postgres.omnixys-data.svc.cluster.local
kafka.omnixys-data.svc.cluster.local
valkey.omnixys-data.svc.cluster.local
tempo.omnixys-observability.svc.cluster.local
kube-prometheus-stack-prometheus.omnixys-observability.svc.cluster.local
loki.omnixys-observability.svc.cluster.local
loki-gateway.omnixys-observability.svc.cluster.local
minio.omnixys-data.svc.cluster.local
vault.vault.svc.cluster.local
"

{
  for ns in omnixys-platform omnixys-security omnixys-observability omnixys-data vault external-secrets kube-system; do
    pod="$(kubectl get pods -n "$ns" --no-headers 2>/dev/null | awk '$3 ~ /Running/ {print $1; exit}')"
    [ -z "${pod:-}" ] && continue
    echo "--- DNS from $ns/$pod ---"
    for target in $DNS_TARGETS; do
      echo "### $target"
      kubectl exec -n "$ns" "$pod" -- sh -c \
        "nslookup $target 2>/dev/null || getent hosts $target 2>/dev/null || busybox nslookup $target 2>/dev/null" \
        2>&1 || echo "FAILED"
    done
  done
} > "${OUT}/dns-resolution.txt" 2>&1 || true
cat "${OUT}/dns-resolution.txt"

section "TCP connectivity"
CONN_TARGETS="
keycloak.omnixys-security.svc.cluster.local 80
kafka.omnixys-data.svc.cluster.local 9092
postgres.omnixys-data.svc.cluster.local 5432
valkey.omnixys-data.svc.cluster.local 6379
loki.omnixys-observability.svc.cluster.local 3100
loki-gateway.omnixys-observability.svc.cluster.local 80
tempo.omnixys-observability.svc.cluster.local 3100
tempo.omnixys-observability.svc.cluster.local 3200
opentelemetry-collector.omnixys-observability.svc.cluster.local 4318
kube-prometheus-stack-prometheus.omnixys-observability.svc.cluster.local 9090
minio.omnixys-data.svc.cluster.local 9000
vault.vault.svc.cluster.local 8200
"

{
  for ns in omnixys-platform omnixys-security omnixys-observability omnixys-data; do
    pod="$(kubectl get pods -n "$ns" --no-headers 2>/dev/null | awk '$3 ~ /Running/ {print $1; exit}')"
    [ -z "${pod:-}" ] && continue
    echo "--- TCP from $ns/$pod ---"
    echo "$CONN_TARGETS" | while read -r host port; do
      [ -z "${host:-}" ] && continue
      echo -n "$host:$port -> "
      kubectl exec -n "$ns" "$pod" -- sh -c \
        "if command -v nc >/dev/null 2>&1; then nc -zvw3 $host $port; \
         elif command -v wget >/dev/null 2>&1; then wget -q -T 3 -O /dev/null http://$host:$port >/dev/null 2>&1; \
         elif command -v curl >/dev/null 2>&1; then curl -sS -m 3 http://$host:$port >/dev/null; \
         else echo 'NO_TOOL'; exit 2; fi" \
        >/tmp/tcp.out 2>&1 && echo "REACHABLE" || { echo "UNREACHABLE"; cat /tmp/tcp.out; }
    done
  done
} > "${OUT}/tcp-connectivity.txt" 2>&1 || true
cat "${OUT}/tcp-connectivity.txt"

section "Runtime config files"
{
  for svc in logstream address notification authentication event; do
    pod="$(kubectl get pods -n omnixys-platform --no-headers 2>/dev/null | awk -v s="$svc" '$2 ~ s && $3 ~ /Running/ {print $2; exit}')"
    [ -z "${pod:-}" ] && continue
    echo "--- $svc / $pod ---"
    for base in /app /opt/app /workspace /config /etc; do
      kubectl exec -n omnixys-platform "$pod" -- sh -c \
        "[ -d '$base' ] && find '$base' -maxdepth 4 \\( -name application.yaml -o -name application.yml -o -name bootstrap.yml -o -name '.env' \\) -type f 2>/dev/null" \
        2>/dev/null | while read -r file; do
          echo "### $file"
          kubectl exec -n omnixys-platform "$pod" -- cat "$file" 2>/dev/null | mask || true
        done
    done
  done
} > "${OUT}/runtime-config-files.txt" 2>&1 || true
cat "${OUT}/runtime-config-files.txt"

section "Summary"
{
  echo "=== Omnixys Runtime Diagnostics Summary ==="
  echo "Collected: $(date)"
  echo
  echo "--- Failing Pods ---"
  kubectl get pods -A --no-headers 2>/dev/null | awk '$4 !~ /Running|Completed/ {print $1"/"$2" status="$4" restarts="$5}'
  echo
  echo "--- Services without endpoints ---"
  kubectl get endpoints -A --no-headers 2>/dev/null | awk '$3 == "<none>" {print $1"/"$2}'
  echo
  echo "--- ClusterSecretStore status ---"
  grep -E "Ready|Reason|Message|Status" "${OUT}/clustersecretstore-describe.txt" 2>/dev/null || true
  echo
  echo "--- ExternalSecret suspicious lines ---"
  grep -RniE "error|failed|invalid|not ready|secret does not exist|could not|denied" "${OUT}/externalsecrets"* 2>/dev/null || true
  echo
  echo "--- Health non-200 / failures ---"
  grep -RniE "500|503|DOWN|down|failed|Exception|UNAVAILABLE|refused|timed out" "${OUT}/health-checks.txt" 2>/dev/null || true
  echo
  echo "--- DNS failures ---"
  grep -RniE "FAILED|NXDOMAIN|SERVFAIL|can't resolve|not found|timed out" "${OUT}/dns-resolution.txt" 2>/dev/null || true
  echo
  echo "--- TCP failures ---"
  grep -RniE "UNREACHABLE|NO_TOOL|refused|timed out|bad address" "${OUT}/tcp-connectivity.txt" 2>/dev/null || true
} > "$SUMMARY" 2>&1 || true

cat "$SUMMARY"

section "Done"
echo "Diagnostics written to: $OUT"
echo
echo "To archive:"
echo "tar -czf ${OUT}.tar.gz ${OUT}"
