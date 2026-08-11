// SPDX-License-Identifier: MIT
// Minimal JNS storage fixture for the frozen V0.2 request envelope.
#include <minijam/minijam.h>
#include <stddef.h>
#include <stdint.h>
#include <stdint.h>

static uint8_t request[4096];
static size_t jam_strlen(const char *value) { size_t size = 0; while (value[size]) size++; return size; }
static void jam_memcpy(void *destination, const void *source, size_t size) { uint8_t *out = destination; const uint8_t *in = source; for (size_t i = 0; i < size; i++) out[i] = in[i]; }
static int jam_strcmp(const char *left, const char *right) { size_t i = 0; while (left[i] && left[i] == right[i]) i++; return (unsigned char)left[i] - (unsigned char)right[i]; }
static const char *jam_strstr(const char *haystack, const char *needle) { size_t needle_size = jam_strlen(needle); for (size_t i = 0; haystack[i]; i++) { size_t j = 0; while (j < needle_size && haystack[i + j] == needle[j]) j++; if (j == needle_size) return haystack + i; } return 0; }
#define strlen jam_strlen
#define memcpy jam_memcpy
#define strcmp jam_strcmp
#define strstr jam_strstr
static size_t append_text(char *output, size_t offset, size_t capacity, const char *value) { size_t size = strlen(value); if (offset + size >= capacity) return capacity; memcpy(output + offset, value, size); return offset + size; }
static size_t string_value(const uint8_t *json, size_t size, const char *name, char *output, size_t capacity) {
  char needle[64]; size_t name_size = strlen(name); if (name_size + 3 >= sizeof(needle)) return 0;
  needle[0] = '"'; memcpy(needle + 1, name, name_size); needle[name_size + 1] = '"'; needle[name_size + 2] = 0;
  const uint8_t *cursor = (const uint8_t *)strstr((const char *)json, needle); if (!cursor) return 0; cursor += name_size + 2;
  while ((size_t)(cursor - json) < size && (*cursor == ':' || *cursor == ' ' || *cursor == '\t')) cursor++; if ((size_t)(cursor - json) >= size || *cursor++ != '"') return 0;
  size_t written = 0; while ((size_t)(cursor - json) < size && *cursor != '"') { if (written + 1 >= capacity) return 0; output[written++] = (char)*cursor++; } if ((size_t)(cursor - json) >= size) return 0; output[written] = 0; return written;
}
MINIJAM_REFINE { size_t size = 0; if (minijam_payload(request, sizeof(request) - 1, &size) != MINIJAM_OK || size >= sizeof(request)) return minijam_refine_error(1); request[size] = 0; return minijam_refine_ok(request, size); }
MINIJAM_ACCUMULATE { size_t size = 0; char op[32], name[64], owner[80], service[80], key[128], record[320], existing[320], existing_owner[80]; if (minijam_result(0, request, sizeof(request) - 1, &size) != MINIJAM_OK || size >= sizeof(request)) return; request[size] = 0; if (!string_value(request, size, "op", op, sizeof(op)) || !string_value(request, size, "name", name, sizeof(name))) return; if (strcmp(op, "jns:claim") && strcmp(op, "jns:bind")) return; if (!string_value(request, size, "owner", owner, sizeof(owner)) || !string_value(request, size, "serviceId", service, sizeof(service))) return; size_t key_size = append_text(key, 0, sizeof(key), "jns:"); key_size = append_text(key, key_size, sizeof(key), name); if (key_size >= sizeof(key)) return; size_t existing_size = 0; if (minijam_storage_read(key, key_size, existing, sizeof(existing) - 1, &existing_size) == MINIJAM_OK) { existing[existing_size] = 0; if (!strcmp(op, "jns:claim")) return; if (!string_value((const uint8_t *)existing, existing_size, "owner", existing_owner, sizeof(existing_owner)) || strcmp(existing_owner, owner)) return; } size_t record_size = 0; record_size = append_text(record, record_size, sizeof(record), "{\"version\":1,\"name\":\""); record_size = append_text(record, record_size, sizeof(record), name); record_size = append_text(record, record_size, sizeof(record), "\",\"owner\":\""); record_size = append_text(record, record_size, sizeof(record), owner); record_size = append_text(record, record_size, sizeof(record), "\",\"serviceId\":\""); record_size = append_text(record, record_size, sizeof(record), service); record_size = append_text(record, record_size, sizeof(record), "\"}"); if (record_size >= sizeof(record)) return; (void)minijam_storage_write(key, key_size, record, record_size); minijam_yield(0, 0); }
