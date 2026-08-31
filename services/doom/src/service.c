// SPDX-License-Identifier: MIT
// Deterministic DOOM Service protocol fixture for MiniJAM Work.
#include <minijam/crypto.h>
#include <minijam/minijam.h>
#include <stdint.h>
#include <stddef.h>

#define REQUEST_MAX (32u * 1024u)
#define VALUE_MAX (8u * 1024u)
#define KEY_MAX 512u

static uint8_t request[REQUEST_MAX];
static uint8_t value[VALUE_MAX];

static size_t jam_strlen(const char *text) { size_t size = 0; while (text[size]) size++; return size; }
static void jam_memcpy(void *destination, const void *source, size_t size) { uint8_t *out = destination; const uint8_t *in = source; for (size_t i = 0; i < size; i++) out[i] = in[i]; }
static int jam_strcmp(const char *left, const char *right) { size_t i = 0; while (left[i] && left[i] == right[i]) i++; return (unsigned char)left[i] - (unsigned char)right[i]; }
static const char *jam_strstr(const char *haystack, const char *needle) { size_t needle_size = jam_strlen(needle); if (!needle_size) return haystack; for (size_t i = 0; haystack[i]; i++) { size_t j = 0; while (j < needle_size && haystack[i + j] == needle[j]) j++; if (j == needle_size) return haystack + i; } return 0; }
#define strlen jam_strlen
#define memcpy jam_memcpy
#define strcmp jam_strcmp
#define strstr jam_strstr

static size_t string_value(const uint8_t *json, size_t size, const char *name, char *output, size_t capacity) {
  char needle[64]; size_t name_size = strlen(name); if (name_size + 3 >= sizeof(needle)) return 0;
  needle[0] = '"'; memcpy(needle + 1, name, name_size); needle[name_size + 1] = '"'; needle[name_size + 2] = 0;
  const uint8_t *cursor = (const uint8_t *)strstr((const char *)json, needle); if (!cursor) return 0; cursor += name_size + 2;
  while ((size_t)(cursor - json) < size && (*cursor == ':' || *cursor == ' ' || *cursor == '\t')) cursor++;
  if ((size_t)(cursor - json) >= size || *cursor++ != '"') return 0;
  size_t written = 0; while ((size_t)(cursor - json) < size && *cursor != '"') { if (*cursor == '\\' && (size_t)(cursor - json + 1) < size) cursor++; if (written + 1 >= capacity) return 0; output[written++] = (char)*cursor++; }
  if ((size_t)(cursor - json) >= size) return 0; output[written] = 0; return written;
}

static uint32_t number_value(const uint8_t *json, size_t size, const char *name, uint32_t fallback) {
  char needle[64]; size_t name_size = strlen(name); if (name_size + 3 >= sizeof(needle)) return fallback; needle[0] = '"'; memcpy(needle + 1, name, name_size); needle[name_size + 1] = '"'; needle[name_size + 2] = 0;
  const uint8_t *cursor = (const uint8_t *)strstr((const char *)json, needle); if (!cursor) return fallback; cursor += name_size + 2; while ((size_t)(cursor - json) < size && (*cursor == ':' || *cursor == ' ' || *cursor == '\t')) cursor++;
  uint32_t result = 0; int found = 0; while ((size_t)(cursor - json) < size && *cursor >= '0' && *cursor <= '9') { result = result * 10u + (uint32_t)(*cursor - '0'); cursor++; found = 1; } return found ? result : fallback;
}

static size_t append_text(char *output, size_t offset, size_t capacity, const char *text) { size_t size = strlen(text); if (offset + size + 1 >= capacity) return capacity; memcpy(output + offset, text, size); output[offset + size] = 0; return offset + size; }
static size_t append_u32(char *output, size_t offset, size_t capacity, uint32_t number) { char digits[11]; size_t count = 0; do { digits[count++] = (char)('0' + number % 10); number /= 10; } while (number && count < sizeof(digits)); if (offset + count + 1 >= capacity) return capacity; while (count) output[offset++] = digits[--count]; output[offset] = 0; return offset; }
static void hex32(const uint8_t bytes[32], char output[65]) { static const char digits[] = "0123456789abcdef"; for (size_t i = 0; i < 32; i++) { output[i * 2] = digits[bytes[i] >> 4]; output[i * 2 + 1] = digits[bytes[i] & 15]; } output[64] = 0; }
static size_t key_for(char *output, const char *session, const char *suffix) { size_t a = strlen("doom:session:"), b = strlen(session), c = strlen(suffix); if (a + b + c >= KEY_MAX) return 0; memcpy(output, "doom:session:", a); memcpy(output + a, session, b); memcpy(output + a + b, suffix, c); output[a + b + c] = 0; return a + b + c; }
static void store(const char *key, const char *text) { (void)minijam_storage_write(key, strlen(key), text, strlen(text)); }

/* The Stage 0 ingress relayer verifies the wallet-signed Work request before
 * building the canonical package. The account is therefore part of the
 * authenticated payload, and a session is permanently bound to that account.
 * A future direct-ingress protocol must validate this principal on-chain. */
static int session_owner_matches(const char *session, const char *account) {
  char key[KEY_MAX], meta[512], owner[160]; size_t meta_size = 0;
  if (!key_for(key, session, ":meta") || minijam_storage_read(key, strlen(key), meta, sizeof(meta) - 1, &meta_size) != MINIJAM_OK) return 0;
  meta[meta_size] = 0;
  return string_value((const uint8_t *)meta, meta_size, "account", owner, sizeof(owner)) && strcmp(owner, account) == 0;
}

static void state_hash(const char *session, uint32_t tick, uint32_t health, uint32_t ammo, uint32_t kills, uint32_t score, int completed, char output[65]) {
  char canonical[512]; size_t offset = 0; offset = append_text(canonical, offset, sizeof(canonical), "{\"ammo\":"); offset = append_u32(canonical, offset, sizeof(canonical), ammo); offset = append_text(canonical, offset, sizeof(canonical), ",\"completed\":"); offset = append_text(canonical, offset, sizeof(canonical), completed ? "true" : "false"); offset = append_text(canonical, offset, sizeof(canonical), ",\"health\":"); offset = append_u32(canonical, offset, sizeof(canonical), health); offset = append_text(canonical, offset, sizeof(canonical), ",\"kills\":"); offset = append_u32(canonical, offset, sizeof(canonical), kills); offset = append_text(canonical, offset, sizeof(canonical), ",\"score\":"); offset = append_u32(canonical, offset, sizeof(canonical), score); offset = append_text(canonical, offset, sizeof(canonical), ",\"sessionId\":\""); offset = append_text(canonical, offset, sizeof(canonical), session); offset = append_text(canonical, offset, sizeof(canonical), "\",\"tick\":"); offset = append_u32(canonical, offset, sizeof(canonical), tick); offset = append_text(canonical, offset, sizeof(canonical), "}"); uint8_t hash[32]; minijam_blake2b_256(canonical, offset, hash); hex32(hash, output);
}

static int load_state(const char *session, uint32_t *tick, uint32_t *health, uint32_t *ammo, uint32_t *kills, uint32_t *score, int *completed) {
  char key[KEY_MAX]; size_t size = 0; if (!key_for(key, session, ":state") || minijam_storage_read(key, strlen(key), value, sizeof(value) - 1, &size) != MINIJAM_OK || size >= sizeof(value)) return 0; value[size] = 0; *tick = number_value(value, size, "tick", 0); *health = number_value(value, size, "health", 100); *ammo = number_value(value, size, "ammo", 50); *kills = number_value(value, size, "kills", 0); *score = number_value(value, size, "score", 0); *completed = strstr((const char *)value, "\"completed\":true") != 0; return 1;
}

static void save_state(const char *session, uint32_t tick, uint32_t health, uint32_t ammo, uint32_t kills, uint32_t score, int completed) {
  char key[KEY_MAX], hash[65], state[1024]; state_hash(session, tick, health, ammo, kills, score, completed, hash); size_t offset = 0; offset = append_text(state, offset, sizeof(state), "{\"sessionId\":\""); offset = append_text(state, offset, sizeof(state), session); offset = append_text(state, offset, sizeof(state), "\",\"tick\":"); offset = append_u32(state, offset, sizeof(state), tick); offset = append_text(state, offset, sizeof(state), ",\"stateHash\":\"0x"); offset = append_text(state, offset, sizeof(state), hash); offset = append_text(state, offset, sizeof(state), "\",\"health\":"); offset = append_u32(state, offset, sizeof(state), health); offset = append_text(state, offset, sizeof(state), ",\"ammo\":"); offset = append_u32(state, offset, sizeof(state), ammo); offset = append_text(state, offset, sizeof(state), ",\"kills\":"); offset = append_u32(state, offset, sizeof(state), kills); offset = append_text(state, offset, sizeof(state), ",\"score\":"); offset = append_u32(state, offset, sizeof(state), score); offset = append_text(state, offset, sizeof(state), ",\"completed\":"); offset = append_text(state, offset, sizeof(state), completed ? "true" : "false"); offset = append_text(state, offset, sizeof(state), "}"); if (offset >= sizeof(state)) return; key_for(key, session, ":state"); store(key, state);
}

static void dispatch(const uint8_t *payload, size_t payload_size) {
  char op[32], session[160], account[160], key[KEY_MAX], map[64], difficulty[64]; if (number_value(payload, payload_size, "version", 0) != 1 || !string_value(payload, payload_size, "op", op, sizeof(op)) || !string_value(payload, payload_size, "sessionId", session, sizeof(session)) || !string_value(payload, payload_size, "account", account, sizeof(account))) return;
  if (strcmp(op, "create_session") == 0) { uint32_t existing_tick = 0, existing_health = 0, existing_ammo = 0, existing_kills = 0, existing_score = 0; int existing_completed = 0; if (load_state(session, &existing_tick, &existing_health, &existing_ammo, &existing_kills, &existing_score, &existing_completed)) return; uint32_t tick = 0, health = 100, ammo = 50, kills = 0, score = 0; int completed = 0; save_state(session, tick, health, ammo, kills, score, completed); if (string_value(payload, payload_size, "map", map, sizeof(map)) && string_value(payload, payload_size, "difficulty", difficulty, sizeof(difficulty))) { char meta[512], runtime[96]; if (!string_value(payload, payload_size, "runtimeVersion", runtime, sizeof(runtime))) runtime[0] = 0; size_t offset = 0; offset = append_text(meta, offset, sizeof(meta), "{\"account\":\""); offset = append_text(meta, offset, sizeof(meta), account); offset = append_text(meta, offset, sizeof(meta), "\",\"map\":\""); offset = append_text(meta, offset, sizeof(meta), map); offset = append_text(meta, offset, sizeof(meta), "\",\"difficulty\":\""); offset = append_text(meta, offset, sizeof(meta), difficulty); offset = append_text(meta, offset, sizeof(meta), "\",\"rulesetVersion\":"); offset = append_u32(meta, offset, sizeof(meta), number_value(payload, payload_size, "rulesetVersion", 1)); offset = append_text(meta, offset, sizeof(meta), ",\"runtimeVersion\":\""); offset = append_text(meta, offset, sizeof(meta), runtime); offset = append_text(meta, offset, sizeof(meta), "\"}"); key_for(key, session, ":meta"); store(key, meta); } return; }
  if (!session_owner_matches(session, account)) return;
  uint32_t tick = 0, health = 100, ammo = 50, kills = 0, score = 0; int completed = 0; if (!load_state(session, &tick, &health, &ammo, &kills, &score, &completed)) return;
  if (strcmp(op, "input") == 0) { key_for(key, session, ":inputs"); (void)minijam_storage_write(key, strlen(key), payload, payload_size); return; }
  if (strcmp(op, "execute") == 0) { uint32_t ticks = number_value(payload, payload_size, "ticks", 0); size_t input_size = 0; key_for(key, session, ":inputs"); int has_input = minijam_storage_read(key, strlen(key), value, sizeof(value) - 1, &input_size) == MINIJAM_OK; if (has_input) value[input_size] = 0; for (uint32_t i = 0; i < ticks; i++) { tick++; if (has_input && strstr((const char *)value, "forward")) score++; if (has_input && strstr((const char *)value, "backward") && health > 0) health--; if (has_input && strstr((const char *)value, "fire") && ammo > 0) { ammo--; kills++; score += 1000; } if (has_input && strstr((const char *)value, "use")) health = health < 100 ? health + 1 : health; } (void)minijam_storage_delete(key, strlen(key)); save_state(session, tick, health, ammo, kills, score, completed); return; }
  if (strcmp(op, "finish") == 0) { completed = 1; save_state(session, tick, health, ammo, kills, score, completed); char meta[512], result[1024], runtime[96], text[96], final_hash[65]; size_t meta_size = 0; key_for(key, session, ":meta"); if (minijam_storage_read(key, strlen(key), meta, sizeof(meta) - 1, &meta_size) != MINIJAM_OK) meta_size = 0; meta[meta_size] = 0; state_hash(session, tick, health, ammo, kills, score, completed, final_hash); if (!string_value((const uint8_t *)meta, meta_size, "runtimeVersion", runtime, sizeof(runtime))) runtime[0] = 0; if (!string_value((const uint8_t *)meta, meta_size, "map", text, sizeof(text))) text[0] = 0; size_t offset = 0; offset = append_text(result, offset, sizeof(result), "{\"sessionId\":\""); offset = append_text(result, offset, sizeof(result), session); offset = append_text(result, offset, sizeof(result), "\",\"account\":\""); offset = append_text(result, offset, sizeof(result), account); offset = append_text(result, offset, sizeof(result), "\",\"score\":"); offset = append_u32(result, offset, sizeof(result), score); offset = append_text(result, offset, sizeof(result), ",\"kills\":"); offset = append_u32(result, offset, sizeof(result), kills); offset = append_text(result, offset, sizeof(result), ",\"durationTicks\":"); offset = append_u32(result, offset, sizeof(result), tick); offset = append_text(result, offset, sizeof(result), ",\"completed\":true,\"finalStateHash\":\"0x"); offset = append_text(result, offset, sizeof(result), final_hash); offset = append_text(result, offset, sizeof(result), "\",\"runtimeVersion\":\""); offset = append_text(result, offset, sizeof(result), runtime); offset = append_text(result, offset, sizeof(result), "\",\"rulesetVersion\":"); offset = append_u32(result, offset, sizeof(result), number_value((const uint8_t *)meta, meta_size, "rulesetVersion", 1)); offset = append_text(result, offset, sizeof(result), ",\"map\":\""); offset = append_text(result, offset, sizeof(result), text); offset = append_text(result, offset, sizeof(result), "\",\"difficulty\":\""); if (!string_value((const uint8_t *)meta, meta_size, "difficulty", text, sizeof(text))) text[0] = 0; offset = append_text(result, offset, sizeof(result), text); offset = append_text(result, offset, sizeof(result), "\"}"); key_for(key, session, ":result"); if (offset < sizeof(result)) { store(key, result); size_t prefix = strlen("doom:best:"), account_size = strlen(account), best_size = 0; if (prefix + account_size < sizeof(key)) { memcpy(key, "doom:best:", prefix); memcpy(key + prefix, account, account_size); key[prefix + account_size] = 0; uint32_t previous_best = 0; if (minijam_storage_read(key, strlen(key), value, sizeof(value) - 1, &best_size) == MINIJAM_OK) { value[best_size] = 0; previous_best = number_value(value, best_size, "score", 0); } if (score > previous_best || best_size == 0) store(key, result); } } }
}

MINIJAM_REFINE { size_t size = 0; if (minijam_payload(request, sizeof(request) - 1, &size) != MINIJAM_OK || size >= sizeof(request)) return minijam_refine_error(1); request[size] = 0; return minijam_refine_ok(request, size); }
MINIJAM_ACCUMULATE { size_t size = 0; if (minijam_result(0, request, sizeof(request), &size) != MINIJAM_OK || size >= sizeof(request)) return; request[size] = 0; dispatch(request, size); minijam_yield(0, 0); }
