#!/usr/bin/env bash
set -euo pipefail

# Lightweight but production-oriented post-deploy smoke check for the restored
# fwber stack. The goal is to verify the public contract that matters most after
# a Hetzner cutover without requiring a full browser-driven test run.
#
# Usage examples:
#   ops/hetzner/scripts/smoke-check.sh
#   FWBER_API_URL="https://api.fwber.site/api" \
#   FWBER_GEO_URL="https://geo.fwber.site" \
#   FWBER_BACKEND_DIR="/var/www/fwber/repo/fwber-backend" \
#   ops/hetzner/scripts/smoke-check.sh
#
# Optional authenticated checks can be enabled with bearer tokens:
#   FWBER_USER_BEARER_TOKEN=...       # premium/status/plans checks
#   FWBER_MERCHANT_BEARER_TOKEN=...   # merchant dashboard check
#   FWBER_MODERATOR_BEARER_TOKEN=...  # moderation dashboard + merchant queue
#
# Optional websocket handshake:
#   FWBER_REVERB_APP_KEY=...          # enables a real websocket upgrade probe
#
# Optional report artifacts:
#   FWBER_REPORT_DIR=/var/log/fwber-smoke \
#   ops/hetzner/scripts/smoke-check.sh
#
# When FWBER_REPORT_DIR is set, the script emits:
#   smoke-check-summary.json
#   smoke-check-summary.md
#
# The report now also includes remediation-oriented diagnostics for common
# deployment drift signatures such as stale backend routes or a geo subdomain
# still pointing at Vercel instead of the Hetzner-hosted geo service.

API_URL="${FWBER_API_URL:-https://api.fwber.site/api}"
FRONTEND_URL="${FWBER_FRONTEND_URL:-https://fwber.site}"
WS_URL="${FWBER_WS_URL:-https://ws.fwber.site}"
GEO_URL="${FWBER_GEO_URL:-https://geo.fwber.site}"
BACKEND_DIR="${FWBER_BACKEND_DIR:-/var/www/fwber/repo/fwber-backend}"
USER_BEARER_TOKEN="${FWBER_USER_BEARER_TOKEN:-}"
MERCHANT_BEARER_TOKEN="${FWBER_MERCHANT_BEARER_TOKEN:-$USER_BEARER_TOKEN}"
MODERATOR_BEARER_TOKEN="${FWBER_MODERATOR_BEARER_TOKEN:-}"
REVERB_APP_KEY="${FWBER_REVERB_APP_KEY:-}"
WS_ORIGIN="${FWBER_WS_ORIGIN:-$FRONTEND_URL}"
SKIP_LOCAL_ARTISAN="${FWBER_SKIP_LOCAL_ARTISAN:-0}"
SKIP_WEBSOCKET="${FWBER_SKIP_WEBSOCKET:-0}"
REPORT_DIR="${FWBER_REPORT_DIR:-}"
REPORT_JSON_PATH="${FWBER_REPORT_JSON_PATH:-}"
REPORT_MD_PATH="${FWBER_REPORT_MD_PATH:-}"
ROAST_PAYLOAD='{"name":"Alex","job":"Bartender","trait":"always late","mode":"roast"}'
LOGIN_PAYLOAD='{"email":"smoke-check-invalid@example.com","password":"definitely-not-valid"}'
STARTED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

pass_count=0
fail_count=0
warn_count=0
case_log_file="$(mktemp)"
diagnostic_log_file="$(mktemp)"
snapshot_log_file="$(mktemp)"
dns_log_file="$(mktemp)"

cleanup() {
  rm -f "$case_log_file" "$diagnostic_log_file" "$snapshot_log_file" "$dns_log_file"
}

trap cleanup EXIT

info() {
  printf '[info] %s\n' "$1"
}

record_case() {
  local level="$1"
  local label="$2"
  local detail="$3"

  printf '%s\t%s\t%s\n' "$level" "$label" "$detail" >> "$case_log_file"
  printf '[%s] %s%s\n' "$level" "$label" "${detail:+ - $detail}"
}

pass_case() {
  pass_count=$((pass_count + 1))
  record_case 'pass' "$1" "$2"
}

warn_case() {
  warn_count=$((warn_count + 1))
  record_case 'warn' "$1" "$2"
}

fail_case() {
  fail_count=$((fail_count + 1))
  record_case 'fail' "$1" "$2"
}

add_diagnostic() {
  local severity="$1"
  local title="$2"
  local finding="$3"
  local remediation="$4"

  printf '%s\t%s\t%s\t%s\n' "$severity" "$title" "$finding" "$remediation" >> "$diagnostic_log_file"
}

add_snapshot() {
  local label="$1"
  local method="$2"
  local url="$3"
  local http_code="$4"
  local remote_ip="$5"
  local effective_url="$6"
  local server_header="$7"
  local content_type="$8"
  local location_header="$9"
  local body_excerpt="${10}"

  remote_ip="${remote_ip:-—}"
  effective_url="${effective_url:-—}"
  server_header="${server_header:-—}"
  content_type="${content_type:-—}"
  location_header="${location_header:-—}"
  body_excerpt="${body_excerpt:-—}"

  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$label" \
    "$method" \
    "$url" \
    "$http_code" \
    "$remote_ip" \
    "$effective_url" \
    "$server_header" \
    "$content_type" \
    "$location_header" \
    "$body_excerpt" >> "$snapshot_log_file"
}

add_dns_record() {
  local label="$1"
  local host="$2"
  local resolver="$3"
  local addresses="$4"
  local notes="$5"

  resolver="${resolver:-—}"
  addresses="${addresses:-—}"
  notes="${notes:-—}"

  printf '%s\t%s\t%s\t%s\t%s\n' \
    "$label" \
    "$host" \
    "$resolver" \
    "$addresses" \
    "$notes" >> "$dns_log_file"
}

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command '$command_name' is missing." >&2
    exit 1
  fi
}

json_escape() {
  local value="$1"
  value=${value//\\/\\\\}
  value=${value//\"/\\\"}
  value=${value//$'\n'/\\n}
  value=${value//$'\r'/\\r}
  value=${value//$'\t'/\\t}
  printf '%s' "$value"
}

markdown_escape() {
  local value="$1"
  value=${value//|/\\|}
  value=${value//$'\n'/<br>}
  printf '%s' "$value"
}

extract_host() {
  local url="$1"
  local host="${url#*://}"
  host="${host%%/*}"
  host="${host%%:*}"
  printf '%s' "$host"
}

normalize_api_url() {
  local url="$1"

  if [[ "$url" != */api ]]; then
    url="${url%/}/api"
  fi

  printf '%s' "$url"
}

load_reverb_app_key_from_backend() {
  if [[ -n "$REVERB_APP_KEY" ]]; then
    return
  fi

  if [[ ! -f "$BACKEND_DIR/artisan" ]] || ! command -v php >/dev/null 2>&1; then
    return
  fi

  local discovered_key=''
  if discovered_key="$(cd "$BACKEND_DIR" && php artisan tinker --execute="echo (string) config('reverb.apps.apps.0.key');" 2>/dev/null | tr -d '\r' | tail -n 1)" && [[ -n "$discovered_key" ]]; then
    REVERB_APP_KEY="$discovered_key"
  fi
}

resolve_host_with_python() {
  local host="$1"
  local python_cmd="$2"

  "$python_cmd" - "$host" <<'PY'
import socket
import sys

host = sys.argv[1]
try:
    infos = socket.getaddrinfo(host, None)
    addresses = sorted({info[4][0] for info in infos})
    print("|".join(addresses))
except Exception as exc:
    print(f"ERROR:{exc}")
    raise SystemExit(2)
PY
}

resolve_dns_targets() {
  local -a targets=(
    "frontend|$(extract_host "$FRONTEND_URL")"
    "api|$(extract_host "$API_URL")"
    "geo|$(extract_host "$GEO_URL")"
    "websocket|$(extract_host "$WS_URL")"
  )

  local python_cmd=''
  if command -v python3 >/dev/null 2>&1; then
    python_cmd='python3'
  elif command -v python >/dev/null 2>&1; then
    python_cmd='python'
  fi

  local target
  for target in "${targets[@]}"; do
    local label="${target%%|*}"
    local host="${target#*|}"

    if [[ -z "$host" ]]; then
      continue
    fi

    if [[ -n "$python_cmd" ]]; then
      local resolve_output=''
      if resolve_output="$(resolve_host_with_python "$host" "$python_cmd" 2>/dev/null)"; then
        add_dns_record "$label" "$host" "$python_cmd/socket.getaddrinfo" "$resolve_output" 'resolved successfully'
      else
        add_dns_record "$label" "$host" "$python_cmd/socket.getaddrinfo" '—' "resolution failed: $resolve_output"
      fi
    else
      add_dns_record "$label" "$host" 'unavailable' '—' 'python3/python not available for DNS resolution'
      warn_case 'DNS resolution appendix' 'Skipped because neither python3 nor python is available.'
      break
    fi
  done
}

ensure_report_paths() {
  if [[ -z "$REPORT_DIR" && -z "$REPORT_JSON_PATH" && -z "$REPORT_MD_PATH" ]]; then
    return
  fi

  if [[ -n "$REPORT_DIR" ]]; then
    mkdir -p "$REPORT_DIR"

    if [[ -z "$REPORT_JSON_PATH" ]]; then
      REPORT_JSON_PATH="$REPORT_DIR/smoke-check-summary.json"
    fi

    if [[ -z "$REPORT_MD_PATH" ]]; then
      REPORT_MD_PATH="$REPORT_DIR/smoke-check-summary.md"
    fi
  fi

  if [[ -n "$REPORT_JSON_PATH" ]]; then
    mkdir -p "$(dirname "$REPORT_JSON_PATH")"
  fi

  if [[ -n "$REPORT_MD_PATH" ]]; then
    mkdir -p "$(dirname "$REPORT_MD_PATH")"
  fi
}

write_json_report() {
  if [[ -z "$REPORT_JSON_PATH" ]]; then
    return
  fi

  local overall_status='passed'
  if [[ "$fail_count" -gt 0 ]]; then
    overall_status='failed'
  elif [[ "$warn_count" -gt 0 ]]; then
    overall_status='passed_with_warnings'
  fi

  {
    printf '{\n'
    printf '  "started_at": "%s",\n' "$(json_escape "$STARTED_AT")"
    printf '  "finished_at": "%s",\n' "$(json_escape "$(date -u +"%Y-%m-%dT%H:%M:%SZ")")"
    printf '  "overall_status": "%s",\n' "$overall_status"
    printf '  "targets": {\n'
    printf '    "api_url": "%s",\n' "$(json_escape "$API_URL")"
    printf '    "frontend_url": "%s",\n' "$(json_escape "$FRONTEND_URL")"
    printf '    "geo_url": "%s",\n' "$(json_escape "$GEO_URL")"
    printf '    "ws_url": "%s"\n' "$(json_escape "$WS_URL")"
    printf '  },\n'
    printf '  "summary": {\n'
    printf '    "passes": %s,\n' "$pass_count"
    printf '    "warnings": %s,\n' "$warn_count"
    printf '    "failures": %s\n' "$fail_count"
    printf '  },\n'
    printf '  "cases": [\n'

    local first_case=1
    while IFS=$'\t' read -r level label detail; do
      if [[ "$first_case" -eq 0 ]]; then
        printf ',\n'
      fi

      first_case=0
      printf '    {"level":"%s","label":"%s","detail":"%s"}' \
        "$(json_escape "$level")" \
        "$(json_escape "$label")" \
        "$(json_escape "$detail")"
    done < "$case_log_file"

    printf '\n  ],\n'
    printf '  "diagnostics": [\n'

    local first_diagnostic=1
    while IFS=$'\t' read -r severity title finding remediation; do
      if [[ "$first_diagnostic" -eq 0 ]]; then
        printf ',\n'
      fi

      first_diagnostic=0
      printf '    {"severity":"%s","title":"%s","finding":"%s","remediation":"%s"}' \
        "$(json_escape "$severity")" \
        "$(json_escape "$title")" \
        "$(json_escape "$finding")" \
        "$(json_escape "$remediation")"
    done < "$diagnostic_log_file"

    printf '\n  ],\n'
    printf '  "snapshots": [\n'

    local first_snapshot=1
    while IFS=$'\t' read -r label method url http_code remote_ip effective_url server_header content_type location_header body_excerpt; do
      if [[ "$first_snapshot" -eq 0 ]]; then
        printf ',\n'
      fi

      first_snapshot=0
      printf '    {"label":"%s","method":"%s","url":"%s","http_code":"%s","remote_ip":"%s","effective_url":"%s","server_header":"%s","content_type":"%s","location_header":"%s","body_excerpt":"%s"}' \
        "$(json_escape "$label")" \
        "$(json_escape "$method")" \
        "$(json_escape "$url")" \
        "$(json_escape "$http_code")" \
        "$(json_escape "$remote_ip")" \
        "$(json_escape "$effective_url")" \
        "$(json_escape "$server_header")" \
        "$(json_escape "$content_type")" \
        "$(json_escape "$location_header")" \
        "$(json_escape "$body_excerpt")"
    done < "$snapshot_log_file"

    printf '\n  ],\n'
    printf '  "dns_records": [\n'

    local first_dns_record=1
    while IFS=$'\t' read -r label host resolver addresses notes; do
      if [[ "$first_dns_record" -eq 0 ]]; then
        printf ',\n'
      fi

      first_dns_record=0
      printf '    {"label":"%s","host":"%s","resolver":"%s","addresses":"%s","notes":"%s"}' \
        "$(json_escape "$label")" \
        "$(json_escape "$host")" \
        "$(json_escape "$resolver")" \
        "$(json_escape "$addresses")" \
        "$(json_escape "$notes")"
    done < "$dns_log_file"

    printf '\n  ]\n'
    printf '}\n'
  } > "$REPORT_JSON_PATH"

  info "Wrote JSON smoke-check report to $REPORT_JSON_PATH"
}

write_markdown_report() {
  if [[ -z "$REPORT_MD_PATH" ]]; then
    return
  fi

  local overall_status='PASSED'
  if [[ "$fail_count" -gt 0 ]]; then
    overall_status='FAILED'
  elif [[ "$warn_count" -gt 0 ]]; then
    overall_status='PASSED WITH WARNINGS'
  fi

  {
    printf -- '# fwber Smoke Check Report\n\n'
    printf -- '- **Started:** `%s`\n' "$STARTED_AT"
    printf -- '- **Finished:** `%s`\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    printf -- '- **Overall Status:** **%s**\n' "$overall_status"
    printf -- '- **API URL:** `%s`\n' "$API_URL"
    printf -- '- **Frontend URL:** `%s`\n' "$FRONTEND_URL"
    printf -- '- **Geo URL:** `%s`\n' "$GEO_URL"
    printf -- '- **Websocket URL:** `%s`\n\n' "$WS_URL"
    printf -- '## Summary\n\n'
    printf -- '- Passes: **%s**\n' "$pass_count"
    printf -- '- Warnings: **%s**\n' "$warn_count"
    printf -- '- Failures: **%s**\n\n' "$fail_count"
    printf -- '## Case Results\n\n'
    printf -- '| Level | Check | Detail |\n'
    printf -- '| --- | --- | --- |\n'

    while IFS=$'\t' read -r level label detail; do
      printf -- '| %s | %s | %s |\n' \
        "$(markdown_escape "$level")" \
        "$(markdown_escape "$label")" \
        "$(markdown_escape "$detail")"
    done < "$case_log_file"

    printf -- '\n## Endpoint Fingerprints\n\n'
    printf -- '| Check | HTTP | Remote IP | Server | Content-Type | Location | Effective URL |\n'
    printf -- '| --- | --- | --- | --- | --- | --- | --- |\n'

    while IFS=$'\t' read -r label method url http_code remote_ip effective_url server_header content_type location_header body_excerpt; do
      printf -- '| %s | %s | %s | %s | %s | %s | %s |\n' \
        "$(markdown_escape "$label")" \
        "$(markdown_escape "$http_code")" \
        "$(markdown_escape "$remote_ip")" \
        "$(markdown_escape "$server_header")" \
        "$(markdown_escape "$content_type")" \
        "$(markdown_escape "$location_header")" \
        "$(markdown_escape "$effective_url")"
    done < "$snapshot_log_file"

    printf -- '\n## DNS Resolution Appendix\n\n'
    printf -- '| Label | Host | Resolver | Addresses | Notes |\n'
    printf -- '| --- | --- | --- | --- | --- |\n'

    while IFS=$'\t' read -r label host resolver addresses notes; do
      printf -- '| %s | %s | %s | %s | %s |\n' \
        "$(markdown_escape "$label")" \
        "$(markdown_escape "$host")" \
        "$(markdown_escape "$resolver")" \
        "$(markdown_escape "$addresses")" \
        "$(markdown_escape "$notes")"
    done < "$dns_log_file"

    printf -- '\n## Diagnostics & Recommended Actions\n\n'

    if [[ ! -s "$diagnostic_log_file" ]]; then
      printf -- '- No additional remediation diagnostics were generated for this run.\n'
    else
      local index=1
      while IFS=$'\t' read -r severity title finding remediation; do
        printf -- '### %s. %s (%s)\n\n' \
          "$index" \
          "$(markdown_escape "$title")" \
          "$(markdown_escape "$severity")"
        printf -- '- **Finding:** %s\n' "$(markdown_escape "$finding")"
        printf -- '- **Recommended Action:** %s\n\n' "$(markdown_escape "$remediation")"
        index=$((index + 1))
      done < "$diagnostic_log_file"
    fi
  } > "$REPORT_MD_PATH"

  info "Wrote Markdown smoke-check report to $REPORT_MD_PATH"
}

write_reports() {
  ensure_report_paths
  write_json_report
  write_markdown_report
}

build_diagnostics() {
  if grep -Fq $'fail	API health endpoint	Returned HTTP 404' "$case_log_file" \
    && grep -Fq $'fail	API liveness endpoint	Returned HTTP 404' "$case_log_file" \
    && grep -Fq $'fail	API readiness endpoint	Returned HTTP 404' "$case_log_file"; then
    add_diagnostic \
      'critical' \
      'Backend route drift on api.fwber.site' \
      'All public health routes returned 404 even though other backend routes were reachable, which strongly suggests the live backend is serving an older code version or an unexpected route set.' \
      'Redeploy the backend currently serving api.fwber.site from the latest main branch, then re-run php artisan deploy:verify and the smoke check. Also verify that Nginx is pointing at the intended fwber-backend/public directory and that route/config caches were rebuilt during deploy.'
  fi

  if grep -Fq $'fail	Geo nearby endpoint	' "$case_log_file" \
    && grep -Fq 'deployment could not be found on Vercel' "$case_log_file"; then
    add_diagnostic \
      'critical' \
      'Geo domain is still pointing at Vercel or a missing Vercel target' \
      'The geo smoke probe hit a Vercel deployment-not-found response instead of a Hetzner-hosted geo microservice response.' \
      'Update DNS and/or the reverse-proxy target for geo.fwber.site so it points at the Rust geo service on the Hetzner VPS, then confirm the Nginx geo virtual host proxies to 127.0.0.1:8081.'
  fi

  if grep -Fq $'warn	Premium authenticated smoke checks	Skipped because FWBER_USER_BEARER_TOKEN is not set.' "$case_log_file" \
    || grep -Fq $'warn	Merchant authenticated smoke checks	Skipped because FWBER_MERCHANT_BEARER_TOKEN is not set.' "$case_log_file" \
    || grep -Fq $'warn	Moderation authenticated smoke checks	Skipped because FWBER_MODERATOR_BEARER_TOKEN is not set.' "$case_log_file"; then
    add_diagnostic \
      'medium' \
      'Authenticated smoke coverage is incomplete' \
      'Some premium, merchant, or moderation smoke probes were skipped because smoke-test bearer tokens were not supplied.' \
      'Provision production-safe smoke-test accounts and tokens for user, merchant, and moderator roles so the smoke script can verify privileged surfaces after deploys.'
  fi

  if grep -Fq $'warn	Websocket upgrade probe	Skipped because FWBER_REVERB_APP_KEY is not set.' "$case_log_file"; then
    add_diagnostic \
      'medium' \
      'Realtime verification is not running at handshake depth' \
      'The websocket smoke probe was skipped because the Reverb app key was not supplied to the script.' \
      'Expose FWBER_REVERB_APP_KEY to the deployment smoke environment so the script can verify a real websocket upgrade instead of leaving realtime untested.'
  fi

  if grep -Fq $'pass	Invalid-login contract check	Returned HTTP 422.' "$case_log_file" \
    && grep -Fq $'pass	Public roast preview check	Returned HTTP 200.' "$case_log_file" \
    && (grep -Fq $'fail	API health endpoint	' "$case_log_file" || grep -Fq $'fail	Geo nearby endpoint	' "$case_log_file"); then
    add_diagnostic \
      'info' \
      'Live deployment is partially healthy, not fully down' \
      'Auth validation and public roast preview still responded correctly during the smoke run, which narrows the problem to specific deployment/routing drift instead of a total public outage.' \
      'Focus remediation on backend rollout alignment and geo-domain routing before spending time on broad outage debugging.'
  fi
}

check_local_artisan() {
  local label='Local artisan deploy verification'

  if [[ "$SKIP_LOCAL_ARTISAN" == "1" ]]; then
    warn_case "$label" 'Skipped because FWBER_SKIP_LOCAL_ARTISAN=1.'
    return
  fi

  if [[ ! -f "$BACKEND_DIR/artisan" ]]; then
    warn_case "$label" "Skipped because '$BACKEND_DIR/artisan' was not found."
    return
  fi

  require_command php

  local output
  if output="$(cd "$BACKEND_DIR" && php artisan deploy:verify --json 2>&1)"; then
    if grep -Eq '"status"[[:space:]]*:[[:space:]]*"healthy"' <<<"$output"; then
      pass_case "$label" 'php artisan deploy:verify reported healthy.'
      return
    fi

    fail_case "$label" "deploy:verify did not report healthy. Output: $(printf '%s' "$output" | tr '\n' ' ' | head -c 400)"
    return
  fi

  fail_case "$label" "deploy:verify failed to execute. Output: $(printf '%s' "$output" | tr '\n' ' ' | head -c 400)"
}

run_http_check() {
  local label="$1"
  local method="$2"
  local url="$3"
  local expected_codes="$4"
  local body_regex="$5"
  local payload="${6:-}"
  local bearer_token="${7:-}"

  local response_file
  local error_file
  local headers_file
  response_file="$(mktemp)"
  error_file="$(mktemp)"
  headers_file="$(mktemp)"

  local -a curl_args
  curl_args=(
    -sS
    -X "$method"
    "$url"
    -H 'Accept: application/json'
    -D "$headers_file"
    -o "$response_file"
    -w '%{http_code}\t%{remote_ip}\t%{url_effective}'
  )

  if [[ -n "$payload" ]]; then
    curl_args+=(
      -H 'Content-Type: application/json'
      --data "$payload"
    )
  fi

  if [[ -n "$bearer_token" ]]; then
    curl_args+=( -H "Authorization: Bearer $bearer_token" )
  fi

  local curl_meta
  if ! curl_meta="$(curl "${curl_args[@]}" 2>"$error_file")"; then
    local curl_error
    curl_error="$(tr '\n' ' ' < "$error_file")"
    add_snapshot "$label" "$method" "$url" 'connect_error' '' '' '' '' '' "$(printf '%s' "$curl_error" | head -c 240)"
    rm -f "$response_file" "$error_file" "$headers_file"
    fail_case "$label" "Request failed to connect: ${curl_error:-curl error}"
    return
  fi

  local http_code
  local remote_ip
  local effective_url
  IFS=$'\t' read -r http_code remote_ip effective_url <<< "$curl_meta"

  local response_body
  response_body="$(cat "$response_file")"

  local server_header
  local content_type
  local location_header
  server_header="$( { grep -i '^server:' "$headers_file" || true; } | tail -n 1 | cut -d':' -f2- | sed 's/^ *//' | tr -d '\r')"
  content_type="$( { grep -i '^content-type:' "$headers_file" || true; } | tail -n 1 | cut -d':' -f2- | sed 's/^ *//' | tr -d '\r')"
  location_header="$( { grep -i '^location:' "$headers_file" || true; } | tail -n 1 | cut -d':' -f2- | sed 's/^ *//' | tr -d '\r')"

  add_snapshot \
    "$label" \
    "$method" \
    "$url" \
    "$http_code" \
    "$remote_ip" \
    "$effective_url" \
    "$server_header" \
    "$content_type" \
    "$location_header" \
    "$(printf '%s' "$response_body" | head -c 240)"

  rm -f "$response_file" "$error_file" "$headers_file"

  local expected_code_matched=0
  local expected_code
  for expected_code in $expected_codes; do
    if [[ "$http_code" == "$expected_code" ]]; then
      expected_code_matched=1
      break
    fi
  done

  if [[ "$expected_code_matched" != "1" ]]; then
    fail_case "$label" "Returned HTTP $http_code, expected one of [$expected_codes]. Body: $(printf '%s' "$response_body" | head -c 400)"
    return
  fi

  if [[ -n "$body_regex" ]] && ! grep -Eq "$body_regex" <<<"$response_body"; then
    fail_case "$label" "Returned HTTP $http_code but body did not match /$body_regex/. Body: $(printf '%s' "$response_body" | head -c 400)"
    return
  fi

  pass_case "$label" "Returned HTTP $http_code."
}

check_websocket_upgrade() {
  local label='Websocket upgrade probe'

  if [[ "$SKIP_WEBSOCKET" == "1" ]]; then
    warn_case "$label" 'Skipped because FWBER_SKIP_WEBSOCKET=1.'
    return
  fi

  if [[ -z "$REVERB_APP_KEY" ]]; then
    warn_case "$label" 'Skipped because FWBER_REVERB_APP_KEY is not set.'
    return
  fi

  require_command openssl

  local ws_host
  ws_host="$(printf '%s' "$WS_URL" | sed -E 's#^https?://##; s#/.*$##')"

  local path
  path="/app/${REVERB_APP_KEY}?protocol=7&client=fwber-smoke-check&version=1.0&flash=false"

  local handshake_response
  handshake_response="$({
    printf 'GET %s HTTP/1.1\r\n' "$path"
    printf 'Host: %s\r\n' "$ws_host"
    printf 'Origin: %s\r\n' "$WS_ORIGIN"
    printf 'Connection: Upgrade\r\n'
    printf 'Upgrade: websocket\r\n'
    printf 'Sec-WebSocket-Key: SGV0em5lclNtb2tlQ2hlY2s=\r\n'
    printf 'Sec-WebSocket-Version: 13\r\n\r\n'
  } | openssl s_client -quiet -connect "${ws_host}:443" -servername "$ws_host" 2>/dev/null | head -n 1)"

  if grep -Eq '101[[:space:]]+Switching Protocols' <<<"$handshake_response"; then
    pass_case "$label" "Received a successful websocket upgrade from $WS_URL."
    return
  fi

  fail_case "$label" "Did not receive 101 Switching Protocols. First line: ${handshake_response:-<empty>}"
}

run_optional_authenticated_checks() {
  if [[ -n "$USER_BEARER_TOKEN" ]]; then
    run_http_check 'Premium plans endpoint' GET "${API_URL%/}/premium/plans" '200' '"plans"' '' "$USER_BEARER_TOKEN"
    run_http_check 'Premium status endpoint' GET "${API_URL%/}/premium/status" '200' '"is_premium"' '' "$USER_BEARER_TOKEN"
  else
    warn_case 'Premium authenticated smoke checks' 'Skipped because FWBER_USER_BEARER_TOKEN is not set.'
  fi

  if [[ -n "$MERCHANT_BEARER_TOKEN" ]]; then
    run_http_check 'Merchant dashboard endpoint' GET "${API_URL%/}/merchant-portal/dashboard" '200' '"stats"' '' "$MERCHANT_BEARER_TOKEN"
  else
    warn_case 'Merchant authenticated smoke checks' 'Skipped because FWBER_MERCHANT_BEARER_TOKEN is not set.'
  fi

  if [[ -n "$MODERATOR_BEARER_TOKEN" ]]; then
    run_http_check 'Moderation dashboard endpoint' GET "${API_URL%/}/moderation/dashboard" '200' '"stats"' '' "$MODERATOR_BEARER_TOKEN"
    run_http_check 'Merchant moderation queue endpoint' GET "${API_URL%/}/moderation/merchants" '200' '"data"|"current_page"' '' "$MODERATOR_BEARER_TOKEN"
  else
    warn_case 'Moderation authenticated smoke checks' 'Skipped because FWBER_MODERATOR_BEARER_TOKEN is not set.'
  fi
}

main() {
  require_command curl

  API_URL="$(normalize_api_url "$API_URL")"
  GEO_QUERY_URL="${GEO_URL%/}/nearby?lat=40.7580&lng=-73.9855&radius_m=500"
  load_reverb_app_key_from_backend

  info 'Starting fwber post-deploy smoke check.'
  info "API URL: $API_URL"
  info "Frontend URL: $FRONTEND_URL"
  info "Geo URL: $GEO_URL"
  info "WS URL: $WS_URL"

  check_local_artisan
  run_http_check 'Frontend reachability' GET "$FRONTEND_URL" '200 301 302 307 308' ''
  run_http_check 'API health endpoint' GET "${API_URL%/}/health" '200' '"status"[[:space:]]*:[[:space:]]*"healthy"'
  run_http_check 'API liveness endpoint' GET "${API_URL%/}/health/liveness" '200' '"status"[[:space:]]*:[[:space:]]*"alive"'
  run_http_check 'API readiness endpoint' GET "${API_URL%/}/health/readiness" '200' '"status"[[:space:]]*:[[:space:]]*"ready"'
  
  # Domain Hub Probes
  run_http_check 'Matching Hub Probe' GET "${API_URL%/}/matches" '200' ''
  run_http_check 'Economy Hub Probe' GET "${API_URL%/}/wallet" '200' ''
  run_http_check 'Connections Hub Probe' GET "${API_URL%/}/notifications" '200' ''
  run_http_check 'Operations Hub Probe' GET "${API_URL%/}/safety/contacts" '200' ''
  run_http_check 'Support Hub Probe' GET "${API_URL%/}/health" '200' ''
  
  run_http_check 'Invalid-login contract check' POST "${API_URL%/}/auth/login" '422' 'Invalid credentials' "$LOGIN_PAYLOAD"
  run_http_check 'Public roast preview check' POST "${API_URL%/}/public/roast" '200' '"is_preview"[[:space:]]*:[[:space:]]*true' "$ROAST_PAYLOAD"
  run_http_check 'Geo nearby endpoint' GET "$GEO_QUERY_URL" '200' '"users"'
  check_websocket_upgrade
  run_optional_authenticated_checks
  resolve_dns_targets
  build_diagnostics

  echo
  info "Smoke-check summary: passes=$pass_count warnings=$warn_count failures=$fail_count"
  write_reports

  if [[ "$fail_count" -gt 0 ]]; then
    exit 1
  fi
}

main "$@"
