// SPDX-License-Identifier: MIT
//
// Minimal Computer Service protocol fixture. Build this file with the pinned
// MiniJAM SDK (see services/computer/README.md). The frontend never embeds a
// local filesystem; it reads the storage namespaces written here.
#include <minijam/crypto.h>
#include <minijam/minijam.h>
#include <stdint.h>
#include <stddef.h>

#define REQUEST_MAX (128u * 1024u)
#define FILE_MAX (128u * 1024u)
#define KEY_MAX 768u
#define NODE_MAX 2048u

static uint8_t request[REQUEST_MAX];
static uint8_t file_buffer[FILE_MAX];
static const uint8_t protocol_key[] = "meta:protocol";

static size_t jam_strlen(const char *value) { size_t size = 0; while (value[size]) size++; return size; }
static void jam_memcpy(void *destination, const void *source, size_t size) { uint8_t *out = destination; const uint8_t *in = source; for (size_t i = 0; i < size; i++) out[i] = in[i]; }
static int jam_strcmp(const char *left, const char *right) { size_t i = 0; while (left[i] && left[i] == right[i]) i++; return (unsigned char)left[i] - (unsigned char)right[i]; }
static const char *jam_strstr(const char *haystack, const char *needle) { size_t needle_size = jam_strlen(needle); if (!needle_size) return haystack; for (size_t i = 0; haystack[i]; i++) { size_t j = 0; while (j < needle_size && haystack[i + j] == needle[j]) j++; if (j == needle_size) return haystack + i; } return 0; }
static const char *jam_strchr(const char *value, int character) { while (*value && *value != character) value++; return *value ? value : 0; }
#define strlen jam_strlen
#define memcpy jam_memcpy
#define strcmp jam_strcmp
#define strstr jam_strstr
#define strchr jam_strchr

static void copy_bytes(void *destination, const void *source, size_t size) {
  memcpy(destination, source, size);
}

static size_t string_value(const uint8_t *json, size_t size, const char *name,
                           char *output, size_t capacity) {
  char needle[64];
  size_t name_size = strlen(name);
  if (name_size + 3 >= sizeof(needle)) return 0;
  needle[0] = '"';
  copy_bytes(needle + 1, name, name_size);
  needle[name_size + 1] = '"';
  needle[name_size + 2] = 0;
  const uint8_t *cursor = (const uint8_t *)strstr((const char *)json, needle);
  if (!cursor) return 0;
  cursor += name_size + 2;
  while ((size_t)(cursor - json) < size && (*cursor == ':' || *cursor == ' ' || *cursor == '\t')) cursor++;
  if ((size_t)(cursor - json) >= size || *cursor++ != '"') return 0;
  size_t written = 0;
  while ((size_t)(cursor - json) < size && *cursor != '"') {
    if (*cursor == '\\' && (size_t)(cursor - json + 1) < size) cursor++;
    if (written + 1 >= capacity) return 0;
    output[written++] = (char)*cursor++;
  }
  if ((size_t)(cursor - json) >= size) return 0;
  output[written] = 0;
  return written;
}

static size_t base64_decode(const char *input, uint8_t *output, size_t capacity) {
  static const char alphabet[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  size_t length = strlen(input), written = 0;
  uint32_t value = 0;
  unsigned bits = 0;
  for (size_t i = 0; i < length; i++) {
    if (input[i] == '=') break;
    const char *found = strchr(alphabet, input[i]);
    if (!found) return 0;
    value = (value << 6) | (uint32_t)(found - alphabet);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      if (written >= capacity) return 0;
      output[written++] = (uint8_t)(value >> bits);
      value &= (1u << bits) - 1u;
    }
  }
  return written;
}

static void hex32(const uint8_t value[32], char output[65]) {
  static const char digits[] = "0123456789abcdef";
  for (size_t i = 0; i < 32; i++) { output[i * 2] = digits[value[i] >> 4]; output[i * 2 + 1] = digits[value[i] & 15]; }
  output[64] = 0;
}

static size_t key_for(char *output, const char *prefix, const char *path) {
  size_t prefix_size = strlen(prefix), path_size = strlen(path);
  if (prefix_size + path_size >= KEY_MAX) return 0;
  memcpy(output, prefix, prefix_size);
  memcpy(output + prefix_size, path, path_size);
  output[prefix_size + path_size] = 0;
  return prefix_size + path_size;
}

static void store_text(const char *key, const char *value) {
  (void)minijam_storage_write(key, strlen(key), value, strlen(value));
}

static size_t append_text(char *output, size_t offset, size_t capacity, const char *value) { size_t size = strlen(value); if (offset + size + 1 >= capacity) return capacity; memcpy(output + offset, value, size); output[offset + size] = 0; return offset + size; }
static size_t append_u32(char *output, size_t offset, size_t capacity, uint32_t value) { char digits[11]; size_t count = 0; do { digits[count++] = (char)('0' + value % 10); value /= 10; } while (value && count < sizeof(digits)); if (offset + count + 1 >= capacity) return capacity; while (count) output[offset++] = digits[--count]; output[offset] = 0; return offset; }
static size_t replace_once(char *output, size_t capacity, const char *input, const char *from, const char *to) { const char *match = strstr(input, from); if (!match) return 0; size_t before = (size_t)(match - input), from_size = strlen(from), to_size = strlen(to), input_size = strlen(input); if (before + to_size + input_size - before - from_size + 1 >= capacity) return 0; memcpy(output, input, before); memcpy(output + before, to, to_size); memcpy(output + before + to_size, match + from_size, input_size - before - from_size); output[before + to_size + input_size - before - from_size] = 0; return strlen(output); }

static size_t parent_path(const char *path, char *output, size_t capacity) { size_t size = strlen(path), slash = 0; for (size_t i = 0; i < size; i++) if (path[i] == '/') slash = i; if (!slash) { if (capacity < 2) return 0; output[0] = '/'; output[1] = 0; return 1; } if (slash >= capacity) return 0; memcpy(output, path, slash); output[slash] = 0; return slash; }
static size_t base_name(const char *path, char *output, size_t capacity) { size_t size = strlen(path), slash = 0; for (size_t i = 0; i < size; i++) if (path[i] == '/') slash = i; if (size - slash >= capacity) return 0; memcpy(output, path + slash + (slash < size), size - slash - (slash < size)); output[size - slash - (slash < size)] = 0; return size - slash - (slash < size); }

static void add_child(const char *parent, const char *child) {
  char key[KEY_MAX], node[NODE_MAX], updated[NODE_MAX]; size_t key_size = key_for(key, "fs:dir:", parent), node_size = 0;
  if (!key_size || minijam_storage_read(key, key_size, node, sizeof(node) - 1, &node_size) != MINIJAM_OK || node_size >= sizeof(node)) return;
  node[node_size] = 0; char quoted[160]; size_t quoted_size = append_text(quoted, 0, sizeof(quoted), "\""); quoted_size = append_text(quoted, quoted_size, sizeof(quoted), child); quoted_size = append_text(quoted, quoted_size, sizeof(quoted), "\""); if (strstr((const char *)node, quoted)) return;
  const char *closing = strstr((const char *)node, "]"); if (!closing) return; size_t before = (size_t)(closing - (const char *)node); size_t offset = 0; memcpy(updated, node, before); offset = before; if (before && node[before - 1] != '[') offset = append_text(updated, offset, sizeof(updated), ","); offset = append_text(updated, offset, sizeof(updated), quoted); offset = append_text(updated, offset, sizeof(updated), closing); if (offset < sizeof(updated)) (void)minijam_storage_write(key, key_size, updated, offset);
}

static void ensure_directory(const char *path) {
  char key[KEY_MAX], node[NODE_MAX];
  size_t key_size = key_for(key, "fs:dir:", path);
  if (!key_size) return;
  size_t current_size = 0;
  if (minijam_storage_read(key, key_size, node, sizeof(node), &current_size) == MINIJAM_OK) return;
  size_t offset = 0;
  offset = append_text(node, offset, sizeof(node), "{\"version\":1,\"type\":\"directory\",\"path\":\"");
  offset = append_text(node, offset, sizeof(node), path);
  offset = append_text(node, offset, sizeof(node), "\",\"children\":[]}");
  if (offset >= sizeof(node)) return;
  store_text(key, (const char *)node);
  key_size = key_for(key, "fs:node:", path);
  store_text(key, (const char *)node);
  if (strcmp(path, "/") != 0) { char parent[KEY_MAX], child[160]; if (parent_path(path, parent, sizeof(parent)) && base_name(path, child, sizeof(child))) add_child(parent, child); }
}

static void write_file(const char *path, const uint8_t *content, size_t size, const char *mime) {
  uint8_t hash[32]; char hash_text[65], key[KEY_MAX], node[NODE_MAX];
  minijam_blake2b_256(content, size, hash); hex32(hash, hash_text);
  key_for(key, "fs:blob:", hash_text); (void)minijam_storage_write(key, strlen(key), content, size);
  char parent[KEY_MAX]; if (parent_path(path, parent, sizeof(parent))) ensure_directory(parent);
  size_t offset = 0;
  offset = append_text((char *)node, offset, sizeof(node), "{\"version\":1,\"type\":\"file\",\"path\":\"");
  offset = append_text((char *)node, offset, sizeof(node), path);
  offset = append_text((char *)node, offset, sizeof(node), "\",\"size\":");
  offset = append_u32((char *)node, offset, sizeof(node), (uint32_t)size);
  offset = append_text((char *)node, offset, sizeof(node), ",\"contentHash\":\"");
  offset = append_text((char *)node, offset, sizeof(node), hash_text);
  offset = append_text((char *)node, offset, sizeof(node), "\",\"chunkSize\":131072,\"chunks\":1,\"mime\":\"");
  offset = append_text((char *)node, offset, sizeof(node), mime);
  offset = append_text((char *)node, offset, sizeof(node), "\"}");
  if (offset >= sizeof(node)) return;
  key_for(key, "fs:node:", path); store_text(key, (const char *)node);
}

static void initialize(void) {
  uint8_t marker = 1; size_t size = 0;
  if (minijam_storage_read(protocol_key, sizeof(protocol_key) - 1, &marker, sizeof(marker), &size) == MINIJAM_OK) return;
  (void)minijam_storage_write(protocol_key, sizeof(protocol_key) - 1, &marker, sizeof(marker));
  static const char home[] = "<!doctype html><html><head><title>My JAM Computer</title></head><body><h1>Hello JAM.</h1><p>This page lives on my JAM Computer.</p></body></html>";
  ensure_directory("/"); ensure_directory("/home"); ensure_directory("/home/user"); ensure_directory("/home/user/Documents"); ensure_directory("/home/user/Projects"); ensure_directory("/home/user/Projects/counter"); ensure_directory("/home/user/Sites"); ensure_directory("/home/user/Sites/home");
  write_file("/home/user/Sites/home/index.html", (const uint8_t *)home, sizeof(home) - 1, "text/html");
}

static void dispatch(const uint8_t *payload, size_t payload_size) {
  char op[32], path[512], mime[96], encoded[REQUEST_MAX];
  if (payload_size >= REQUEST_MAX) return;
  ((uint8_t *)payload)[payload_size] = 0;
  initialize();
  if (!string_value(payload, payload_size, "op", op, sizeof(op))) return;
  if (strcmp(op, "computer:init") == 0) {
    initialize();
  } else if (strcmp(op, "fs:write") == 0) {
    if (!string_value(payload, payload_size, "path", path, sizeof(path)) || !string_value(payload, payload_size, "contentBase64", encoded, sizeof(encoded))) return;
    if (!string_value(payload, payload_size, "mime", mime, sizeof(mime))) { copy_bytes(mime, "application/octet-stream", 25); mime[24] = 0; }
    size_t size = base64_decode(encoded, file_buffer, sizeof(file_buffer)); write_file(path, file_buffer, size, mime);
  } else if (strcmp(op, "fs:mkdir") == 0) {
    if (string_value(payload, payload_size, "path", path, sizeof(path))) { char parent[KEY_MAX]; if (parent_path(path, parent, sizeof(parent))) ensure_directory(parent); ensure_directory(path); }
  } else if (strcmp(op, "fs:remove") == 0) {
    if (string_value(payload, payload_size, "path", path, sizeof(path))) { char node_key[KEY_MAX]; key_for(node_key, "fs:node:", path); (void)minijam_storage_delete(node_key, strlen(node_key)); char dir_key[KEY_MAX]; key_for(dir_key, "fs:dir:", path); (void)minijam_storage_delete(dir_key, strlen(dir_key)); }
  } else if (strcmp(op, "fs:rename") == 0) {
    char from[512], to[512], old_key[KEY_MAX], new_key[KEY_MAX], node[NODE_MAX], rewritten[NODE_MAX]; size_t node_size = 0;
    if (!string_value(payload, payload_size, "from", from, sizeof(from)) || !string_value(payload, payload_size, "to", to, sizeof(to))) return;
    key_for(old_key, "fs:node:", from); if (minijam_storage_read(old_key, strlen(old_key), node, sizeof(node) - 1, &node_size) != MINIJAM_OK || node_size >= sizeof(node)) return; node[node_size] = 0; char quoted_from[544], quoted_to[544]; size_t from_size = append_text(quoted_from, 0, sizeof(quoted_from), "\"path\":\""); from_size = append_text(quoted_from, from_size, sizeof(quoted_from), from); from_size = append_text(quoted_from, from_size, sizeof(quoted_from), "\""); size_t to_size = append_text(quoted_to, 0, sizeof(quoted_to), "\"path\":\""); to_size = append_text(quoted_to, to_size, sizeof(quoted_to), to); to_size = append_text(quoted_to, to_size, sizeof(quoted_to), "\""); if (!replace_once(rewritten, sizeof(rewritten), (const char *)node, quoted_from, quoted_to)) return; key_for(new_key, "fs:node:", to); store_text(new_key, rewritten); (void)minijam_storage_delete(old_key, strlen(old_key));
  } else if (strcmp(op, "site:publish") == 0) {
    char source[512], node_key[KEY_MAX], node[NODE_MAX], hash[65], mime[96], index_path[KEY_MAX], manifest[NODE_MAX]; size_t node_size = 0;
    if (!string_value(payload, payload_size, "path", source, sizeof(source))) return;
    size_t index_size = append_text(index_path, 0, sizeof(index_path), source); index_size = append_text(index_path, index_size, sizeof(index_path), "/index.html"); if (index_size >= sizeof(index_path)) return;
    key_for(node_key, "fs:node:", index_path); if (minijam_storage_read(node_key, strlen(node_key), node, sizeof(node) - 1, &node_size) != MINIJAM_OK || node_size >= sizeof(node)) return; node[node_size] = 0;
    if (!string_value((const uint8_t *)node, node_size, "contentHash", hash, sizeof(hash))) return; if (!string_value((const uint8_t *)node, node_size, "mime", mime, sizeof(mime))) copy_bytes(mime, "text/html", 10);
    size_t manifest_size = 0; manifest_size = append_text(manifest, manifest_size, sizeof(manifest), "{\"version\":1,\"root\":\""); manifest_size = append_text(manifest, manifest_size, sizeof(manifest), source); manifest_size = append_text(manifest, manifest_size, sizeof(manifest), "\",\"publishedAt\":0,\"index\":\"/index.html\",\"files\":{\"/index.html\":{\"mime\":\""); manifest_size = append_text(manifest, manifest_size, sizeof(manifest), mime); manifest_size = append_text(manifest, manifest_size, sizeof(manifest), "\",\"size\":0,\"contentHash\":\""); manifest_size = append_text(manifest, manifest_size, sizeof(manifest), hash); manifest_size = append_text(manifest, manifest_size, sizeof(manifest), "\",\"chunks\":1}}}"); if (manifest_size < sizeof(manifest)) store_text("site:manifest", manifest);
  }
}

MINIJAM_REFINE {
  size_t size = 0;
  if (minijam_payload(request, sizeof(request) - 1, &size) != MINIJAM_OK || size >= sizeof(request)) return minijam_refine_error(1);
  request[size] = 0;
  return minijam_refine_ok(request, size);
}

MINIJAM_ACCUMULATE {
  size_t size = 0;
  if (minijam_result(0, request, sizeof(request), &size) != MINIJAM_OK) return;
  dispatch(request, size);
  minijam_yield(0, 0);
}
